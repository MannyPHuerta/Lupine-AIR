/**
 * Depreciation calculation utilities
 */

export function calculateDepreciation(equipment, asOfDate = new Date()) {
  if (!equipment.purchaseCost || !equipment.usefulLifeYears) {
    return null;
  }

  const costBasis = equipment.purchaseCost;
  const salvage = equipment.salvageValue || 0;
  const usefulYears = equipment.usefulLifeYears;
  const startDate = new Date(equipment.depreciationStartDate || equipment.purchaseDate);
  const today = new Date(asOfDate);

  // Calculate months elapsed
  const monthsElapsed = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
  const yearsElapsed = monthsElapsed / 12;

  // Prevent depreciation beyond useful life
  const yearsDepreciated = Math.min(yearsElapsed, usefulYears);

  let bookValue, totalDepreciation;

  if (equipment.depreciationMethod === 'declining_balance') {
    // Double declining balance (200% declining)
    const rate = (2 / usefulYears);
    let value = costBasis;
    for (let i = 0; i < Math.floor(yearsDepreciated); i++) {
      value *= (1 - rate);
    }
    // Handle partial year
    const partialYear = yearsDepreciated - Math.floor(yearsDepreciated);
    value *= Math.pow(1 - rate, partialYear);
    bookValue = Math.max(value, salvage);
    totalDepreciation = costBasis - bookValue;
  } else {
    // Straight-line (default)
    const annualDepreciation = (costBasis - salvage) / usefulYears;
    totalDepreciation = annualDepreciation * yearsDepreciated;
    bookValue = Math.max(costBasis - totalDepreciation, salvage);
  }

  return {
    costBasis,
    salvageValue: salvage,
    usefulYears,
    yearsElapsed: parseFloat(yearsElapsed.toFixed(2)),
    depreciationMethod: equipment.depreciationMethod || 'straight_line',
    totalDepreciation: parseFloat(totalDepreciation.toFixed(2)),
    bookValue: parseFloat(bookValue.toFixed(2)),
    depreciationPercentage: parseFloat(((totalDepreciation / costBasis) * 100).toFixed(1)),
    isFullyDepreciated: yearsDepreciated >= usefulYears,
  };
}

export function calculateAnnualDepreciation(costBasis, salvage, usefulYears, method = 'straight_line') {
  if (method === 'declining_balance') {
    return parseFloat(((costBasis * 2) / usefulYears).toFixed(2));
  }
  return parseFloat(((costBasis - salvage) / usefulYears).toFixed(2));
}