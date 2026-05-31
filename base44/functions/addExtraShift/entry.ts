import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rentalId, extraShifts, extraShiftRate } = await req.json();

    if (!rentalId || extraShifts === undefined || !extraShiftRate) {
      return Response.json({ error: 'Missing required fields: rentalId, extraShifts, extraShiftRate' }, { status: 400 });
    }

    // Fetch the rental
    const rental = await base44.entities.Rental.get(rentalId);
    if (!rental) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Only allow extra shift billing on "out" or "returned" rentals
    if (!['out', 'returned'].includes(rental.status)) {
      return Response.json({ error: 'Can only add extra shifts to rentals that are out or returned' }, { status: 400 });
    }

    // Calculate extra shift charges
    const extraShiftTotal = extraShifts * extraShiftRate;

    // Calculate new tax amount (tax on extra shift charges)
    const newBaseAmount = rental.baseAmount + extraShiftTotal;
    const newTaxAmount = newBaseAmount * rental.taxRate;

    // Update the rental with extra shift data
    const updatedRental = await base44.entities.Rental.update(rentalId, {
      extraShifts: extraShifts,
      extraShiftRate: extraShiftRate,
      extraShiftTotal: extraShiftTotal,
      baseAmount: newBaseAmount,
      taxAmount: newTaxAmount,
      statusHistory: [
        ...(rental.statusHistory || []),
        {
          status: 'extra_shift_added',
          changedAt: new Date().toISOString(),
          changedBy: user.email,
          note: `Added ${extraShifts} extra shift(s) at $${extraShiftRate}/day = $${extraShiftTotal}`
        }
      ]
    });

    return Response.json({
      success: true,
      rental: updatedRental,
      extraShifts,
      extraShiftRate,
      extraShiftTotal,
      newBaseAmount,
      newTaxAmount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});