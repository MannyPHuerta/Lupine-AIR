/**
 * Real-time availability engine for equipment rental
 * Checks availability across dates, branches, and buffer times
 * Never auto-flips to "available" — only human action marks Ready
 */

export const UNIT_STATUSES = {
  available: { label: '✅ Available', color: 'text-green-600' },
  reserved: { label: '📋 Reserved', color: 'text-blue-600' },
  out_on_rental: { label: '🚚 Out on Rental', color: 'text-yellow-600' },
  in_shop: { label: '🔧 In Shop', color: 'text-red-600' },
  awaiting_parts: { label: '⏳ Awaiting Parts', color: 'text-orange-600' },
  in_laundry: { label: '🧺 In Laundry', color: 'text-purple-600' },
  under_inspection: { label: '🔍 Under Inspection', color: 'text-gray-600' },
  retired: { label: '❌ Retired', color: 'text-gray-400' },
};

/**
 * Check if a single equipment unit is available for a date range
 * @param {Object} equipment - Equipment record
 * @param {Date} startDate - Rental start date
 * @param {Date} endDate - Rental end date
 * @param {Array} rentals - Active/reserved rental records
 * @param {String} excludeRentalId - Rental ID to exclude (e.g., current rental being edited)
 * @returns {Object} { available: bool, reason: string }
 */
export function isUnitAvailable(equipment, startDate, endDate, rentals = [], excludeRentalId = null) {
  // Check unit status
  if (equipment.unitStatus === 'retired') {
    return { available: false, reason: 'Unit is retired' };
  }

  if (!['available', 'reserved'].includes(equipment.unitStatus)) {
    return { available: false, reason: `Unit status: ${equipment.unitStatus}` };
  }

  // Check for conflicts with other rentals (including buffer days)
  const rentalStart = new Date(startDate);
  const rentalEnd = new Date(endDate);
  const bufferDays = equipment.bufferDays || 0;

  for (const rental of rentals) {
    // Skip excluded rental
    if (rental.id === excludeRentalId) continue;

    // Only check active/reserved rentals
    if (!['out_on_rental', 'reserved', 'contract'].includes(rental.status)) continue;

    const existingStart = new Date(rental.startDate);
    const existingEnd = new Date(rental.endDate);

    // Apply buffer after existing rental
    const existingEndWithBuffer = new Date(existingEnd);
    existingEndWithBuffer.setDate(existingEndWithBuffer.getDate() + bufferDays);

    // Check overlap: new rental starts before existing ends (with buffer)
    if (rentalStart <= existingEndWithBuffer && rentalEnd >= existingStart) {
      return {
        available: false,
        reason: `Conflict with rental ${rental.invoiceNumber || rental.id} (${rental.startDate} to ${rental.endDate}${bufferDays ? ` + ${bufferDays}d buffer` : ''})`,
      };
    }
  }

  return { available: true, reason: null };
}

/**
 * Get availability summary for an equipment item across all units
 * If serialized, returns available units. If bulk, returns available qty.
 * @param {Object} equipment - Equipment record (parent)
 * @param {Array} units - All individual units for this equipment (if serialized)
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Array} rentals - Active rentals
 * @param {String} branch - Filter by branch (optional)
 * @returns {Object} { total: number, available: number, reserved: number, out: number, partial: bool }
 */
export function getEquipmentAvailability(equipment, units = [], startDate, endDate, rentals = [], branch = null) {
  if (equipment.serialized && units.length > 0) {
    // Track individual units
    const validUnits = branch ? units.filter(u => u.location === branch) : units;
    const total = validUnits.length;
    let available = 0;
    let reserved = 0;
    let out = 0;

    for (const unit of validUnits) {
      const check = isUnitAvailable(unit, startDate, endDate, rentals);
      if (unit.unitStatus === 'available' && check.available) available++;
      else if (unit.unitStatus === 'reserved') reserved++;
      else out++;
    }

    const partial = available > 0 && available < total;
    return { total, available, reserved, out, partial };
  } else {
    // Bulk item: just return bulkQuantity as available (simplified)
    // In production, you'd track qty used in active rentals
    const total = equipment.bulkQuantity || 1;
    const available = total; // Simplified — would need rental tracking
    return { total, available, reserved: 0, out: 0, partial: false };
  }
}

/**
 * Check if overbooking is allowed and calculate if we can exceed available
 * @param {Object} equipment - Equipment record
 * @param {Number} currentAvailable - Units/qty currently available
 * @param {Number} requestedQty - Quantity being requested
 * @returns {Object} { allowed: bool, reason: string, canOverbook: number }
 */
export function checkOverbooking(equipment, currentAvailable, requestedQty) {
  if (currentAvailable >= requestedQty) {
    return { allowed: true, reason: 'Sufficient inventory', canOverbook: 0 };
  }

  if (!equipment.allowOverbook) {
    return { allowed: false, reason: 'Overbooking disabled for this item', canOverbook: 0 };
  }

  const shortage = requestedQty - currentAvailable;
  const maxOverbookQty = Math.floor((equipment.bulkQuantity || 1) * ((equipment.maxOverbookPercent || 0) / 100));

  if (shortage <= maxOverbookQty) {
    return { allowed: true, reason: `Overbooking allowed (${shortage} of ${maxOverbookQty} max)`, canOverbook: shortage };
  }

  return {
    allowed: false,
    reason: `Would exceed overbooking limit (need ${shortage}, max ${maxOverbookQty})`,
    canOverbook: 0,
  };
}

/**
 * Get cross-branch availability for a piece of equipment
 * @param {Array} allEquipment - All units of this equipment across branches
 * @param {String} equipmentId - Equipment ID
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Array} rentals - Active rentals
 * @returns {Array} [{ branch, available, total, reserved, out }, ...]
 */
export function getCrossBranchAvailability(allEquipment, equipmentId, startDate, endDate, rentals = []) {
  const branches = [...new Set(allEquipment.filter(u => u.equipmentId === equipmentId).map(u => u.location))].sort();

  return branches.map(branch => {
    const branchUnits = allEquipment.filter(u => u.equipmentId === equipmentId && u.location === branch);
    const availability = getEquipmentAvailability(
      { serialized: true, bufferDays: 0 },
      branchUnits,
      startDate,
      endDate,
      rentals
    );
    return { branch, ...availability };
  });
}

/**
 * Calculate availability color status
 * 🟢 Green: All available
 * 🟡 Yellow: Partial
 * 🔴 Red: None available
 * 🔵 Blue: In cleaning/laundry, ETA before event
 * ⚠️ Orange: In shop, awaiting repair
 */
export function getAvailabilityColor(availability) {
  const { total, available, out } = availability;

  if (available === total) return 'green'; // All available
  if (available > 0) return 'yellow'; // Some available
  if (out === total) return 'red'; // None available
  return 'gray';
}