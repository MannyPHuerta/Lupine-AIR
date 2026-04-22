import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

const SUPERUSERS = [
  "awolf@rentalworld.com",
  "bwolf@rentalworld.com",
  "brucewolf@rentalworld.com",
  "manny@rentalworld.com",
  "mannyph2003@hotmail.com",
  "ealfaro@rentalworld.com",
  "margog@rentalworld.com",
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { event, data } = await req.json();

  // Only process new Sell reports
  if (event?.type !== "create") return Response.json({ skipped: true });
  if (data?.action !== "Sell") return Response.json({ skipped: "not a sell report" });

  const report = data;

  // Find superusers among the report's recipients
  const allRecipients = [
    ...(report.sendToEmails || []),
    ...(report.customEmail ? [report.customEmail] : []),
  ];

  const superuserRecipients = allRecipients.filter(email =>
    SUPERUSERS.some(su => su.toLowerCase() === email.toLowerCase().trim())
  );

  if (superuserRecipients.length === 0) {
    return Response.json({ skipped: "no superuser recipients" });
  }

  // Build email body
  const lines = [
    `A new item has been submitted for sale and needs to be posted to Craigslist and/or Facebook Marketplace.`,
    ``,
    `Item: ${report.itemName}`,
    report.model ? `Model: ${report.model}` : null,
    report.serialNumber ? `Serial #: ${report.serialNumber}` : null,
    report.assetNumber ? `Asset #: ${report.assetNumber}` : null,
    report.branch ? `Branch: ${report.branch}` : null,
    report.askingPrice ? `Asking Price: $${report.askingPrice.toLocaleString()}` : null,
    report.comments ? `\nNotes: ${report.comments}` : null,
    ``,
    `Submitted by: ${report.sentBy || "Unknown"}`,
    ``,
    `Please log in to Asset Wolf and go to Report History to post this item.`,
  ].filter(l => l !== null).join("\n");

  // Send email to each superuser recipient
  for (const email of superuserRecipients) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `🐺 New Sell Item: ${report.itemName} — Ready to Post`,
      body: lines,
    });
  }

  return Response.json({ sent: superuserRecipients });
});