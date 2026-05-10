import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { workOrderId, mechanicEmail, overridePartCheck } = await req.json();

    if (!workOrderId || !mechanicEmail) {
      return Response.json({ error: 'workOrderId and mechanicEmail required' }, { status: 400 });
    }

    // Fetch work order and mechanic profile
    const workOrders = await base44.entities.WorkOrder.filter({ id: workOrderId });
    const workOrder = workOrders[0];

    if (!workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const mechanics = await base44.entities.MechanicProfile.filter({ email: mechanicEmail });
    const mechanic = mechanics[0];

    if (!mechanic) {
      return Response.json({ error: 'Mechanic not found' }, { status: 404 });
    }

    // Check if mechanic is overloaded
    const assignedToMechanic = await base44.entities.WorkOrder.filter({
      assignedTo: mechanicEmail,
      status: ['scheduled', 'in_progress', 'awaiting_parts']
    });

    if (assignedToMechanic.length >= mechanic.maxConcurrentJobs) {
      return Response.json({
        error: `Mechanic already has ${assignedToMechanic.length} active jobs (max: ${mechanic.maxConcurrentJobs})`,
        overloaded: true
      }, { status: 409 });
    }

    // Check parts availability
    const parts = await base44.entities.PartRequirement.filter({ workOrderId });
    const criticalMissing = parts.filter(p => p.isCritical && p.status !== 'in_stock' && p.status !== 'received');

    if (criticalMissing.length > 0 && !overridePartCheck) {
      return Response.json({
        error: 'Critical parts missing',
        missingParts: criticalMissing.map(p => ({ name: p.partName, status: p.status, eta: p.eta })),
        canOverride: true
      }, { status: 409 });
    }

    // Update work order with assignment
    const now = new Date().toISOString();
    await base44.entities.WorkOrder.update(workOrderId, {
      assignedTo: mechanicEmail,
      assignedAt: now,
      status: workOrder.status === 'scheduled' ? 'scheduled' : workOrder.status
    });

    return Response.json({
      success: true,
      message: `Work order assigned to ${mechanic.fullName}`,
      workOrder: {
        id: workOrderId,
        assignedTo: mechanicEmail,
        assignedAt: now
      }
    });
  } catch (error) {
    console.error('Assignment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});