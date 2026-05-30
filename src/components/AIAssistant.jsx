import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, MessageCircle, Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIAssistant({ onClose }) {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hi! I'm your AIRental assistant. I can help you with:\n\n• Creating rentals and quotes\n• Managing deliveries and drivers\n• Equipment pricing and availability\n• Shop maintenance and parts\n• AI recovery and GPS tracking\n• Accounting and reporting\n• Any other feature questions\n\nWhat would you like to know?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('askAIAssistant', {
        question: userMessage,
        conversationHistory,
      });

      if (res.data?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${res.data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
        setConversationHistory(res.data.conversationHistory || []);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      <div className="bg-white w-[380px] h-[550px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
              <div className="font-semibold">AIRental Assistant</div>
              <div className="text-xs text-indigo-200">AI-powered onboarding & support</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-700 rounded-lg transition" title="Close assistant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-100' : 'bg-indigo-600'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-md' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Assistant is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-3 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything about AIRental..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={loading || !input.trim()}
              className="rounded-full px-4 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}