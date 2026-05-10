import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { equipmentId, problemDetected, photos, sourceContext } = await req.json();
    
    if (!equipmentId || !problemDetected) {
      return Response.json({ error: 'equipmentId and problemDetected required' }, { status: 400 });
    }

    // Fetch equipment
    const equipment = await base44.entities.Equipment.filter({ id: equipmentId });
    if (!equipment || equipment.length === 0) {
      return Response.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const eq = equipment[0];

    // Create work order
    const workOrder = await base44.entities.WorkOrder.create({
      equipmentId,
      equipmentName: eq.name,
      type: 'repair',
      status: 'scheduled',
      branch: sourceContext?.branch || 'Unknown',
      description: problemDetected,
      notes: `Flagged by ${user.email} (${sourceContext?.source || 'system'})\n${photos?.length ? `${photos.length} photo(s) attached` : ''}`,
      createdAt: new Date().toISOString(),
      // Attach photos to notes if available
      ...(photos && photos.length > 0 ? { attachedPhotos: photos } : {}),
    });

    // Update equipment status to "under_inspection"
    await base44.entities.Equipment.update(equipmentId, {
      unitStatus: 'under_inspection',
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedBy: user.email,
      statusNote: 'Flagged for repair',
    });

    console.log(`✅ WorkOrder ${workOrder.id} created for equipment ${eq.name}`);

    return Response.json({
      success: true,
      workOrderId: workOrder.id,
      equipmentName: eq.name,
    });
  } catch (error) {
    console.error('Error in flagEquipmentForRepair:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});