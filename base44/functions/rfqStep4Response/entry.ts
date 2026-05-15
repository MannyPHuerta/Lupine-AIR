// Step 4: Draft the full response narrative
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqId, companyInfo } = await req.json();
    if (!rfqId) return Response.json({ error: 'rfqId is required' }, { status: 400 });

    const records = await base44.asServiceRole.entities.RFQRecord.list('-created_date', 500);
    const rfq = records.find(r => r.id === rfqId);
    if (!rfq) return Response.json({ error: 'RFQ record not found' }, { status: 404 });

    const docText = (rfq.rawRfqText || '').slice(0, 6000);
    if (!docText) return Response.json({ error: 'No RFQ text found. Please complete Step 1 first.' }, { status: 400 });

    const companyName = companyInfo?.name || 'AIR Equipment Rental';
    const companyAddress = companyInfo?.address || '123 Industrial Dr, McAllen, TX 78501';
    const companyPhone = companyInfo?.phone || '(956) 555-0100';
    const companyEmail = companyInfo?.email || 'bids@airequipmentrental.com';
    const companyWebsite = companyInfo?.website || '';
    const companyLicense = companyInfo?.licenseNumber || '';
    const companyInsurance = companyInfo?.insuranceInfo || 'General Liability $1M/$2M, Auto Liability $1M, Workers Comp statutory limits';

    // Build pricing table from saved line items
    const lineItems = rfq.proposedLineItems || [];
    const pricingContext = lineItems.length > 0
      ? lineItems.map(i => `${i.lineNumber}. ${i.description} | Qty: ${i.quantity} ${i.unit} | Unit: $${i.unitPrice} | Total: $${i.totalPrice}`).join('\n')
      : 'No line items yet — generate pricing first.';

    const totalValue = rfq.estimatedTotalValue || 0;

    console.log('Step 4: Drafting response narrative...');

    const narrative = await base44.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are a senior government procurement writer. Write a complete, professional bid response for this RFQ.

RESPONDING COMPANY:
Name: ${companyName}
Address: ${companyAddress}
Phone: ${companyPhone}
Email: ${companyEmail}
${companyWebsite ? `Website: ${companyWebsite}` : ''}
${companyLicense ? `License: ${companyLicense}` : ''}
Insurance/Bonding: ${companyInsurance}

RFQ SUMMARY: ${rfq.aiAnalysisSummary || ''}

PRICING SCHEDULE:
${pricingContext}
TOTAL PROPOSED VALUE: $${totalValue.toLocaleString()}

ORIGINAL RFQ TEXT (for context):
${docText}

Write a complete bid response with these sections. Do NOT use markdown formatting, markdown headings (# ## ###), horizontal rules (---), or special characters. Use plain text with section numbers and names only:
1. LETTERHEAD: ${companyName}, ${companyAddress}, ${companyPhone}, ${companyEmail}${companyWebsite ? `, ${companyWebsite}` : ''}
2. DATE AND SUBMISSION DETAILS
3. EXECUTIVE SUMMARY
4. COMPANY OVERVIEW: Describe ${companyName} as an established South Texas equipment rental company
5. TECHNICAL APPROACH AND EQUIPMENT SPECIFICATIONS
6. DELIVERY, SETUP AND TEARDOWN PLAN
7. PRICING SCHEDULE: Format the pricing above as a clean table with line totals and grand total
8. INSURANCE AND BONDING: ${companyInsurance}
9. REFERENCES: Include 3 placeholder reference entries
10. CERTIFICATIONS AND SIGNATURE BLOCK

Write minimum 900 words in formal government procurement language. Address the issuing organization by name throughout. Use plain text only, no markdown.`,
    });

    const narrativeText = typeof narrative === 'string' ? narrative : (narrative?.responseNarrative || JSON.stringify(narrative));
    console.log('Step 4 complete. Narrative length:', narrativeText.length);

    // Store as text file URL if needed later; for now, truncate to fit field limit
    const truncated = narrativeText.substring(0, 10000);
    
    await base44.asServiceRole.entities.RFQRecord.update(rfqId, {
      responseNarrative: truncated,
      status: 'draft',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('rfqStep4Response error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});