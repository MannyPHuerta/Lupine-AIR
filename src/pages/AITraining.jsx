import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Send, Pencil, Check, X, Loader2, BookOpen, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function askAssistant(question, history) {
  const res = await base44.functions.invoke('askAIAssistant', { question, conversationHistory: history });
  return res.data?.answer || '';
}

async function polishAndSave(rawCorrection, originalQuestion, originalAnswer) {
  // Use LLM to rewrite the correction into clean, AI-like prose, then save it
  const polished = await base44.integrations.Core.InvokeLLM({
    prompt: `You are editing a knowledge base for a rental equipment management platform called AIRental.

A user asked: "${originalQuestion}"
The AI answered: "${originalAnswer}"
The user's correction / additional information: "${rawCorrection}"

Rewrite the user's correction as a clear, complete, professional answer in 2–4 concise paragraphs. 
Write it as if you are the AI assistant explaining this to a staff member. Use plain prose — no bullet points or headers needed unless the content really calls for it. Be specific and accurate based on what the user told you.`,
  });

  const finalText = polished?.data || polished || rawCorrection;

  // Save as a PlatformFeature record (free-text style — module=Training, featureName=question)
  await base44.entities.PlatformFeature.create({
    module: 'Training',
    featureName: originalQuestion.slice(0, 80),
    description: finalText,
    workflow: [],
    commonQuestions: [{ question: originalQuestion, answer: finalText }],
    isActive: true,
  });

  return finalText;
}

// ── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, onTeach }) {
  const [teaching, setTeaching] = useState(false);
  const [correction, setCorrection] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);

  const handleTeach = () => {
    setTeaching(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    if (!correction.trim()) return;
    setSaving(true);
    await onTeach(correction);
    setSaving(false);
    setSaved(true);
    setTeaching(false);
    setCorrection('');
  };

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] text-sm">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-[85%]">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="bg-slate-800 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-white/90 whitespace-pre-wrap flex-1">
          {msg.content}
        </div>
      </div>

      {/* Teach button row */}
      {!saved && !teaching && (
        <div className="ml-9">
          <button
            onClick={handleTeach}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition"
          >
            <Pencil className="w-3 h-3" /> Teach a better answer
          </button>
        </div>
      )}

      {saved && (
        <div className="ml-9 flex items-center gap-1.5 text-xs text-green-400">
          <Check className="w-3 h-3" /> Saved to knowledge base
        </div>
      )}

      {teaching && (
        <div className="ml-9 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
          <div className="text-xs text-amber-400 font-medium mb-1">✏️ Type the correct / complete answer in plain English:</div>
          <textarea
            ref={textareaRef}
            value={correction}
            onChange={e => setCorrection(e.target.value)}
            rows={4}
            placeholder="e.g. The sidebar has these sections: Daily Ops, Counter, Dispatch, AI Reports, Manager, Settings. Each section contains sub-pages for..."
            className="w-full bg-slate-900 border border-white/20 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-amber-500/60 placeholder-white/20"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !correction.trim()}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-semibold text-xs px-3 py-1.5 rounded-lg transition"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {saving ? 'Saving…' : 'Save & Polish'}
            </button>
            <button
              onClick={() => { setTeaching(false); setCorrection(''); }}
              className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 transition"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Knowledge base panel ─────────────────────────────────────────────────────

function KnowledgePanel({ refresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.PlatformFeature.filter({ module: 'Training' });
    setItems(all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const handleDelete = async (id) => {
    await base44.entities.PlatformFeature.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          Saved Knowledge ({items.length} entries)
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t border-white/10 divide-y divide-white/5 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-sm">No saved entries yet — start a conversation and teach the AI!</div>
          ) : items.map(item => (
            <div key={item.id} className="px-4 py-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-indigo-400 font-medium mb-1 truncate">Q: {item.featureName}</div>
                  <div className="text-xs text-white/60 line-clamp-2">{item.description}</div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AITraining() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! Ask me anything about the platform and I'll answer. If my answer is incomplete or wrong, hit \"Teach a better answer\" and type the correct information — I'll polish it and add it to my knowledge base." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [refreshKB, setRefreshKB] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const answer = await askAssistant(q, history);
    const assistantMsg = { role: 'assistant', content: answer, question: q };
    setMessages(prev => [...prev, assistantMsg]);
    setHistory(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: answer }].slice(-12));
    setLoading(false);
  };

  const handleTeach = async (msgIndex, correction) => {
    const msg = messages[msgIndex];
    // Find the preceding user question
    const question = msg.question || messages.slice(0, msgIndex).reverse().find(m => m.role === 'user')?.content || 'General question';
    await polishAndSave(correction, question, msg.content);
    setRefreshKB(r => r + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <AppPageHeader
        title="Train AI Assistant"
        subtitle="Ask questions, then correct incomplete answers to build the knowledge base"
        icon={Bot}
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        {/* Knowledge base panel */}
        <KnowledgePanel refresh={refreshKB} />

        {/* Chat window */}
        <div className="flex-1 bg-slate-900 border border-white/10 rounded-xl flex flex-col overflow-hidden" style={{ minHeight: '60vh' }}>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                onTeach={(correction) => handleTeach(i, correction)}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-white/30 text-sm ml-9">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-white/10 p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask anything about the platform…"
              className="flex-1 bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/60 placeholder-white/20"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}