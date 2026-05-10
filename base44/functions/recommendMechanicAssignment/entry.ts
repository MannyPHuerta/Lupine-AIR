import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workOrderId } = await req.json();

    const [wo, mechanics, workOrders] = await Promise.all([
      base44.entities.WorkOrder.filter({ id: workOrderId }),
      base44.entities.MechanicProfile.filter({ isActive: true }),
      base44.entities.WorkOrder.list('-createdAt', 500),
    ]);

    if (!wo || wo.length === 0) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const workOrder = wo[0];
    const equipmentName = workOrder.equipmentName || '';
    const equipmentCategory = workOrder.type || '';

    // Score each mechanic
    const scored = mechanics.map(mech => {
      // Skills match: does mechanic have a skill matching this equipment?
      const hasSkill = (mech.skills || []).some(skill => {
        const skillLower = skill.toLowerCase();
        const catLower = equipmentCategory.toLowerCase();
        const nameLower = equipmentName.toLowerCase();
        return catLower.includes(skillLower) || skillLower.includes(catLower) || 
               nameLower.includes(skillLower) || skillLower.includes(nameLower);
      });
      const skillScore = hasSkill ? 30 : 5; // Strong bonus for skill match, small credit for any match

      // Workload: current job count vs max concurrent jobs
      const currentJobs = workOrders.filter(w => w.assignedTo === mech.email && 
        ['scheduled', 'in_progress', 'awaiting_parts'].includes(w.status)).length;
      const workloadScore = Math.max(0, 20 - (currentJobs * 5)); // Penalize busy mechanics

      // Branch match
      const branchScore = mech.branch === workOrder.branch ? 15 : 0;

      // Certification bonus: more certs = more experienced
      const certScore = Math.min((mech.certifications || []).length * 3, 20);

      // Availability check
      const available = currentJobs < (mech.maxConcurrentJobs || 2);

      const totalScore = skillScore + workloadScore + branchScore + certScore;

      return {
        mechanicId: mech.id,
        email: mech.email,
        name: mech.fullName,
        totalScore,
        available,
        skillMatch: hasSkill,
        currentJobs,
        maxJobs: mech.maxConcurrentJobs || 2,
        skills: mech.skills || [],
        certifications: mech.certifications || [],
      };
    }).sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return b.totalScore - a.totalScore;
    });

    return Response.json({
      workOrderId,
      recommendations: scored.slice(0, 5),
      topRecommendation: scored[0] || null,
    });
  } catch (error) {
    console.error('Error in recommendMechanicAssignment:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});