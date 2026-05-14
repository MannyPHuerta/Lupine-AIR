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

    // Step 3: Run two LLM calls in parallel (both fast with gemini_3_flash)
    const [metaResult, detailResult] = await Promise.all([

      // Call A: Extract metadata fields
      base44.integrations.Core.InvokeLLM({
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
      }),

      // Call B: Full analysis + response draft — claude handles complex nested arrays reliably
      base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a senior government procurement specialist. Analyze this RFQ and generate a complete bid response for ${companyName}, an equipment rental company (tents, generators, tables, chairs, staging, event/construction equipment) in South Texas.

Company: ${companyName} | ${companyAddress} | ${companyPhone} | ${companyEmail}
Insurance/Bonding: ${companyInsurance}
Past history with this org: ${historyContext}

RFQ TEXT:
${docText}

Return JSON with these fields:

aiAnalysisSummary: 3-4 paragraphs covering (1) what is requested, (2) key mandatory requirements and risky clauses, (3) our competitive strategy, (4) red flags or clarifications needed.

orgHistorySummary: Summary of bid history or best practices for this org type.

suggestedResponseFormat: Outline of the response document structure with section headings.

extractedRequirements: Array of all requirements, each as { sectionNumber, sectionTitle, requirementText, requirementType (equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other), isMandatory }.

complianceMatrix: One row per requirement as { sectionNumber, requirementSummary, complianceStatus (compliant|compliant_with_exception|non_compliant|not_applicable|pending_review), responseText, exceptionNote, documentReference }.

proposedLineItems: Equipment line items with realistic South Texas rental pricing as { lineNumber, description, equipmentCategory, quantity, unit, unitPrice, totalPrice, specs, notes }.

responseNarrative: Complete professional bid response in Markdown. Must include: company header, date, RFQ reference, Executive Summary, Company Overview, Technical Approach & Equipment Specs, Delivery & Setup Plan, Pricing Schedule (Markdown table), Insurance & Bonding, References, Certifications, Signature Block. Write in formal government procurement language, minimum 800 words.`,
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

    const analysis = { ...metaResult, ...detailResult };
    console.log('LLM done. Saving to record', rfqId);

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
      ...(analysis.estimatedTotalValue && { estimatedTotalValue: analysis.estimatedTotalValue }),
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