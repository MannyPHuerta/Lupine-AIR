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

    // Include the report view link if provided
    if (body.reportLink) formData.append("reportLink", body.reportLink);

    const response = await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Render backend error:", response.status, text);
      return Response.json({ error: `Render returned ${response.status}: ${text}` }, { status: 502 });
    }

    // Email sent successfully — now try to mark as sent in DB with timestamps
    if (body.reportId) {
      try {
        const base44 = createClientFromRequest(req);
        const now = new Date().toISOString();
        const existing = await base44.asServiceRole.entities.Report.get(body.reportId);
        const isFirstSend = !existing?.isSent;
        const logEntry = `${now} | ${isFirstSend ? "Sent" : "Resent"} by ${body.sentBy || "unknown"} to ${body.sendTo || "unknown"}`;
        const activityLog = [...(existing?.activityLog || []), logEntry];

        const updates = {
          isSent: true,
          lastSentAt: now,
          activityLog,
        };
        if (isFirstSend) updates.sentAt = now;

        await base44.asServiceRole.entities.Report.update(body.reportId, updates);
        console.log("Marked report as sent:", body.reportId);
      } catch (dbErr) {
        console.error("DB update error (non-fatal):", dbErr.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("sendAssetReport error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});