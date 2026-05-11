import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { truck, equipment } = await req.json();

    if (!truck || !equipment || !Array.isArray(equipment)) {
      return Response.json({ error: 'Invalid truck or equipment data' }, { status: 400 });
    }

    // Generate QR code data for each item
    // QR codes encode: truckId|equipmentId|equipmentName
    const labels = equipment.map((item, idx) => {
      const qrData = `truck:${truck.id}|item:${item.id}|name:${item.name}`;
      
      return {
        id: item.id,
        name: item.name,
        sequenceNumber: idx + 1,
        qrData,
        weight: item.weight || 500,
        volume: item.volume || 10,
        truckName: truck.name,
      };
    });

    return Response.json({
      success: true,
      labels,
      truckId: truck.id,
      truckName: truck.name,
      totalItems: equipment.length,
    });
  } catch (error) {
    console.error('generateShippingLabels error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});