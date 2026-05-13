import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqText, fileUrl, issuingOrg: inputOrg, rfqId, companyInfo } = await req.json();

    if (!rfqText && !fileUrl) {
      return Response.json({ error: 'Must provide rfqText or fileUrl' }, { status: 400 });
    }

    const issuingOrg = (!inputOrg || inputOrg.startsWith('Unknown')) ? null : inputOrg;

    // Fetch past RFQ history for this org
    let historyContext = 'No previous history.';
    if (issuingOrg) {
      let orgHistory = await base44.asServiceRole.entities.RFQRecord.filter({ issuingOrg });
      if (rfqId) orgHistory = orgHistory.filter(r => r.id !== rfqId);
      if (orgHistory.length > 0) {
        historyContext = orgHistory.slice(0, 5).map(r =>
          `- RFQ ${r.rfqNumber || 'N/A'} | Status: ${r.status} | Value: $${r.estimatedTotalValue || 0}`
        ).join('\n');
      }
    }

    // Extract text from uploaded file if needed
    let extractedText = rfqText || null;
    if (!extractedText && fileUrl) {
      console.log('Extracting text from uploaded file...');
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
        console.log('Extracted', extractedText.length, 'chars from file');
      }
    }

    if (!extractedText) {
      return Response.json({ error: 'Could not extract text from file. Please paste the RFQ text directly.' }, { status: 400 });
    }

    // Truncate text to keep calls fast
    const docText = extractedText.slice(0, 6000);

    const companyName = companyInfo?.name || 'AIR Equipment Rental';
    const companyAddress = companyInfo?.address || '';
    const companyPhone = companyInfo?.phone || '';
    const companyEmail = companyInfo?.email || '';
    const companyInsurance = companyInfo?.insuranceInfo || '';

    // Run two parallel LLM calls: one for metadata, one for arrays + narrative
    console.log('Running parallel LLM analysis...');
    const [metaResult, detailResult] = await Promise.all([
      // Call 1: fast metadata extraction
      base44.integrations.Core.InvokeLLM({
        prompt: `Extract key metadata from this RFQ document. Return null for any field not found.

RFQ TEXT:
${docText}

Return JSON with: issuingOrg, rfqNumber, title, orgType (municipal|county|state|federal|private|nonprofit|other), dueDate (YYYY-MM-DD), dueTime, submissionMethod (email|mail|portal|hand_delivery|fax), submissionAddress, contactName, contactEmail, contactPhone, suggestedFileName (format: "RFQ-YEAR-ORGABBREV-NUMBER_AIR-Response.pdf"), estimatedTotalValue (number in USD)`,
        model: 'gemini_3_flash',
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

      // Call 2: deeper analysis — requirements, compliance, line items, narrative
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a government procurement analyst for ${companyName}, an equipment rental company.
Company: ${companyName} | ${companyAddress} | ${companyPhone} | ${companyEmail}
Insurance: ${companyInsurance}

RFQ TEXT:
${docText}

Past history with this org: ${historyContext}

Analyze this RFQ and return JSON with:
- aiAnalysisSummary: 2-3 paragraph summary of key requirements, deadlines, and recommended approach
- orgHistorySummary: brief summary of org history or best practices if no history
- suggestedResponseFormat: recommended response document structure
- extractedRequirements: array of { sectionNumber, sectionTitle, requirementText, requirementType (equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other), isMandatory }
- complianceMatrix: array of { sectionNumber, requirementSummary, complianceStatus (compliant|compliant_with_exception|non_compliant|not_applicable|pending_review), responseText }
- proposedLineItems: array of { lineNumber, description, equipmentCategory, quantity, unit, unitPrice, totalPrice, specs }
- responseNarrative: professional cover letter / response narrative using formal procurement language, written on behalf of ${companyName}`,
        model: 'gemini_3_flash',
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
    console.log('RFQ analysis complete. Org:', analysis.issuingOrg, '| RFQ#:', analysis.rfqNumber);
    return Response.json({ success: true, analysis });

  } catch (error) {
    console.error('analyzeRFQ error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});