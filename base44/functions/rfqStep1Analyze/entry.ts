// Step 1: Extract metadata + AI summary only (fast, ~10s)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqText, fileUrl, rfqId, companyInfo } = await req.json();
    if (!rfqText && !fileUrl) return Response.json({ error: 'Must provide rfqText or fileUrl' }, { status: 400 });
    if (!rfqId) return Response.json({ error: 'rfqId is required' }, { status: 400 });

    // Extract text from file if needed
    let extractedText = rfqText || null;
    if (!extractedText && fileUrl) {
      console.log('Extracting text from file...');
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: { type: 'object', properties: { full_text: { type: 'string' } } }
      });
      if (extracted.status === 'success' && extracted.output?.full_text) {
        extractedText = extracted.output.full_text;
      }
    }
    if (!extractedText) return Response.json({ error: 'Could not extract text from file. Please paste the RFQ text directly.' }, { status: 400 });

    const docText = extractedText.slice(0, 10000);
    const companyName = companyInfo?.name || 'AIR Equipment Rental';
    const companyAddress = companyInfo?.address || '123 Industrial Dr, McAllen, TX 78501';
    const companyPhone = companyInfo?.phone || '(956) 555-0100';
    const companyEmail = companyInfo?.email || 'bids@airequipmentrental.com';

    console.log('Step 1: Running metadata + summary analysis...');

    const result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are a senior government procurement specialist. Analyze this RFQ and extract metadata and a strategic summary.

RFQ TEXT:
${docText}

RESPONDING COMPANY: ${companyName}, ${companyAddress}, ${companyPhone}, ${companyEmail}

Return JSON with:
- issuingOrg (string)
- rfqNumber (string)
- title (string)
- orgType (municipal|county|state|federal|private|nonprofit|other)
- dueDate (YYYY-MM-DD or null)
- dueTime (string or null)
- submissionMethod (email|mail|portal|hand_delivery|fax)
- submissionAddress (string or null)
- contactName (string or null)
- contactEmail (string or null)
- contactPhone (string or null)
- suggestedFileName (format: RFQ-YEAR-ORGABBREV_AIR-Response.pdf)
- aiAnalysisSummary (3 paragraphs: (1) what is being requested and event context, (2) key mandatory requirements and any risky clauses, (3) our competitive strategy and win approach)
- orgHistorySummary (1-2 paragraphs on best practices for this org type and procurement approach)
- suggestedResponseFormat (bulleted outline of recommended response document sections)`,
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
        }
      }
    });

    const data = result?.data || result || {};
    console.log('Step 1 complete. Keys:', Object.keys(data));

    await base44.asServiceRole.entities.RFQRecord.update(rfqId, {
      ...(data.issuingOrg && { issuingOrg: data.issuingOrg }),
      ...(data.rfqNumber && { rfqNumber: data.rfqNumber }),
      ...(data.title && { title: data.title }),
      ...(data.orgType && { orgType: data.orgType }),
      ...(data.dueDate && { dueDate: data.dueDate }),
      ...(data.dueTime && { dueTime: data.dueTime }),
      ...(data.submissionMethod && { submissionMethod: data.submissionMethod }),
      ...(data.submissionAddress && { submissionAddress: data.submissionAddress }),
      ...(data.contactName && { contactName: data.contactName }),
      ...(data.contactEmail && { contactEmail: data.contactEmail }),
      ...(data.contactPhone && { contactPhone: data.contactPhone }),
      ...(data.suggestedFileName && { suggestedFileName: data.suggestedFileName }),
      aiAnalysisSummary: data.aiAnalysisSummary || '',
      orgHistorySummary: data.orgHistorySummary || '',
      suggestedResponseFormat: data.suggestedResponseFormat || '',
      // Store extracted text for use in later steps
      rawRfqText: docText,
      status: 'analyzing',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('rfqStep1Analyze error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});