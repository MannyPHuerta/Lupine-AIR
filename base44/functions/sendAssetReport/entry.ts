import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const formData = new FormData();
    formData.append("itemName", body.itemName || "");
    formData.append("itemType", body.itemType || "");
    formData.append("model", body.model || "");
    formData.append("serialNumber", body.serialNumber || "");
    formData.append("assetNumber", body.assetNumber || "");
    formData.append("action", body.action || "");
    formData.append("branch", body.branch || "");
    formData.append("comments", body.comments || "");
    formData.append("sendTo", body.sendTo || "");
    formData.append("sentBy", body.sentBy || "");
    formData.append("photoUrls", body.photoUrls || "");

    const response = await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Render backend error:", response.status, text);
      return Response.json({ error: `Render returned ${response.status}: ${text}` }, { status: 502 });
    }

    // Mark report as sent if reportId provided (bypasses RLS)
    if (body.reportId) {
      await base44.asServiceRole.entities.Report.update(body.reportId, { isSent: true });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});