export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, company, branches, name, phone } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const send = (payload) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json());

  const [admin, confirm] = await Promise.all([
    send({
      from: 'AIR Waitlist <info@theprojectair.com>',
      to: ['info@theprojectair.com'],
      reply_to: email,
      subject: `🚀 New Early Access Request — ${company || email}`,
      html: `<p><b>Name:</b> ${name || '—'}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone || '—'}</p><p><b>Company:</b> ${company || '—'}</p><p><b>Branches:</b> ${branches || '—'}</p>`,
    }),
    send({
      from: 'AIR Waitlist <info@theprojectair.com>',
      to: [email],
      subject: 'Thanks for your interest in AIR! 🎉',
      html: `<p>Hi ${name || 'there'},</p><p>We'll reach out within 2 business days to schedule your demo.</p>`,
    }),
  ]);

  if (admin.error || confirm.error) return res.status(500).json({ error: (admin.error || confirm.error).message });
  return res.status(200).json({ success: true });
}
