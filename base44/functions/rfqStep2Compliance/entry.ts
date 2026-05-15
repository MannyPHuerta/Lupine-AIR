// Step 2: Extract requirements + build compliance matrix only
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqId } = await req.json();
    if (!rfqId) return Response.json({ error: 'rfqId is required' }, { status: 400 });

    // Load the saved RFQ record to get the text
    const records = await base44.asServiceRole.entities.RFQRecord.list('-created_date', 500);
    const rfq = records.find(r => r.id === rfqId);
    if (!rfq) return Response.json({ error: 'RFQ record not found' }, { status: 404 });

    const docText = (rfq.rawRfqText || '').slice(0, 10000);
    if (!docText) return Response.json({ error: 'No RFQ text found. Please complete Step 1 first.' }, { status: 400 });

    const companyInsurance = 'General Liability $1M/$2M, Auto Liability $1M, Workers Comp statutory limits';

    console.log('Step 2: Building compliance matrix...');

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior government procurement compliance specialist. Extract ALL requirements from this RFQ and build a compliance matrix.

RFQ TEXT:
${docText}

Our insurance: ${companyInsurance}

Return JSON with:

extractedRequirements: Array of ALL explicit requirements. Each item: { sectionNumber (string), sectionTitle (string), requirementText (string), requirementType (equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other), isMandatory (boolean) }

complianceMatrix: One row per requirement in the same order. Each item: { sectionNumber (string), requirementSummary (max 20 words, string), complianceStatus (compliant|compliant_with_exception|non_compliant|not_applicable|pending_review), responseText (1-2 sentence response, string), exceptionNote (string or null), documentReference (string or null) }

Be thorough — capture every requirement, no matter how small.`,
        response_json_schema: {
          type: 'object',
          properties: {
            extractedRequirements: { type: 'array', items: { type: 'object' } },
            complianceMatrix: { type: 'array', items: { type: 'object' } },
          }
        }
      });
    } catch (llmErr) {
      console.error('LLM call failed:', llmErr.message);
      throw llmErr;
    }

    console.log('LLM result type:', typeof result, '| keys:', result ? Object.keys(result) : 'null');
    // InvokeLLM with response_json_schema returns the parsed object directly
    const data = (result?.extractedRequirements || result?.complianceMatrix) ? result : (result?.data || result || {});
    console.log('Step 2 complete. Requirements:', data.extractedRequirements?.length, '| Matrix rows:', data.complianceMatrix?.length);

    await base44.asServiceRole.entities.RFQRecord.update(rfqId, {
      extractedRequirements: data.extractedRequirements || [],
      complianceMatrix: data.complianceMatrix || [],
      status: 'analyzing',
    });

    return Response.json({ success: true, requirementCount: data.extractedRequirements?.length || 0 });
  } catch (error) {
    console.error('rfqStep2Compliance error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});