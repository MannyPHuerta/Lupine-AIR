import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import moment from 'npm:moment';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active recurring rentals due for generation
    const today = moment().format('YYYY-MM-DD');
    const recurringRentals = await base44.entities.RecurringRental.filter({
      status: 'active',
      nextOccurrenceDate: { $lte: today }
    });

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      rentals: []
    };

    for (const recurring of recurringRentals) {
      results.processed++;
      
      try {
        // Check if end date has passed
        if (recurring.endDate && moment(recurring.endDate).isBefore(today)) {
          await base44.entities.RecurringRental.update(recurring.id, {
            status: 'completed'
          });
          results.success++;
          continue;
        }

        // Check if max occurrences reached
        if (recurring.totalOccurrences && recurring.generatedCount >= recurring.totalOccurrences) {
          await base44.entities.RecurringRental.update(recurring.id, {
            status: 'completed'
          });
          results.success++;
          continue;
        }

        // Calculate rental dates
        const startDate = moment(recurring.nextOccurrenceDate);
        const endDate = startDate.clone().add(recurring.rentalDays - 1, 'days');

        // Calculate pricing
        let baseAmount = 0;
        for (const item of recurring.lineItems) {
          const rate = item.monthlyRate || item.weeklyRate || item.dailyRate || 0;
          baseAmount += rate * item.quantity;
        }

        // Create rental record
        const rentalData = {
          equipmentId: recurring.lineItems[0]?.equipmentId || '',
          equipmentName: recurring.lineItems[0]?.equipmentName || '',
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          customerId: recurring.customerId,
          customerName: recurring.customerName,
          customerEmail: recurring.customerEmail,
          customerPhone: recurring.customerPhone,
          customerAddress: recurring.customerAddress,
          customerCity: recurring.customerCity,
          customerState: recurring.customerState,
          customerZip: recurring.customerZip,
          branch: recurring.branch,
          sourceBranch: recurring.branch,
          isCrossBranch: false,
          totalDays: recurring.rentalDays,
          baseAmount: baseAmount,
          taxRate: 0.0825,
          taxAmount: baseAmount * 0.0825,
          deposit: 0,
          deliveryFee: 0,
          returnFee: 0,
          amountPaid: 0,
          status: recurring.autoConfirm ? 'contract' : 'quote',
          deliveryMethod: recurring.deliveryMethod,
          returnMethod: recurring.returnMethod,
          notes: recurring.notes ? `Recurring rental (auto-generated): ${recurring.notes}` : 'Recurring rental (auto-generated)',
          isMajorJob: false
        };

        const createdRental = await base44.entities.Rental.create(rentalData);

        // Calculate next occurrence
        let nextDate;
        switch (recurring.frequency) {
          case 'weekly':
            nextDate = startDate.clone().add(7, 'days');
            break;
          case 'biweekly':
            nextDate = startDate.clone().add(14, 'days');
            break;
          case 'monthly':
            nextDate = startDate.clone().add(1, 'month');
            break;
          case 'quarterly':
            nextDate = startDate.clone().add(3, 'months');
            break;
          case 'yearly':
            nextDate = startDate.clone().add(1, 'year');
            break;
          default:
            nextDate = startDate.clone().add(7, 'days');
        }

        // Update recurring rental
        await base44.entities.RecurringRental.update(recurring.id, {
          nextOccurrenceDate: nextDate.format('YYYY-MM-DD'),
          generatedCount: recurring.generatedCount + 1,
          lastGeneratedDate: today,
          lastGeneratedRentalId: createdRental.id
        });

        // Send notification if not auto-confirm
        if (!recurring.autoConfirm && recurring.customerEmail) {
          try {
            await base44.functions.invoke('sendNotifications', {
              type: 'recurring_rental_generated',
              rentalId: createdRental.id,
              customerEmail: recurring.customerEmail,
              customerPhone: recurring.customerPhone,
              staffEmail: user.email
            });
          } catch (notifyErr) {
            console.log('Notification failed:', notifyErr.message);
          }
        }

        results.success++;
        results.rentals.push({
          recurringId: recurring.id,
          rentalId: createdRental.id,
          customerName: recurring.customerName,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        });

      } catch (err) {
        results.failed++;
        console.error(`Failed to process recurring rental ${recurring.id}:`, err.message);
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});