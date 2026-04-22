import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
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

    // Email sent successfully — now try to mark as sent in DB
    if (body.reportId) {
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.Report.update(body.reportId, { isSent: true });
        console.log("Marked report as sent:", body.reportId);
      } catch (dbErr) {
        // Log but don't fail — email was already sent
        console.error("DB update error (non-fatal):", dbErr.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("sendAssetReport error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});