// Step 3: Generate proposed line items / pricing
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqId } = await req.json();
    if (!rfqId) return Response.json({ error: 'rfqId is required' }, { status: 400 });

    const records = await base44.asServiceRole.entities.RFQRecord.list('-created_date', 500);
    const rfq = records.find(r => r.id === rfqId);
    if (!rfq) return Response.json({ error: 'RFQ record not found' }, { status: 404 });

    const docText = (rfq.rawRfqText || '').slice(0, 12000);
    if (!docText) return Response.json({ error: 'No RFQ text found. Please complete Step 1 first.' }, { status: 400 });

    // Use ALL requirements as context, not just equipment/pricing
    const allRequirements = (rfq.extractedRequirements || [])
      .map(r => `[${r.sectionNumber}] ${r.requirementType?.toUpperCase()}: ${r.requirementText}`)
      .join('\n') || 'See full RFQ text.';

    console.log('Step 3: Generating line items...');
    console.log('Requirements count:', rfq.extractedRequirements?.length || 0);
    console.log('Doc text length:', docText.length);

    const result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are a pricing specialist for a South Texas equipment rental and sales company. Generate a pricing schedule for this RFQ.

RFQ TEXT (first 4000 chars):
${docText.slice(0, 4000)}

EXTRACTED REQUIREMENTS:
${allRequirements.slice(0, 2000)}

Rules:
- Identify every piece of equipment or service requested.
- Price at realistic South Texas market rates (purchase price if buying, rental rate if renting).
- Every unitPrice MUST be > 0.
- Include delivery/setup fees if mentioned.

Return JSON: proposedLineItems array. Each item: { lineNumber, description, equipmentCategory, quantity, unit (each|day|week|month|lot), unitPrice, totalPrice, specs, notes }`,
      response_json_schema: {
        type: 'object',
        properties: {
          proposedLineItems: { type: 'array', items: { type: 'object' } },
        }
      }
    });

    // InvokeLLM with response_json_schema returns the parsed object directly
    const data = (result && typeof result === 'object' && result.proposedLineItems)
      ? result
      : (result?.data || {});
    const items = (data.proposedLineItems || []).map((item, idx) => ({
      ...item,
      lineNumber: item.lineNumber || String(idx + 1),
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || ((item.quantity || 1) * (item.unitPrice || 0)),
    }));
    const totalValue = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    console.log('Step 3 complete. Line items:', items.length, '| Total: $', totalValue);

    await base44.asServiceRole.entities.RFQRecord.update(rfqId, {
      proposedLineItems: items,
      estimatedTotalValue: totalValue,
      status: 'analyzing',
    });

    return Response.json({ success: true, lineItemCount: items.length, totalValue });
  } catch (error) {
    console.error('rfqStep3LineItems error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});