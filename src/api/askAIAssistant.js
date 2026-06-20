/* global process */
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { question, conversationHistory = [] } = req.body || {};
    if (!question?.trim()) return res.status(400).json({ error: 'Question required' });

    const sb = getSupabase();

    // Fetch active platform knowledge from Supabase
    const { data: features } = await sb
      .from('platform_features')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(200);

    const knowledgeSections = (features || []).map(f => {
      const faq = (f.common_questions || [])
        .map(qa => `  Q: "${qa.question}"\n  A: "${qa.answer}"`)
        .join('\n');
      return `**${f.module || 'General'} — ${f.feature_name || f.featureName}**\n${f.description}\n${faq}`;
    }).join('\n\n');

    const systemPrompt = `You are the AIR Platform Assistant — an expert on the AIR (Artificial Intelligence Rentals) equipment rental management platform built by Lupine.

Your job is to help users learn how to use the platform effectively.

${knowledgeSections ? `PLATFORM KNOWLEDGE BASE (always prioritize this):\n${knowledgeSections}` : ''}

RESPONSE STYLE:
- Be concise and actionable
- Use step-by-step instructions for workflows
- Reference specific page names and button labels
- If a feature requires admin access, mention it
- If something isn't available, say so honestly
- Keep answers under 200 words unless a complex workflow requires more
- Use formatting (bold, lists) for readability`;

    const fullPrompt = `${systemPrompt}

=== CONVERSATION HISTORY ===
${conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

=== CURRENT QUESTION ===
${question}`;

    // Call OpenAI via fetch
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      // Fallback: return a helpful static answer if no OpenAI key
      console.warn('[askAIAssistant] OpenAI error:', err);
      return res.json({
        answer: `I'm the AIR Platform Assistant. My AI connection isn't configured yet (missing OPENAI_API_KEY), but I can see ${(features || []).length} knowledge entries in my knowledge base. Please configure the OpenAI API key in Vercel environment variables.`,
      });
    }

    const aiData = await openaiRes.json();
    const answer = aiData.choices?.[0]?.message?.content || 'No response generated.';

    return res.json({ answer });
  } catch (err) {
    console.error('[askAIAssistant] error:', err);
    return res.status(500).json({ error: err.message });
  }
}