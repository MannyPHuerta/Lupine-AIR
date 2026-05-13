import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqText, fileUrl, issuingOrg: inputOrg, rfqId } = await req.json();

    if (!rfqText && !fileUrl) {
      return Response.json({ error: 'Must provide rfqText or fileUrl' }, { status: 400 });
    }

    const issuingOrg = (!inputOrg || inputOrg.startsWith('Unknown')) ? null : inputOrg;

    // Fetch past RFQ history for this org
    let orgHistory = [];
    if (issuingOrg) {
      orgHistory = await base44.asServiceRole.entities.RFQRecord.filter({ issuingOrg });
      if (rfqId) orgHistory = orgHistory.filter(r => r.id !== rfqId);
    }

    const historyContext = orgHistory.length > 0
      ? orgHistory.map(r =>
          `- RFQ: ${r.rfqNumber || 'N/A'} | Status: ${r.status} | Value: $${r.estimatedTotalValue || 0} | Outcome: ${r.outcome || 'N/A'}`
        ).join('\n')
      : 'No previous RFQ history found for this organization.';

    const docContext = rfqText
      ? `RFQ TEXT CONTENT:\n${rfqText}`
      : 'The RFQ document is attached as a file. Please read and analyze its full contents.';

    // --- CALL 1: Extract metadata + compliance matrix + line items ---
    const metadataPrompt = `You are a government procurement analyst. Analyze this RFQ document and extract structured data.

ISSUING ORGANIZATION (if known): ${issuingOrg || 'Extract from document'}
${docContext}

Return a JSON object with these fields:
{
  "issuingOrg": "full name of the issuing organization",
  "rfqNumber": "official RFQ/IFB/ITB number",
  "title": "official title of the RFQ",
  "orgType": "municipal|county|state|federal|private|nonprofit|other",
  "dueDate": "YYYY-MM-DD if found, else null",
  "dueTime": "time string if found, else null",
  "submissionMethod": "email|mail|portal|hand_delivery|fax",
  "submissionAddress": "address or URL if found",
  "contactName": "contact person name if found",
  "contactEmail": "contact email if found",
  "contactPhone": "contact phone if found",
  "suggestedFileName": "RFQ-[YEAR]-[ORG_ABBREV]-[NUMBER]_AIR-Response.pdf",
  "extractedRequirements": [
    {
      "sectionNumber": "e.g. 3.1",
      "sectionTitle": "section title",
      "requirementText": "verbatim or close paraphrase",
      "requirementType": "equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other",
      "isMandatory": true
    }
  ],
  "complianceMatrix": [
    {
      "sectionNumber": "e.g. 3.1",
      "requirementSummary": "brief summary",
      "complianceStatus": "compliant|pending_review",
      "responseText": "proposed response text",
      "exceptionNote": "",
      "documentReference": ""
    }
  ],
  "proposedLineItems": [
    {
      "lineNumber": "1",
      "description": "equipment or service description",
      "equipmentCategory": "category",
      "quantity": 1,
      "unit": "each|day|week|month|lot",
      "unitPrice": 0,
      "totalPrice": 0,
      "specs": "technical specifications",
      "notes": ""
    }
  ],
  "estimatedTotalValue": 0
}`;

    // --- CALL 2: Generate narrative and summaries ---
    const narrativePrompt = `You are an expert government procurement writer for an equipment rental company.

ISSUING ORGANIZATION (if known): ${issuingOrg || 'Extract from document'}
PAST HISTORY WITH THIS ORG:
${historyContext}

${docContext}

Write the following three sections and return as JSON:
{
  "aiAnalysisSummary": "2-3 paragraph executive summary of this RFQ: key equipment needed, critical deadlines, insurance/bonding requirements, risks, and recommended approach.",
  "orgHistorySummary": "Based on the history data provided, summarize patterns, preferences, and past outcomes. If no history, recommend best practices for this org type.",
  "suggestedResponseFormat": "Recommended response document structure that mirrors the RFQ's own section numbering system.",
  "responseNarrative": "Full professional cover letter / response narrative using formal government procurement language. Mirror the RFQ's section structure. For each requirement section provide a direct compliant response."
}`;

    // Run both calls in parallel
    const [metaResult, narrativeResult] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: metadataPrompt,
        model: 'claude_sonnet_4_6',
        file_urls: fileUrl ? [fileUrl] : undefined,
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
            extractedRequirements: { type: 'array', items: { type: 'object' } },
            complianceMatrix: { type: 'array', items: { type: 'object' } },
            proposedLineItems: { type: 'array', items: { type: 'object' } },
            estimatedTotalValue: { type: 'number' },
          }
        },
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: narrativePrompt,
        model: 'claude_sonnet_4_6',
        file_urls: fileUrl ? [fileUrl] : undefined,
        response_json_schema: {
          type: 'object',
          properties: {
            aiAnalysisSummary: { type: 'string' },
            orgHistorySummary: { type: 'string' },
            suggestedResponseFormat: { type: 'string' },
            responseNarrative: { type: 'string' },
          }
        },
      }),
    ]);

    const analysis = { ...metaResult, ...narrativeResult };
    console.log('RFQ analysis complete for org:', analysis.issuingOrg || issuingOrg);
    return Response.json({ success: true, analysis });

  } catch (error) {
    console.error('analyzeRFQ error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});