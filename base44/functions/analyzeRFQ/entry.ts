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
    const companyAddress = companyInfo?.address || '123 Industrial Dr, McAllen, TX 78501';
    const companyPhone = companyInfo?.phone || '(956) 555-0100';
    const companyEmail = companyInfo?.email || 'bids@airequipmentrental.com';
    const companyWebsite = companyInfo?.website || '';
    const companyLicense = companyInfo?.licenseNumber || '';
    const companyInsurance = companyInfo?.insuranceInfo || 'General Liability $1M/$2M, Auto Liability $1M, Workers Comp statutory limits';
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

    console.log('Running parallel LLM calls...');

    // Run metadata extraction (gemini) and full analysis (claude) in parallel
    const [metaResult, detailResult] = await Promise.all([

      // Call A: metadata only — fast gemini
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `Extract key metadata from this RFQ document. Return null for any field not found.

RFQ TEXT:
${docText}

Return JSON with: issuingOrg, rfqNumber, title, orgType (municipal|county|state|federal|private|nonprofit|other), dueDate (YYYY-MM-DD or null), dueTime, submissionMethod (email|mail|portal|hand_delivery|fax), submissionAddress, contactName, contactEmail, contactPhone, suggestedFileName (format: RFQYEAR-ORGABBREV_AIR-Response.pdf)`,
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
          }
        }
      }),

      // Call B: full analysis + compliance + line items + narrative — claude
      base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a senior government procurement specialist preparing a complete bid response for the following equipment rental company:

RESPONDING COMPANY:
Name: ${companyName}
Address: ${companyAddress}
Phone: ${companyPhone}
Email: ${companyEmail}
${companyWebsite ? `Website: ${companyWebsite}` : ''}
${companyLicense ? `License: ${companyLicense}` : ''}
Insurance/Bonding: ${companyInsurance}

Past history with issuing org: ${historyContext}

RFQ TEXT:
${docText}

Return JSON with ALL of these fields populated:

aiAnalysisSummary: 3 paragraphs: (1) what is requested and event context, (2) key mandatory requirements and any risky clauses, (3) our competitive strategy and win approach.

orgHistorySummary: 1-2 paragraphs on past bid history or best practices for this org type.

suggestedResponseFormat: Bulleted outline of the response document sections.

extractedRequirements: Array of ALL explicit requirements. Each: { sectionNumber, sectionTitle, requirementText, requirementType (equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other), isMandatory (boolean) }

complianceMatrix: One row per requirement. Each: { sectionNumber, requirementSummary (max 20 words), complianceStatus (compliant|compliant_with_exception|non_compliant|not_applicable|pending_review), responseText (1-2 sentences), exceptionNote (null if none), documentReference (null if none) }

proposedLineItems: All equipment/service items required. Each: { lineNumber, description, equipmentCategory, quantity (number), unit (each|day|week|month|event|lot), unitPrice (number, realistic South Texas rate), totalPrice (number = quantity × unitPrice), specs, notes }

responseNarrative: A complete, professional bid response document in Markdown. IMPORTANT: Use the actual company details above throughout — company name header, address, phone, email in the letterhead. Include these sections:
1. Letterhead (${companyName}, ${companyAddress}, ${companyPhone}, ${companyEmail})
2. Date and submission details
3. Executive Summary
4. Company Overview (use ${companyName} — describe as South Texas equipment rental company)
5. Technical Approach & Equipment Specifications
6. Delivery, Setup & Teardown Plan
7. Pricing Schedule (build a clean Markdown table from proposedLineItems with totals)
8. Insurance & Bonding (reference: ${companyInsurance})
9. References
10. Certifications & Signature Block (signed by ${companyName})
Write minimum 800 words in formal government procurement language.`,
        response_json_schema: {
          type: 'object',
          properties: {
            aiAnalysisSummary: { type: 'string' },
            orgHistorySummary: { type: 'string' },
            suggestedResponseFormat: { type: 'string' },
            extractedRequirements: { type: 'array', items: { type: 'object' } },
            complianceMatrix: { type: 'array', items: { type: 'object' } },
            proposedLineItems: { type: 'array', items: { type: 'object' } },
            responseNarrative: { type: 'string' },
          }
        }
      }),
    ]);

    console.log('Both calls done. Requirements:', detailResult.extractedRequirements?.length, '| Line items:', detailResult.proposedLineItems?.length);

    const totalValue = (detailResult.proposedLineItems || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
    const analysis = { ...metaResult, ...detailResult };

    // Save all results
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
      estimatedTotalValue: totalValue || 0,
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