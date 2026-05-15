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

    let docText = (rfq.rawRfqText || '');

    // If the doc text seems thin (only boilerplate), re-extract from the uploaded file to get exhibits/schedules
    if (docText.length < 2000 && rfq.uploadedFileUrl) {
      console.log('rawRfqText too short, re-extracting from uploaded file...');
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: rfq.uploadedFileUrl,
          json_schema: { type: 'object', properties: { full_text: { type: 'string' } } }
        });
        if (extracted.status === 'success' && extracted.output?.full_text) {
          docText = extracted.output.full_text;
          console.log('Re-extracted text length:', docText.length);
          // Save it back so future steps have it
          await base44.asServiceRole.entities.RFQRecord.update(rfqId, { rawRfqText: docText.slice(0, 50000) });
        }
      } catch (e) {
        console.log('Re-extraction failed:', e.message);
      }
    }

    // Use ALL requirements as context, not just equipment/pricing
    const allRequirements = (rfq.extractedRequirements || [])
      .map(r => `[${r.sectionNumber}] ${r.requirementType?.toUpperCase()}: ${r.requirementText}`)
      .join('\n') || 'See full RFQ text.';

    if (!docText) return Response.json({ error: 'No RFQ text found. Please complete Step 1 first.' }, { status: 400 });

    console.log('Step 3: Generating line items...');
    console.log('Requirements count:', rfq.extractedRequirements?.length || 0);
    console.log('Doc text length:', docText.length);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Equipment pricing specialist. List all equipment/services in this RFQ with realistic market prices.

RFQ: ${docText.slice(0, 3000)}

Rules: unitPrice > 0 always. If buying: purchase price. If renting: daily rate. At least 5 items.

Return JSON: { "proposedLineItems": [{ "lineNumber": "1", "description": "...", "equipmentCategory": "...", "quantity": 1, "unit": "each", "unitPrice": 50000, "totalPrice": 50000, "specs": "...", "notes": "" }] }`,
      response_json_schema: {
        type: 'object',
        properties: {
          proposedLineItems: { type: 'array', items: { type: 'object' } },
        }
      }
    });

    // InvokeLLM with response_json_schema returns the parsed object directly
    console.log('LLM raw result type:', typeof result);
    console.log('LLM raw result keys:', result ? Object.keys(result) : 'null');
    console.log('LLM proposedLineItems:', JSON.stringify(result?.proposedLineItems?.slice(0, 2)));
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