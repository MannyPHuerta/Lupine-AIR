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
      prompt: `You are a pricing specialist for a South Texas equipment rental/sales company. Read this RFQ and generate a detailed line-item pricing schedule.

RFQ TEXT:
${docText.slice(0, 5000)}

REQUIREMENTS EXTRACTED:
${allRequirements.slice(0, 1500)}

CRITICAL RULES:
1. Generate AT LEAST 5 line items. More is better.
2. Every single unitPrice MUST be a positive number greater than zero. Example: 45000, 1200, 350.
3. If buying equipment: use realistic purchase prices (e.g. excavator = $85000, generator = $12000).
4. If renting: use daily/weekly rates (e.g. excavator/day = $1200, generator/day = $250).
5. totalPrice = quantity * unitPrice. Never leave either as 0.
6. Include ALL equipment, vehicles, and services mentioned.

Return JSON with proposedLineItems array. Each item must have: lineNumber (string), description (string), equipmentCategory (string), quantity (number > 0), unit (string: each/day/week/month/lot), unitPrice (number > 0), totalPrice (number > 0), specs (string), notes (string)`,
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
    const items = (data.proposedLineItems || []).map((item, idx) => {
      const qty = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.unit_price) || 0;
      const totalPrice = parseFloat(item.totalPrice) || parseFloat(item.total_price) || (qty * unitPrice);
      console.log(`  Item ${idx+1}: "${item.description}" qty=${qty} unitPrice=${unitPrice} total=${totalPrice}`);
      return {
        ...item,
        lineNumber: item.lineNumber || String(idx + 1),
        quantity: qty,
        unitPrice,
        totalPrice,
      };
    });
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