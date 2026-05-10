import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const {
      equipmentId,
      equipmentName,
      equipmentCategory,
      purchaseCost,
      dailyRate,
      currentCondition,
      maintenanceType,
      rentalHistory = [],
    } = payload;

    // Calculate equipment business metrics
    const monthlyRevenue = (dailyRate || 0) * 30;
    const annualRevenue = monthlyRevenue * 12;
    const depreciationYears = 5;
    const residualValue = (purchaseCost || 0) * 0.2;
    const totalDepreciation = Math.max(0, (purchaseCost || 0) - residualValue);
    const yearlyDepreciation = totalDepreciation / depreciationYears;

    // Analyze rental utilization (from last 20 rentals)
    const totalRentalDays = rentalHistory.reduce((sum, r) => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);
    const avgRentalValue = rentalHistory.reduce((sum, r) => sum + (r.baseAmount || 0), 0) / Math.max(1, rentalHistory.length);
    const utilizationScore = Math.min(100, (totalRentalDays / 60) * 100); // Assume 60 days is 100% util

    // Determine success probability based on equipment condition and type
    const conditionScores = {
      'New': 95,
      'Good': 85,
      'Fair': 60,
      'Needs Repair': 40,
      'Retired': 5,
    };
    const baseSuccessProbability = conditionScores[currentCondition] || 50;

    // Type-specific adjustments
    let successBoost = 0;
    if (maintenanceType === 'preventive') successBoost = 15;
    if (maintenanceType === 'inspection') successBoost = 5;
    if (maintenanceType === 'cleaning') successBoost = 10;

    const successProbability = Math.min(99, baseSuccessProbability + successBoost);

    // Estimate repair cost (simplified logic)
    const estimatedRepairCostMin = (purchaseCost || 0) * 0.05;
    const estimatedRepairCostMax = (purchaseCost || 0) * 0.15;
    const estimatedRepairCost = (estimatedRepairCostMin + estimatedRepairCostMax) / 2;

    // Calculate break-even and ROI
    const monthsUntilBreakEven = estimatedRepairCost / Math.max(1, monthlyRevenue);
    const estimatedRecovery = Math.round(annualRevenue * (successProbability / 100));
    const roi = Math.round(((estimatedRecovery - estimatedRepairCost) / estimatedRepairCost) * 100);

    // Build narrative responses
    let businessImpact = '';
    if (utilizationScore > 70) {
      businessImpact = `This ${equipmentName} is a high-revenue asset, generating ~$${monthlyRevenue.toFixed(0)}/month. Down time costs money. Repair is strategically important.`;
    } else if (utilizationScore > 40) {
      businessImpact = `Moderate-use asset at $${monthlyRevenue.toFixed(0)}/month revenue. Repair justified if cost-effective and quick turnaround.`;
    } else {
      businessImpact = `Low-utilization asset. Consider repair only if minimal cost or opportunity to increase usage post-repair.`;
    }

    let roiAnalysis = '';
    if (roi > 100) {
      roiAnalysis = `Strong ROI: Repair cost (~$${estimatedRepairCost.toFixed(0)}) recovered in ${monthsUntilBreakEven.toFixed(1)} months. Annual recovery potential: $${estimatedRecovery}.`;
    } else if (roi > 0) {
      roiAnalysis = `Marginal ROI: Repair breaks even in ${monthsUntilBreakEven.toFixed(1)} months. Worth pursuing if you can spare parts/labor.`;
    } else {
      roiAnalysis = `Negative ROI: Repair cost exceeds annual revenue potential. Consider depreciation write-off or sale as scrap.`;
    }

    let riskAssessment = '';
    if (successProbability > 80) {
      riskAssessment = `Low risk: Equipment condition and repair type suggest high success rate (${successProbability}%). Proceed with confidence.`;
    } else if (successProbability > 50) {
      riskAssessment = `Moderate risk: Success probability ${successProbability}%. Have a fallback plan (rental replacement, customer notification).`;
    } else {
      riskAssessment = `High risk: Success probability only ${successProbability}%. Consider major rebuild or replacement instead.`;
    }

    // AI-suggested parts (simplified; in production, integrate with actual parts DB)
    const partsDatabase = {
      'Generator': ['Spark plugs', 'Air filter', 'Oil change kit', 'Carburetor rebuild', 'Voltage regulator'],
      'Excavator': ['Hydraulic fluid', 'Bucket teeth', 'Track pads', 'Swing bearing grease', 'Engine oil'],
      'Forklift': ['Lift cylinder seals', 'Hydraulic hose', 'Forks (replaceable)', 'Battery (if electric)', 'Tire (solid or pneumatic)'],
      'Pressure Washer': ['Pump seal kit', 'Nozzle tips', 'Hose assemblies', 'Engine spark plug', 'Unloader valve'],
      'Other': ['Fasteners', 'Seals & gaskets', 'Lubricants', 'Wear plates'],
    };
    const suggestedParts = partsDatabase[equipmentCategory] || partsDatabase['Other'];
    const recommendedParts = `Common parts for ${equipmentCategory}: ${suggestedParts.slice(0, 3).join(', ')}. Source via suppliers or OEM catalogs.`;

    let recommendation = '';
    if (roi > 50 && successProbability > 70) {
      recommendation = `✓ RECOMMEND REPAIR — High ROI, strong success likelihood. Schedule immediately with qualified technician.`;
    } else if (roi > 0 && successProbability > 60) {
      recommendation = `⚠ CAUTIOUS PROCEED — Marginal ROI. Verify parts availability and technician availability before committing.`;
    } else if (successProbability > 50) {
      recommendation = `⚠ CONSIDER ALTERNATIVES — Lower ROI or moderate success rate. Evaluate rebuild, trade-in, or sale options.`;
    } else {
      recommendation = `✗ NOT RECOMMENDED — Low probability of success or negative ROI. Write off or scrap the asset.`;
    }

    console.log(`✓ Repair intel analyzed for ${equipmentName} (ROI: ${roi}%, Success: ${successProbability}%)`);

    return Response.json({
      businessImpact,
      roiAnalysis,
      riskAssessment,
      recommendedParts,
      recommendation,
      successProbability,
      estimatedRecovery: estimatedRecovery.toFixed(0),
      roi,
      monthsUntilBreakEven: monthsUntilBreakEven.toFixed(1),
      utilizationScore: utilizationScore.toFixed(0),
    });
  } catch (error) {
    console.error('Repair intel analysis failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});