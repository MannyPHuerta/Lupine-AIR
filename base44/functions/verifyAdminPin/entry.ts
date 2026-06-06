/**
 * verifyAdminPin — validates the admin's security PIN for the Internal Fraud Controls section.
 * PIN is stored as the FRAUD_SECTION_PIN secret. Logs every attempt.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Must be admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { pin } = await req.json();
    const correctPin = Deno.env.get('FRAUD_SECTION_PIN');

    if (!correctPin) {
      return Response.json({ error: 'PIN not configured. Set FRAUD_SECTION_PIN secret.' }, { status: 503 });
    }

    const success = pin === correctPin;

    // Log every attempt
    await base44.asServiceRole.entities.AuditLog.create({
      action: success ? 'fraud_section_unlocked' : 'fraud_section_failed_auth',
      entityName: 'System',
      entityId: 'fraud_controls',
      entityLabel: 'Internal Fraud Controls',
      performedBy: user.email,
      performedAt: new Date().toISOString(),
      branch: '',
      reason: success ? 'Admin unlocked fraud controls section' : 'Failed PIN attempt on fraud controls',
      changes: { success, userEmail: user.email, userName: user.full_name },
    });

    if (!success) {
      return Response.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});