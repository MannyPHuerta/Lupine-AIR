import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rentalId } = await req.json();
    
    if (!rentalId) {
      return Response.json({ error: 'Rental ID is required' }, { status: 400 });
    }

    // Fetch the rental
    const rental = await base44.entities.Rental.get(rentalId);
    
    if (!rental) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Check if this is a rent-to-own rental
    if (!rental.isRentToOwn) {
      return Response.json({ error: 'This rental is not a rent-to-own contract' }, { status: 400 });
    }

    // Check if purchase option has expired
    if (rental.purchaseOptionExpiry && new Date(rental.purchaseOptionExpiry) < new Date()) {
      return Response.json({ error: 'Purchase option has expired' }, { status: 400 });
    }

    // Check if already fully credited
    if (rental.balanceRemaining <= 0) {
      return Response.json({ error: 'This equipment has already been purchased' }, { status: 400 });
    }

    // Calculate final payment needed
    const finalPayment = rental.balanceRemaining;

    // Update rental status to completed (purchased)
    await base44.entities.Rental.update(rentalId, {
      status: 'completed',
      amountCredited: rental.purchasePrice, // Fully credited now
      balanceRemaining: 0,
      statusHistory: [
        ...(rental.statusHistory || []),
        {
          status: 'completed',
          changedAt: new Date().toISOString(),
          changedBy: user.email,
          note: `Rent-to-own purchase completed. Final payment: $${finalPayment.toFixed(2)}`
        }
      ]
    });

    // Update equipment status - remove from inventory (sold)
    await base44.entities.Equipment.update(rental.equipmentId, {
      unitStatus: 'retired',
      statusNote: 'Sold via rent-to-own'
    });

    return Response.json({ 
      success: true,
      message: 'Equipment purchased successfully!',
      finalPayment,
      purchasePrice: rental.purchasePrice,
      totalCredited: rental.purchasePrice
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});