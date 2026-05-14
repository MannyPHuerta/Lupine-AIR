import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqText, fileUrl, issuingOrg: inputOrg, rfqId, companyInfo } = await req.json();

    if (!rfqText && !fileUrl) {
      return Response.json({ error: 'Must provide rfqText or fileUrl' }, { status: 400 });
    }
    if (!rfqId) {
      return Response.json({ error: 'rfqId is required' }, { status: 400 });
    }

    // Step 1: Extract text from file if needed
    let extractedText = rfqText || null;
    if (!extractedText && fileUrl) {
      console.log('Extracting text from file...');
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: 'object',
          properties: {
            full_text: { type: 'string', description: 'The complete text content of the document' }
          }
        }
      });
      if (extracted.status === 'success' && extracted.output?.full_text) {
        extractedText = extracted.output.full_text;
        console.log('Extracted', extractedText.length, 'chars');
      }
    }

    if (!extractedText) {
      return Response.json({ error: 'Could not extract text from file. Please paste the RFQ text directly.' }, { status: 400 });
    }

    const docText = extractedText.slice(0, 8000);
    const companyName = companyInfo?.name || 'AIR Equipment Rental';
    const companyAddress = companyInfo?.address || '';
    const companyPhone = companyInfo?.phone || '';
    const companyEmail = companyInfo?.email || '';
    const companyInsurance = companyInfo?.insuranceInfo || '';
    const issuingOrg = (!inputOrg || inputOrg.startsWith('Unknown')) ? '' : inputOrg;

    // Step 2: Fetch org history
    let historyContext = 'No previous history with this organization.';
    if (issuingOrg) {
      const orgHistory = await base44.asServiceRole.entities.RFQRecord.filter({ issuingOrg });
      const filtered = orgHistory.filter(r => r.id !== rfqId);
      if (filtered.length > 0) {
        historyContext = filtered.slice(0, 5).map(r =>
          `- RFQ ${r.rfqNumber || 'N/A'} | Status: ${r.status} | Value: $${r.estimatedTotalValue || 0}`
        ).join('\n');
      }
    }

    console.log('Running LLM analysis...');

    // Step 3: Call A — extract metadata (fast, gemini)
    console.log('Call A: extracting metadata...');
    const metaResult = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `Extract key metadata from this RFQ document. Return null for any field not found.

RFQ TEXT:
${docText}

Return JSON with: issuingOrg, rfqNumber, title, orgType (municipal|county|state|federal|private|nonprofit|other), dueDate (YYYY-MM-DD or null), dueTime, submissionMethod (email|mail|portal|hand_delivery|fax), submissionAddress, contactName, contactEmail, contactPhone, suggestedFileName (format: RFQYEAR-ORGABBREV_AIR-Response.pdf), estimatedTotalValue (total USD value of the bid as a number)`,
      response_json_schema: {
        type: 'object',
        properties: {
          issuingOrg: { type: 'string' },
          rfqNumber: { type: 'string' },
          title: { type: 'string' },
          orgType: { type: 'string' },
          dueDate: { type: 'string' },
          dueTime: { type: 'string' },
          submissionMethod: { type: 'string' },
          submissionAddress: { type: 'string' },
          contactName: { type: 'string' },
          contactEmail: { type: 'string' },
          contactPhone: { type: 'string' },
          suggestedFileName: { type: 'string' },
          estimatedTotalValue: { type: 'number' },
        }
      }
    });
    console.log('Call A done. Org:', metaResult.issuingOrg);

    // Step 4: Call B — analysis + compliance + line items (focused, no narrative)
    console.log('Call B: requirements, compliance, line items...');
    const structuredResult = await base44.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are a senior government procurement specialist. Analyze this RFQ for ${companyName}, an equipment rental company (tents, generators, tables, chairs, staging, event/construction equipment) in South Texas.

RFQ TEXT:
${docText}

Return JSON with exactly these fields:

aiAnalysisSummary: 3 paragraphs: (1) what is requested and event context, (2) key mandatory requirements and any risky clauses, (3) our competitive strategy and win approach.

orgHistorySummary: 1-2 paragraphs on past history or best practices for bidding to this org type.

suggestedResponseFormat: Bulleted outline of the response document sections.

extractedRequirements: Array of ALL explicit requirements found. Each item: { sectionNumber (string), sectionTitle (string), requirementText (string), requirementType (one of: equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other), isMandatory (boolean) }

complianceMatrix: One entry per extracted requirement. Each item: { sectionNumber (string), requirementSummary (string, max 20 words), complianceStatus (one of: compliant|compliant_with_exception|non_compliant|not_applicable|pending_review), responseText (string, 1-2 sentences stating how we comply), exceptionNote (string or null), documentReference (string or null, e.g. "Certificate of Insurance attached") }

proposedLineItems: All equipment/service line items the RFQ requires. Each item: { lineNumber (string), description (string, full spec), equipmentCategory (string), quantity (number), unit (string: each|day|week|month|event|lot), unitPrice (number, realistic South Texas market rate), totalPrice (number, quantity × unitPrice), specs (string, technical details), notes (string or null) }`,
      response_json_schema: {
        type: 'object',
        properties: {
          aiAnalysisSummary: { type: 'string' },
          orgHistorySummary: { type: 'string' },
          suggestedResponseFormat: { type: 'string' },
          extractedRequirements: { type: 'array', items: { type: 'object' } },
          complianceMatrix: { type: 'array', items: { type: 'object' } },
          proposedLineItems: { type: 'array', items: { type: 'object' } },
        }
      }
    });
    console.log('Call B done. Requirements:', structuredResult.extractedRequirements?.length, '| Line items:', structuredResult.proposedLineItems?.length);

    // Step 5: Call C — response narrative only, with line items for accurate pricing table
    console.log('Call C: drafting response narrative...');
    const lineItemsForPrompt = (structuredResult.proposedLineItems || [])
      .map(i => `| ${i.lineNumber} | ${i.description} | ${i.quantity} | ${i.unit} | $${i.unitPrice} | $${i.totalPrice} |`)
      .join('\n');
    const totalValue = (structuredResult.proposedLineItems || []).reduce((s, i) => s + (i.totalPrice || 0), 0);

    const narrativeResult = await base44.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `Write a complete, professional government bid response document in Markdown for ${companyName}.

Company: ${companyName}
Address: ${companyAddress}
Phone: ${companyPhone}
Email: ${companyEmail}
Insurance/Bonding: ${companyInsurance}

RFQ: ${metaResult.rfqNumber || 'See RFQ'} — ${metaResult.title || ''}
Issuing Org: ${metaResult.issuingOrg || issuingOrg}
Contact: ${metaResult.contactName || ''} | ${metaResult.contactEmail || ''}
Due: ${metaResult.dueDate || ''} ${metaResult.dueTime || ''}

RFQ SUMMARY:
${docText.slice(0, 3000)}

PRICING TABLE (use exactly these line items — do not invent new ones):
| Line | Description | Qty | Unit | Unit Price | Total |
|------|-------------|-----|------|------------|-------|
${lineItemsForPrompt}
| | **TOTAL** | | | | **$${totalValue.toLocaleString()}** |

Write the full response document with these sections:
1. Header with company name, date, RFQ reference, submitted to/by
2. Executive Summary (3 paragraphs, compelling, professional)
3. Company Overview (who we are, years in business, South Texas service territory, certifications)
4. Technical Approach & Equipment Specifications (address each major requirement specifically)
5. Delivery, Setup & Teardown Plan (logistics, timeline, crew, safety)
6. Pricing Schedule (reproduce the exact Markdown table above — do not modify it)
7. Insurance & Bonding Compliance
8. References (2-3 placeholder entries)
9. Certifications & Representations
10. Acceptance & Signature Block

Use formal government procurement language. Be specific and detailed. Minimum 1000 words.`,
      response_json_schema: {
        type: 'object',
        properties: {
          responseNarrative: { type: 'string' }
        }
      }
    });
    console.log('Call C done. Narrative length:', narrativeResult.responseNarrative?.length);

    const analysis = { ...metaResult, ...structuredResult, ...narrativeResult };
    console.log('All calls complete. Saving to record', rfqId);

    // Step 4: Save all results
    await base44.asServiceRole.entities.RFQRecord.update(rfqId, {
      ...(analysis.issuingOrg && { issuingOrg: analysis.issuingOrg }),
      ...(analysis.rfqNumber && { rfqNumber: analysis.rfqNumber }),
      ...(analysis.title && { title: analysis.title }),
      ...(analysis.orgType && { orgType: analysis.orgType }),
      ...(analysis.dueDate && { dueDate: analysis.dueDate }),
      ...(analysis.dueTime && { dueTime: analysis.dueTime }),
      ...(analysis.submissionMethod && { submissionMethod: analysis.submissionMethod }),
      ...(analysis.submissionAddress && { submissionAddress: analysis.submissionAddress }),
      ...(analysis.contactName && { contactName: analysis.contactName }),
      ...(analysis.contactEmail && { contactEmail: analysis.contactEmail }),
      ...(analysis.contactPhone && { contactPhone: analysis.contactPhone }),
      ...(analysis.suggestedFileName && { suggestedFileName: analysis.suggestedFileName }),
      estimatedTotalValue: totalValue || analysis.estimatedTotalValue || 0,
      aiAnalysisSummary: analysis.aiAnalysisSummary || '',
      orgHistorySummary: analysis.orgHistorySummary || '',
      suggestedResponseFormat: analysis.suggestedResponseFormat || '',
      extractedRequirements: analysis.extractedRequirements || [],
      complianceMatrix: analysis.complianceMatrix || [],
      proposedLineItems: analysis.proposedLineItems || [],
      responseNarrative: analysis.responseNarrative || '',
      status: 'draft',
    });

    console.log('Analysis saved successfully.');
    return Response.json({ success: true, status: 'draft' });

  } catch (error) {
    console.error('analyzeRFQ error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});