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

    // Fetch past RFQ history for this org (only if we already know who it is)
    let historyContext = 'No previous history.';
    if (issuingOrg) {
      let orgHistory = await base44.asServiceRole.entities.RFQRecord.filter({ issuingOrg });
      if (rfqId) orgHistory = orgHistory.filter(r => r.id !== rfqId);
      if (orgHistory.length > 0) {
        historyContext = orgHistory.map(r =>
          `- RFQ ${r.rfqNumber || 'N/A'} | Status: ${r.status} | Value: $${r.estimatedTotalValue || 0}`
        ).join('\n');
      }
    }

    // If a file was uploaded, extract its text first so we don't pass the file_url
    // directly to the LLM (which causes 502 timeouts on large PDFs)
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
      } else {
        console.log('Extraction failed or empty, will use file_url as fallback');
      }
    }

    const docContext = extractedText
      ? `RFQ TEXT:\n${extractedText.slice(0, 12000)}`
      : 'The RFQ document is attached as a file. Read and analyze its full contents.';

    const companyContext = companyInfo ? `
OUR COMPANY INFORMATION (use this when writing the response narrative and compliance matrix):
Company Name: ${companyInfo.name || 'AIR Equipment Rental'}
Address: ${companyInfo.address || ''}
Phone: ${companyInfo.phone || ''}
Email: ${companyInfo.email || ''}
Website: ${companyInfo.website || ''}
License: ${companyInfo.licenseNumber || ''}
Insurance: ${companyInfo.insuranceInfo || ''}
` : `OUR COMPANY: AIR Equipment Rental (use as the responding vendor in all response text)`;

    const prompt = `You are a government procurement analyst for an equipment rental company.

${companyContext}

${docContext}

PAST HISTORY WITH THIS ORG:
${historyContext}

Extract all available data from this RFQ and return a JSON object with these exact fields. If a value is not found, use null for strings and [] for arrays.

Required fields:
- issuingOrg (string): full name of issuing organization
- rfqNumber (string): official RFQ/IFB/ITB number
- title (string): official RFQ title
- orgType (string): one of municipal|county|state|federal|private|nonprofit|other
- dueDate (string): YYYY-MM-DD format
- dueTime (string): e.g. "2:00 PM CST"
- submissionMethod (string): one of email|mail|portal|hand_delivery|fax
- submissionAddress (string): address or portal URL
- contactName (string)
- contactEmail (string)
- contactPhone (string)
- suggestedFileName (string): format "RFQ-YEAR-ORGABBREV-NUMBER_AIR-Response.pdf"
- aiAnalysisSummary (string): 2-3 paragraph summary of key requirements, deadlines, and approach
- orgHistorySummary (string): summary based on history data, or best practices if no history
- suggestedResponseFormat (string): recommended response structure
- estimatedTotalValue (number): estimated total bid value in USD
- responseNarrative (string): professional cover letter response using formal procurement language
- extractedRequirements (array of objects with: sectionNumber, sectionTitle, requirementText, requirementType, isMandatory)
- complianceMatrix (array of objects with: sectionNumber, requirementSummary, complianceStatus, responseText)
- proposedLineItems (array of objects with: lineNumber, description, equipmentCategory, quantity, unit, unitPrice, totalPrice, specs)`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_4',
      // Only pass file_url if text extraction failed (fallback)
      file_urls: (!extractedText && fileUrl) ? [fileUrl] : undefined,
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
          aiAnalysisSummary: { type: 'string' },
          orgHistorySummary: { type: 'string' },
          suggestedResponseFormat: { type: 'string' },
          extractedRequirements: { type: 'array', items: { type: 'object' } },
          complianceMatrix: { type: 'array', items: { type: 'object' } },
          proposedLineItems: { type: 'array', items: { type: 'object' } },
          estimatedTotalValue: { type: 'number' },
          responseNarrative: { type: 'string' },
        }
      },
    });

    console.log('RFQ analysis complete. Org:', result.issuingOrg, '| RFQ#:', result.rfqNumber);
    return Response.json({ success: true, analysis: result });

  } catch (error) {
    console.error('analyzeRFQ error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});