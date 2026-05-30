import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active platform features as dynamic knowledge
    const features = await base44.entities.PlatformFeature.filter({ isActive: true });

    // Build dynamic knowledge base from entity records
    const knowledgeBase = features.map(f => ({
      module: f.module,
      featureName: f.featureName,
      description: f.description,
      workflow: f.workflow || [],
      requiresCustomer: f.requiresCustomer || false,
      requiresSignature: f.requiresSignature || false,
      requiresPayment: f.requiresPayment || false,
      commonQuestions: f.commonQuestions || []
    }));

    return Response.json({ knowledgeBase });
  } catch (error) {
    console.error('getPlatformKnowledge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});