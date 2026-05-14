import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, branch, companyName, companyAddress, companyPhone, companyEmail } = await req.json();

    if (!content) {
      return Response.json({ error: 'content is required' }, { status: 400 });
    }

    // Use AI to inject company info and mark signature blocks
    const result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are a legal document processor. Take this equipment rental agreement and:

1. Inject the company's actual details into any placeholder text (replace generic references with specific company info)
2. Identify all signature, initial, and date signature zones (look for patterns like "Signature:", "Customer Signature:", "Lessor Signature:", "Date:", "Initials:", etc.)
3. Mark each signature zone with a token: [SIGNATURE_N], [INITIALS_N], [DATE_N] where N is sequential
4. Return ONLY the processed text with these signature tokens marked inline

Company Details:
- Name: ${companyName}
- Address: ${companyAddress}
- Phone: ${companyPhone}
- Email: ${companyEmail}
- Branch: ${branch}

AGREEMENT TEXT:
${content}

Return the enriched agreement text with signature zones marked.`,
      response_json_schema: {
        type: 'object',
        properties: {
          enriched_content: { type: 'string', description: 'The agreement text with company info injected and [SIGNATURE_N], [INITIALS_N], [DATE_N] tokens marked' },
          signature_blocks: { type: 'array', items: { type: 'object', properties: { token: { type: 'string' }, type: { type: 'string' }, label: { type: 'string' } } } }
        }
      }
    });

    return Response.json({
      enriched_content: result.enriched_content || content,
      signature_blocks: result.signature_blocks || []
    });

  } catch (error) {
    console.error('enrichAgreementWithSignatures error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});