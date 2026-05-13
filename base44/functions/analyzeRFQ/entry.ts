import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqText, fileUrl, issuingOrg, rfqId } = await req.json();

    if (!rfqText && !fileUrl) {
      return Response.json({ error: 'Must provide rfqText or fileUrl' }, { status: 400 });
    }

    // Fetch past RFQ history for this org
    let orgHistory = [];
    if (issuingOrg) {
      orgHistory = await base44.asServiceRole.entities.RFQRecord.filter({ issuingOrg });
      // Exclude the current one being analyzed
      if (rfqId) orgHistory = orgHistory.filter(r => r.id !== rfqId);
    }

    const historyContext = orgHistory.length > 0
      ? orgHistory.map(r =>
          `- RFQ: ${r.rfqNumber || 'N/A'} | Status: ${r.status} | Value: $${r.estimatedTotalValue || 0} | Outcome: ${r.outcome || 'N/A'}`
        ).join('\n')
      : 'No previous RFQ history found for this organization.';

    const sourceText = rfqText || `[Uploaded file at: ${fileUrl} — extract and analyze its contents]`;

    const systemPrompt = `You are an expert government procurement analyst and equipment rental bid specialist. 
You help equipment rental companies prepare precise, compliant responses to RFQs from municipal, county, state, and federal agencies.
You understand that Engineers review these documents and expect: section-by-section compliance, exact spec matching, no ambiguity, and every deviation explicitly noted.`;

    const userPrompt = `Analyze the following RFQ and generate a complete structured response package.

ISSUING ORGANIZATION: ${issuingOrg || 'Unknown'}

PAST HISTORY WITH THIS ORG:
${historyContext}

RFQ CONTENT:
${sourceText}

Return a JSON object with exactly these fields:

{
  "rfqNumber": "official RFQ number extracted from document",
  "title": "official title of the RFQ",
  "orgType": "municipal|county|state|federal|private|nonprofit|other",
  "dueDate": "YYYY-MM-DD if found",
  "dueTime": "time string if found",
  "submissionMethod": "email|mail|portal|hand_delivery|fax",
  "submissionAddress": "address or URL",
  "contactName": "contact name if found",
  "contactEmail": "contact email if found",
  "contactPhone": "contact phone if found",
  "suggestedFileName": "RFQ-[YEAR]-[ORG_ABBREV]-[NUMBER]_AIR-Response.pdf",
  "aiAnalysisSummary": "2-3 paragraph executive summary of the RFQ, key requirements, risks, and recommended approach. Be precise and technical.",
  "orgHistorySummary": "Summary of what the history data tells us about this org's patterns, preferences, past wins/losses. If no history, recommend best practices for this org type.",
  "suggestedResponseFormat": "Recommended response structure mirroring the RFQ's own section numbering system",
  "extractedRequirements": [
    {
      "sectionNumber": "e.g. 3.1",
      "sectionTitle": "e.g. Equipment Specifications",
      "requirementText": "verbatim or close paraphrase of the requirement",
      "requirementType": "equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other",
      "isMandatory": true
    }
  ],
  "complianceMatrix": [
    {
      "sectionNumber": "e.g. 3.1",
      "requirementSummary": "brief summary of the requirement",
      "complianceStatus": "compliant|compliant_with_exception|non_compliant|not_applicable|pending_review",
      "responseText": "proposed response text for this line item",
      "exceptionNote": "if compliant_with_exception or non_compliant, explain here",
      "documentReference": "what supporting doc to attach, if any"
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
      "specs": "technical specifications matching RFQ requirements",
      "notes": "any notes or clarifications"
    }
  ],
  "estimatedTotalValue": 0,
  "responseNarrative": "Full professional cover letter / response narrative. Mirror the RFQ's section structure. Use formal government procurement language. For each section of the RFQ, provide a direct compliant response. Note any exceptions explicitly."
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: userPrompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
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
          aiAnalysisSummary: { type: 'string' },
          orgHistorySummary: { type: 'string' },
          suggestedResponseFormat: { type: 'string' },
          extractedRequirements: { type: 'array', items: { type: 'object' } },
          complianceMatrix: { type: 'array', items: { type: 'object' } },
          proposedLineItems: { type: 'array', items: { type: 'object' } },
          estimatedTotalValue: { type: 'number' },
          responseNarrative: { type: 'string' }
        }
      }
    });

    console.log('RFQ analysis complete for org:', issuingOrg);
    return Response.json({ success: true, analysis: result });

  } catch (error) {
    console.error('analyzeRFQ error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});