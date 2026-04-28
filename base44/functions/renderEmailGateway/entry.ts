import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Render email gateway function - acts as a service-role fallback for sending emails through Render.
 * Can be called directly instead of relying on the /send-asset-report endpoint.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, htmlBody, fromName } = await req.json();

    if (!to || !subject || !htmlBody) {
      return Response.json({ error: 'Missing required fields: to, subject, htmlBody' }, { status: 400 });
    }

    // Forward to Render backend (proven working)
    const formData = new FormData();
    formData.append('itemName', subject);
    formData.append('itemType', 'Rental');
    formData.append('action', 'Email');
    formData.append('comments', htmlBody);
    formData.append('sendTo', to);
    formData.append('sentBy', fromName || 'Rental World LLC');

    const renderResponse = await fetch('https://asset-wolf-backend.onrender.com/send-asset-report', {
      method: 'POST',
      body: formData,
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error('[renderEmailGateway] Render error:', renderResponse.status, errorText);
      return Response.json({ error: `Render returned ${renderResponse.status}` }, { status: 502 });
    }

    return Response.json({ success: true, message: 'Email sent via Render' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});