import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Sparkles, ArrowRight, Star, CheckCircle2, Tent, Music, Cake, Building2, Globe, Zap } from 'lucide-react';
import CustomerWizard from '@/components/canvas/CustomerWizard';
import { base44 } from '@/api/base44Client';

const EVENT_TYPES = [
  { emoji: '🎂', label: 'Birthday', value: 'birthday' },
  { emoji: '👰', label: 'Wedding', value: 'wedding' },
  { emoji: '💃', label: 'Quinceañera', value: 'quinceañera' },
  { emoji: '🏢', label: 'Corporate', value: 'corporate' },
  { emoji: '🎪', label: 'Festival', value: 'festival' },
  { emoji: '🏛️', label: 'Municipal', value: 'municipal' },
];

const FEATURES = [
  { icon: Sparkles, label: 'AI Layout Generator', desc: 'Tell us your event — our AI suggests the perfect equipment setup instantly.' },
  { icon: Users, label: 'Built for Any Scale', desc: 'From 20-person birthdays to 5,000-person festivals, we have you covered.' },
  { icon: Calendar, label: 'Instant Quote', desc: 'Get a real-time equipment quote before you ever talk to anyone.' },
  { icon: CheckCircle2, label: 'No Commitment', desc: "Plans are free to explore. Only pay when you're ready to book." },
];

export default function AIREvents() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [loadingEquip, setLoadingEquip] = useState(false);

  const openWizard = async () => {
    if (equipment.length === 0) {
      setLoadingEquip(true);
      const eq = await base44.entities.Equipment.list('-name', 2000).catch(() => []);
      setEquipment(eq);
      setLoadingEquip(false);
    }
    setShowWizard(true);
  };

  const handleWizardComplete = async (wizardData) => {
    // Save the plan and navigate to the canvas
    const plan = await base44.entities.EventPlan.create({
      ...wizardData,
      ownerRole: 'customer',
      status: 'customer_review',
      quotedTotal: (wizardData.canvasItems || []).reduce((s, i) => s + (i.dailyRate || 0) * (i.quantity || 1), 0),
    }).catch(() => null);
    setShowWizard(false);
    if (plan?.id) {
      navigate(`/event-planner/${plan.id}`);
    } else {
      navigate('/event-planner');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100/60 via-purple-50/40 to-amber-100/60 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-purple-200 rounded-full px-4 py-1.5 text-sm text-purple-700 font-medium mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Event Planning
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-4">
            Plan your perfect event.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
              In minutes, not days.
            </span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Tell us about your event and our AI instantly suggests the right tents, tables, chairs, and more — with a real quote, ready to book.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={openWizard}
              disabled={loadingEquip}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-purple-200 transition disabled:opacity-60"
            >
              {loadingEquip
                ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Loading…</>
                : <><Sparkles className="w-5 h-5" /> Start Planning — It's Free</>
              }
            </button>
            <button
              onClick={() => navigate('/event-planner')}
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-lg px-8 py-4 rounded-2xl transition"
            >
              Open Canvas <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-4">No account required to explore. Save your plan when you're ready.</p>
        </div>
      </div>

      {/* Event type tiles */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">We plan for every occasion</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {EVENT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={openWizard}
              className="flex flex-col items-center gap-2 bg-white hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-2xl py-4 px-2 transition shadow-sm group"
            >
              <span className="text-3xl">{t.emoji}</span>
              <span className="text-xs font-semibold text-gray-600 group-hover:text-purple-700 transition">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-2">How it works</h2>
          <p className="text-center text-gray-400 mb-12">Three steps to your event quote</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', emoji: '📋', title: 'Tell us about your event', desc: 'Event type, guest count, date, and venue size. Takes 2 minutes.' },
              { step: '2', emoji: '🤖', title: 'AI builds your layout', desc: 'We suggest the right equipment, quantities, and estimated costs.' },
              { step: '3', emoji: '📞', title: 'We confirm & deliver', desc: 'Our team reviews your plan, finalizes pricing, and schedules delivery.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                  {item.emoji}
                </div>
                <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Step {item.step}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{f.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 py-16 text-center">
        <h2 className="text-3xl font-black text-white mb-3">Ready to get started?</h2>
        <p className="text-white/70 text-lg mb-8">It's free to plan. No account needed to explore.</p>
        <button
          onClick={openWizard}
          disabled={loadingEquip}
          className="inline-flex items-center gap-2.5 bg-white text-purple-700 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:bg-purple-50 transition disabled:opacity-60"
        >
          <Sparkles className="w-5 h-5" /> Plan My Event
        </button>
      </div>

      {/* Wizard modal */}
      {showWizard && (
        <CustomerWizard
          equipment={equipment}
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}