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

    const docText = (rfq.rawRfqText || '').slice(0, 10000);
    if (!docText) return Response.json({ error: 'No RFQ text found. Please complete Step 1 first.' }, { status: 400 });

    // Include compliance matrix context to know what equipment is needed
    const requirementsSummary = (rfq.extractedRequirements || [])
      .filter(r => r.requirementType === 'equipment' || r.requirementType === 'pricing')
      .map(r => `- ${r.requirementText}`)
      .join('\n') || 'See full RFQ text.';

    console.log('Step 3: Generating line items...');

    const result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are a pricing specialist for a South Texas equipment rental company. Generate a detailed pricing schedule for this RFQ.

EQUIPMENT/PRICING REQUIREMENTS:
${requirementsSummary}

FULL RFQ TEXT (for context):
${docText.slice(0, 5000)}

Generate realistic South Texas market pricing. Return JSON with:

proposedLineItems: Array of all line items. Each: { lineNumber (string like "1", "2"), description (string), equipmentCategory (string), quantity (number), unit (each|day|week|month|event|lot), unitPrice (number — realistic South TX rate), totalPrice (number = quantity × unitPrice), specs (brief specs string), notes (string or null) }

Be comprehensive — include every piece of equipment and service mentioned. Include delivery/setup/teardown as separate line items if applicable.`,
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
    const items = data.proposedLineItems || [];
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