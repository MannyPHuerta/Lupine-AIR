import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import twilio from 'npm:twilio@4.20.0';

const twilioClient = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);

const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    console.log('sendNotifications received:', JSON.stringify(body, null, 2));

    // Handle automation event payload
    let entity_id, event_type;
    if (body.event) {
      entity_id = body.event.entity_id;
      event_type = body.event.type;
    } else if (body.reportId) {
      // Legacy payload format
      entity_id = body.reportId;
      event_type = 'manual';
    }

    if (!entity_id) {
      return Response.json({ error: 'No report ID found' }, { status: 400 });
    }

    const report = await base44.asServiceRole.entities.Report.get(entity_id);
    if (!report) {
      return Response.json({ error: `Report ${entity_id} not found` }, { status: 404 });
    }

    const staffPhones = await base44.asServiceRole.entities.StaffPhone.list();
    const phoneMap = {};
    staffPhones.forEach(sp => {
      phoneMap[sp.email] = sp.phone;
    });
    console.log('StaffPhone map:', JSON.stringify(phoneMap));

    const reportLink = `https://track-wolf-now.base44.app/report/${entity_id}`;
    console.log('Report link:', reportLink);
    let messages = [];

    // Send to all recipients in sendToEmails and customEmail (user-selected)
    const allRecipients = [...(report.sendToEmails || [])];
    if (report.customEmail && !allRecipients.includes(report.customEmail)) {
      allRecipients.push(report.customEmail);
    }

    const formData = new FormData();
    formData.append("itemName", report.itemName || "");
    formData.append("itemType", report.itemType || "");
    formData.append("model", report.model || "");
    formData.append("serialNumber", report.serialNumber || "");
    formData.append("assetNumber", report.assetNumber || "");
    formData.append("action", report.action || "");
    formData.append("branch", report.branch || "");
    formData.append("comments", report.comments || "");
    formData.append("askingPrice", report.askingPrice ? String(report.askingPrice) : "");
    formData.append("sendTo", allRecipients.join(","));
    formData.append("sentBy", report.sentBy || "Asset Wolf");
    formData.append("photoUrls", (report.photoPaths || []).join(","));
    formData.append("reportLink", reportLink);

    console.log(`Sending email to ${allRecipients.join(', ')}`);
    await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
      method: "POST",
      body: formData
    });

    // Mark report as sent
    const now = new Date().toISOString();
    const isFirstSend = !report.isSent;
    const logEntry = `${now} | ${isFirstSend ? "Sent" : "Resent"} to ${allRecipients.join(", ")}`;
    const updates = {
      isSent: true,
      lastSentAt: now,
      activityLog: [...(report.activityLog || []), logEntry],
    };
    if (isFirstSend) updates.sentAt = now;
    await base44.asServiceRole.entities.Report.update(entity_id, updates);

    // SMS: send to ALL staff phones (not just recipients)
    const smsBody = event_type === 'update' && report.askingPrice
      ? `Quote ready for ${report.itemName}: $${report.askingPrice}. View: ${reportLink}`
      : `New ${report.action} report: ${report.itemName} at ${report.branch}. View: ${reportLink}`;

    for (const sp of staffPhones) {
      if (sp.phone) {
        try {
          const msg = await twilioClient.messages.create({
            from: TWILIO_PHONE,
            to: sp.phone,
            body: smsBody
          });
          console.log(`SMS OK to ${sp.phone} (${sp.email}): sid=${msg.sid} status=${msg.status}`);
          messages.push(msg);
        } catch (smsErr) {
          console.error(`SMS FAILED to ${sp.phone} (${sp.email}): ${smsErr.message} code=${smsErr.code}`);
        }
      }
    }

    console.log(`Done: sent ${messages.length} SMS`);
    return Response.json({ success: true, type: event_type, smsCount: messages.length });
  } catch (error) {
    console.error('sendNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});