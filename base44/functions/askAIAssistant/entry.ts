import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, conversationHistory = [] } = await req.json();

    if (!question || question.trim().length === 0) {
      return Response.json({ error: 'Question required' }, { status: 400 });
    }

    // Fetch dynamic platform knowledge from entity
    const knowledgeRes = await base44.functions.invoke('getPlatformKnowledge', {});
    const knowledgeBase = knowledgeRes.data?.knowledgeBase || [];

    // Build dynamic system prompt from entity data
    const DYNAMIC_KNOWLEDGE = knowledgeBase.map(f => `
**${f.module} - ${f.featureName}**
${f.description}
Workflow: ${f.workflow.join(' → ')}
Requires Customer: ${f.requiresCustomer ? 'Yes' : 'No'}
Requires Signature: ${f.requiresSignature ? 'Yes' : 'No'}
${f.commonQuestions.length > 0 ? 'FAQ:\n' + f.commonQuestions.map(qa => `  Q: "${qa.question}"\n  A: "${qa.answer}"`).join('\n') : ''}
`).join('\n\n');

    const SYSTEM_PROMPT = `You are the AIRental Platform Assistant — an expert on the AIRental equipment rental management software. Your job is to help users learn how to use the platform effectively.

DYNAMIC PLATFORM KNOWLEDGE (from PlatformFeature entity - ALWAYS PRIORITIZE THIS):
${DYNAMIC_KNOWLEDGE}

RESPONSE STYLE:
- Be concise and actionable
- Use step-by-step instructions for workflows
- Reference specific page names and button labels
- If a feature requires admin access, mention it
- If something isn't available, say so honestly
- Keep answers under 150 words unless complex workflow
- Use formatting (bold, lists) for readability`;

    // Build conversation context with system prompt
    const fullPrompt = `${SYSTEM_PROMPT}

=== CONVERSATION HISTORY ===
${conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

=== CURRENT QUESTION ===
${question}`;

    // Call LLM via Core integration with full context
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      model: 'automatic',
    });

    return Response.json({ 
      answer: response.data || response,
      conversationHistory: [
        ...conversationHistory.slice(-6),
        { role: 'user', content: question },
        { role: 'assistant', content: response.data || response }
      ]
    });
  } catch (error) {
    console.error('askAIAssistant error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});