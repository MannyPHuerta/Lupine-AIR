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
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (event_type === 'create' && report.action === 'Need Quote for Customer') {
      // New quote request → send via Render
      console.log(`Sending quote request notification to ${allRecipients.join(', ')}`);
      const formData = new FormData();
      formData.append("itemName", report.itemName || "");
      formData.append("itemType", report.itemType || "");
      formData.append("model", report.model || "");
      formData.append("serialNumber", report.serialNumber || "");
      formData.append("action", report.action || "");
      formData.append("branch", report.branch || "");
      formData.append("comments", report.comments || "");
      formData.append("sendTo", allRecipients.join(","));
      formData.append("sentBy", report.sentBy || "Asset Wolf");
      formData.append("photoUrls", (report.photoPaths || []).join(","));
      formData.append("reportLink", reportLink);

      await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
        method: "POST",
        body: formData
      });

      // Send SMS to staff with phone on file
      for (const email of allRecipients) {
        const phone = phoneMap[email];
        if (phone) {
          console.log(`Queueing SMS to ${phone}`);
          messages.push(
            twilioClient.messages.create({
              from: TWILIO_PHONE,
              to: phone,
              body: `New quote request: ${report.itemName}. View: ${reportLink}`
            })
          );
        }
      }
    } else if ((event_type === 'update' || event_type === 'manual') && report.askingPrice) {
      // Price entered → send via Render
      console.log(`Sending quote ready notification to ${allRecipients.join(', ')}`);
      const formData = new FormData();
      formData.append("itemName", report.itemName || "");
      formData.append("itemType", report.itemType || "");
      formData.append("model", report.model || "");
      formData.append("serialNumber", report.serialNumber || "");
      formData.append("action", report.action || "");
      formData.append("branch", report.branch || "");
      formData.append("comments", report.comments || "");
      formData.append("askingPrice", report.askingPrice || "");
      formData.append("sendTo", allRecipients.join(","));
      formData.append("sentBy", report.sentBy || "Asset Wolf");
      formData.append("photoUrls", (report.photoPaths || []).join(","));
      formData.append("reportLink", reportLink);

      await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
        method: "POST",
        body: formData
      });

      // Send SMS to staff with phone on file
      for (const email of allRecipients) {
        const phone = phoneMap[email];
        if (phone) {
          console.log(`Queueing SMS to ${phone}`);
          messages.push(
            twilioClient.messages.create({
              from: TWILIO_PHONE,
              to: phone,
              body: `Quote ready for ${report.itemName}: $${report.askingPrice}. View: ${reportLink}`
            })
          );
        }
      }
    }

    await Promise.all(messages);
    console.log(`Success: sent ${messages.length} SMS`);
    return Response.json({ success: true, type: event_type, smsCount: messages.length });
  } catch (error) {
    console.error('sendNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});