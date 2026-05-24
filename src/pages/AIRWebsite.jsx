import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Zap, BarChart3, MapPin, Clock, Users, Calendar, FileText,
  DollarSign, CheckCircle, ChevronRight, ArrowRight, Menu, X,
  Truck, Shield, Brain, Star, Play, Building2, TrendingUp, Package, AlertTriangle, Wrench, Route
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

function AnimatedSection({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'} className={className}>
      {children}
    </motion.div>
  );
}

function FadeUp({ children, className = '', delay = 0 }) {
  return (
    <motion.div variants={fadeUp} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────
function Nav({ activeSection }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = [
    { label: 'AIRental', href: '#airental' },
    { label: 'AIREvents', href: '#airevents' },
    { label: 'AIRfq', href: '#airfq' },
    { label: 'AIReports', href: '#aireports' },
    { label: 'AIRepair', href: '#airepair' },
    { label: 'AIRoads', href: '#airoads' },
    { label: 'Platform', href: '#platform' },
    { label: 'Pricing', href: '#pricing' },
  ];
  const scrollTo = (href) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
          <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg" alt="AIR" className="h-8 w-8 rounded-lg" />
          <span className="text-xs text-cyan-400 font-medium tracking-widest uppercase">by Lupine</span>
        </button>
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <button key={l.label} onClick={() => scrollTo(l.href)}
              className="text-sm text-white/70 hover:text-cyan-400 transition font-medium">
              {l.label}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/availability')}
            className="text-sm px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition">
            Launch App →
          </button>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-white p-2">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-black/95 border-t border-white/10 px-4 py-4 space-y-3">
          {links.map(l => (
            <button key={l.label} onClick={() => scrollTo(l.href)} className="block w-full text-left text-white/80 py-2 text-sm font-medium">
              {l.label}
            </button>
          ))}
          <button onClick={() => navigate('/availability')} className="block w-full text-center px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-sm">
            Launch App →
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden pt-16">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 text-sm font-medium">Now in active development — Rental World Equipment</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
          <div className="relative inline-block mb-4">
            <p className="text-blue-300 text-xl md:text-2xl font-light">It's time for a breath of fresh</p>
          </div>
          <motion.div
               animate={{ y: [0, -8, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
               className="flex justify-center pointer-events-none">
               <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden">
                 <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg" alt="AIR" className="w-full h-full rounded-3xl object-cover" />
                 <motion.div
                   className="absolute inset-0 rounded-3xl pointer-events-none"
                   style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }}
                   animate={{ x: ['-150%', '150%'] }}
                   transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                 />
               </div>
             </motion.div>
          <p className="text-lg md:text-xl text-blue-200/70 mt-6 max-w-2xl mx-auto">
            The first rental equipment cloud platform to harness the full power of AI —
            from instant invoices to AI-drafted government bids.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate('/availability')}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-lg transition flex items-center gap-2 justify-center">
            Launch AIRental <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-lg transition border border-white/20">
            Explore the Platform
          </button>
        </motion.div>

        {/* Product icon buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          className="flex flex-wrap justify-center gap-6 pt-4">
          {[
            { icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/68b1feaf4_AIRentalBlack-01.svg', anchor: '#airental' },
            { icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/f62f4b089_AIREvents_black-01.svg', anchor: '#airevents' },
            { icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/f288b892e_AIRfqBlack-01.svg', anchor: '#airfq' },
            { icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/359e95609_AIReportsBlack-01.svg', anchor: '#aireports' },
            { icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/2e3d7b226_AIRepair_png_transparentBlack-01.svg', anchor: '#airepair' },
            { icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/aea5997d3_AIRoads_black.png', anchor: '#airoads' },
          ].map((p, idx) => (
            <button key={idx} onClick={() => document.querySelector(p.anchor)?.scrollIntoView({ behavior: 'smooth' })}
              className="group">
              <img src={p.icon} alt="product"
                className="w-24 h-24 rounded-2xl object-cover shadow-lg group-hover:scale-105 group-hover:shadow-cyan-500/30 transition-all duration-200" />
            </button>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs flex flex-col items-center gap-1">
        <span>scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
      </motion.div>
    </section>
  );
}

// ─── Product Section Template ────────────────────────────────────────────────
function ProductSection({ id, tag, title, tagline, description, color, features, cta, ctaRoute, preview }) {
  const navigate = useNavigate();
  const colorMap = {
    cyan: { pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', accent: 'text-cyan-400', btn: 'bg-cyan-500 hover:bg-cyan-400', card: 'border-cyan-500/20 hover:border-cyan-400/50 bg-cyan-500/5' },
    purple: { pill: 'bg-purple-500/10 text-purple-400 border-purple-500/30', accent: 'text-purple-400', btn: 'bg-purple-500 hover:bg-purple-400', card: 'border-purple-500/20 hover:border-purple-400/50 bg-purple-500/5' },
    blue: { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/30', accent: 'text-blue-400', btn: 'bg-blue-500 hover:bg-blue-400', card: 'border-blue-500/20 hover:border-blue-400/50 bg-blue-500/5' },
    green: { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', accent: 'text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-400', card: 'border-emerald-500/20 hover:border-emerald-400/50 bg-emerald-500/5' },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <section id={id} className="py-24 bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div className="space-y-8">
              <FadeUp>
                <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-sm font-semibold ${c.pill}`}>
                  {tag}
                </div>
              </FadeUp>
              <FadeUp>
                <h2 className="text-5xl md:text-6xl font-black text-white">{title}</h2>
                <p className={`text-xl mt-2 font-medium ${c.accent}`}>{tagline}</p>
              </FadeUp>
              <FadeUp>
                <p className="text-white/60 text-lg leading-relaxed">{description}</p>
              </FadeUp>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((f, i) => (
                  <FadeUp key={i} delay={i * 0.08}>
                    <div className={`rounded-xl p-4 border transition-all ${c.card}`}>
                      <div className={`mb-2 ${c.accent}`}>{f.icon}</div>
                      <div className="font-semibold text-white text-sm">{f.title}</div>
                      <div className="text-white/50 text-xs mt-1">{f.desc}</div>
                    </div>
                  </FadeUp>
                ))}
              </div>
              <FadeUp>
                <button onClick={() => ctaRoute && navigate(ctaRoute)}
                  className={`px-7 py-3.5 rounded-xl font-bold text-black text-sm transition flex items-center gap-2 ${c.btn}`}>
                  {cta} <ArrowRight className="w-4 h-4" />
                </button>
              </FadeUp>
            </div>
            {/* Right: preview panel */}
            <FadeUp className="hidden lg:block">
              {preview}
            </FadeUp>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── AIRental Preview ────────────────────────────────────────────────────────
function AIRentalPreview() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-cyan-500/20 p-6 space-y-4 shadow-2xl shadow-cyan-500/5">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold text-sm">New Rental Invoice</div>
        <div className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">MCL-1042</div>
      </div>
      <div className="bg-slate-800 rounded-lg p-3 space-y-2">
        <div className="text-xs text-white/40 uppercase tracking-wider">Customer</div>
        <div className="font-semibold text-white text-sm">City of McAllen</div>
        <div className="text-xs text-white/50">📞 956-555-0100 · Net 30</div>
      </div>
      <div className="space-y-2">
        {[
          { name: '20x40 Frame Tent', dates: 'Jun 14–17', amt: '$840' },
          { name: '200 White Chairs', dates: 'Jun 14–17', amt: '$280' },
          { name: '20x 6ft Tables', dates: 'Jun 14–17', amt: '$160' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
            <div>
              <div className="text-white text-xs font-medium">{item.name}</div>
              <div className="text-white/40 text-xs">{item.dates}</div>
            </div>
            <div className="text-cyan-400 font-bold text-sm">{item.amt}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-3 space-y-1">
        <div className="flex justify-between text-xs text-white/50"><span>Subtotal</span><span>$1,280.00</span></div>
        <div className="flex justify-between text-xs text-white/50"><span>Tax Exempt</span><span>—</span></div>
        <div className="flex justify-between text-sm font-bold text-white mt-2"><span>Total Due</span><span className="text-cyan-400">$1,280.00</span></div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-slate-700 rounded-lg py-2 text-center text-xs text-white/50">Save Quote</div>
        <div className="flex-1 bg-cyan-500 rounded-lg py-2 text-center text-xs font-bold text-black">🖨 Print & Confirm</div>
      </div>
    </div>
  );
}

// ─── AIREvents Preview ───────────────────────────────────────────────────────
function AIREventsPreview() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-purple-500/20 p-6 space-y-4 shadow-2xl shadow-purple-500/5">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold text-sm">Rodriguez Quinceañera — Canvas</div>
        <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">✓ ADA Clear</div>
      </div>
      {/* Faux canvas */}
      <div className="bg-slate-800 rounded-lg h-48 relative overflow-hidden border border-white/10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Tent */}
        <div className="absolute top-4 left-8 w-32 h-20 border-2 border-purple-400 rounded bg-purple-400/10 flex items-center justify-center">
          <span className="text-purple-300 text-xs font-bold">20x40 Tent</span>
        </div>
        {/* Tables */}
        {[0,1,2].map(i => (
          <div key={i} className="absolute bg-cyan-400/20 border border-cyan-400/40 rounded" style={{ width: 32, height: 16, top: 90 + i * 22, left: 20 + i * 40 }}>
            <span className="text-cyan-300 text-[8px] flex items-center justify-center h-full">TBL</span>
          </div>
        ))}
        {/* Dance floor */}
        <div className="absolute bottom-4 right-6 w-28 h-16 border-2 border-amber-400 rounded bg-amber-400/10 flex items-center justify-center">
          <span className="text-amber-300 text-xs">Dance Floor</span>
        </div>
        {/* ADA path */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-green-400 text-[9px]">— ADA path clear (72") —</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Items', val: '14', color: 'text-purple-400' },
          { label: 'Guests', val: '180', color: 'text-cyan-400' },
          { label: 'Quote', val: '$4,280', color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-lg py-2">
            <div className={`font-bold text-sm ${s.color}`}>{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-300">
        💡 No power source detected — <strong>Generator suggested</strong> for your outdoor setup
      </div>
    </div>
  );
}

// ─── AIRfq Preview ───────────────────────────────────────────────────────────
function AIRfqPreview() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-blue-500/20 p-6 space-y-4 shadow-2xl shadow-blue-500/5">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold text-sm">RFQ-2026-0047 · City of Edinburg</div>
        <div className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">⚠ 2 items need attention</div>
      </div>
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-white/50 mb-1"><span>Bid completion</span><span>5 of 7 sections</span></div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: '71%' }} />
        </div>
      </div>
      {/* Checklist */}
      <div className="space-y-2">
        {[
          { done: true, label: 'Cover letter' },
          { done: true, label: 'Itemized bid — 14 line items matched' },
          { done: true, label: 'Certificate of insurance' },
          { done: true, label: 'Site plan from canvas' },
          { done: true, label: 'ADA compliance report' },
          { done: false, label: 'Fire-rated tent certification', warn: 'Upload required' },
          { done: false, label: 'Municipal references (3 of 3)', warn: 'Only 1 on file' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={item.done ? 'text-green-400' : 'text-amber-400'}>{item.done ? '✓' : '⚠'}</span>
            <span className={item.done ? 'text-white/60' : 'text-white/90'}>{item.label}</span>
            {item.warn && <span className="text-amber-400 text-[10px] ml-auto">{item.warn}</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-slate-700 rounded-lg py-2 text-center text-xs text-white/50">Save Draft</div>
        <div className="flex-1 bg-blue-500/40 rounded-lg py-2 text-center text-xs font-bold text-blue-300 cursor-not-allowed">
          Submit Bid (2 pending)
        </div>
      </div>
    </div>
  );
}

// ─── AIReports Preview ───────────────────────────────────────────────────────
function AIReportsPreview() {
  const bars = [
    { label: 'Generator', val: 82, color: '#22d3ee' },
    { label: 'Tent', val: 67, color: '#a78bfa' },
    { label: 'Chair', val: 54, color: '#34d399' },
    { label: 'Table', val: 48, color: '#fb923c' },
    { label: 'Lift', val: 31, color: '#f472b6' },
  ];
  return (
    <div className="bg-slate-900 rounded-2xl border border-emerald-500/20 p-6 space-y-4 shadow-2xl shadow-emerald-500/5">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold text-sm">Fleet Utilization — May 2026</div>
        <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">📊 Live</div>
      </div>
      <div className="space-y-2.5">
        {bars.map((b, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">{b.label}</span>
              <span className="font-bold" style={{ color: b.color }}>{b.val}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${b.val}%`, backgroundColor: b.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[
          { label: 'Revenue', val: '$48.2k', color: 'text-emerald-400' },
          { label: 'Aging Alert', val: '3 units', color: 'text-amber-400' },
          { label: 'In Shop', val: '2 units', color: 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800 rounded-lg py-2 text-center">
            <div className={`font-bold text-sm ${s.color}`}>{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-300">
        📈 Generator demand up 18% vs last May — consider adding 2 units before summer
      </div>
    </div>
  );
}

// ─── AIRoads Preview ──────────────────────────────────────────────────────────
function AIRoadsPreview() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-indigo-500/20 p-6 space-y-4 shadow-2xl shadow-indigo-500/5">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold text-sm">Load Planner — 3 Trucks</div>
        <div className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">🚚 Active</div>
      </div>
      <div className="space-y-2.5">
        {[
          { name: '18-Wheeler #1', items: 14, weight: '42,500 lbs', vol: '2,100 cu ft', util: 85 },
          { name: '26ft Box #2', items: 8, weight: '18,200 lbs', vol: '840 cu ft', util: 72 },
          { name: 'Sprinter #3', items: 4, weight: '3,800 lbs', vol: '180 cu ft', util: 58 },
        ].map((truck, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white text-xs font-semibold">{truck.name}</span>
              <span className="text-indigo-400 text-xs font-bold">{truck.util}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${truck.util}%` }} />
            </div>
            <div className="text-xs text-white/40">{truck.items} items • {truck.weight} • {truck.vol}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[
          { label: 'Total Cost', val: '$2,450', color: 'text-indigo-400' },
          { label: 'Distance', val: '350 mi', color: 'text-cyan-400' },
          { label: 'Status', val: 'Ready', color: 'text-green-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800 rounded-lg py-2 text-center">
            <div className={`font-bold text-sm ${s.color}`}>{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-indigo-300">
        📍 All trucks optimized — QR codes ready to print for logistics.
      </div>
    </div>
  );
}

// ─── AIRepair Preview ─────────────────────────────────────────────────────────
function AIRepairPreview() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-orange-500/20 p-6 space-y-4 shadow-2xl shadow-orange-500/5">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold text-sm">Work Order Queue</div>
        <div className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">🔧 Active</div>
      </div>
      <div className="space-y-2">
        {[
          { equip: 'Generator (Serial: GEN-4201)', status: 'In Progress', mech: 'Carlos M.', elapsed: '1h 24m' },
          { equip: 'Boom Lift (BL-0847)', status: 'Awaiting Parts', mech: 'Unassigned', elapsed: '—' },
          { equip: 'Air Compressor (AC-0152)', status: 'Scheduled', mech: 'Unassigned', elapsed: '—' },
        ].map((wo, i) => (
          <div key={i} className="bg-slate-800 rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-xs font-medium">{wo.equip}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${wo.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300' : wo.status === 'Awaiting Parts' ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-500/20 text-gray-300'}`}>
                {wo.status}
              </span>
            </div>
            <div className="flex justify-between text-xs text-white/50">
              <span>{wo.mech}</span>
              <span className="font-mono">{wo.elapsed}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[
          { label: 'In Progress', val: '3', color: 'text-blue-400' },
          { label: 'Awaiting Parts', val: '2', color: 'text-orange-400' },
          { label: 'Scheduled', val: '5', color: 'text-gray-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800 rounded-lg py-2 text-center">
            <div className={`font-bold text-sm ${s.color}`}>{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-orange-300">
        🚨 2 units blocked by parts — expedited delivery ETA Friday
      </div>
    </div>
  );
}

// ─── Platform Section ────────────────────────────────────────────────────────
function PlatformSection() {
  const pillars = [
    { icon: <Truck className="w-6 h-6" />, title: 'Field Ops', desc: 'Driver app with delivery manifests, GPS, photo capture, and customer signature — all offline-capable.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Multi-Tenant Security', desc: 'Every subscriber gets a fully isolated environment. RBAC from Platform Admin down to Laundry Staff.' },
    { icon: <Brain className="w-6 h-6" />, title: 'AI Throughout', desc: 'Smart suggestions, bid intelligence, demand forecasting, and damage detection — AI baked in, not bolted on.' },
    { icon: <BarChart3 className="w-6 h-6" />, title: 'Business Intelligence', desc: 'Utilization rates, revenue by branch, equipment ROI, seasonal forecasting — see what CPro never showed you.' },
    { icon: <Building2 className="w-6 h-6" />, title: 'Multi-Branch', desc: 'McAllen, Weslaco, Harlingen, Brownsville — one platform, full cross-branch visibility and transfer logic.' },
    { icon: <DollarSign className="w-6 h-6" />, title: 'QuickBooks Ready', desc: 'Syncs invoices and payments automatically. No migration headache — your history stays in CPro.' },
    { icon: <Users className="w-6 h-6" />, title: 'User Management', desc: 'Invite staff, assign roles, bulk CSV import for employee onboarding — with branch and permission controls.' },
    { icon: <Clock className="w-6 h-6" />, title: 'Time Tracking', desc: 'Clock in/out with QR codes, job context capture, timesheet approval workflows, and payroll export.' },
    { icon: <Wrench className="w-6 h-6" />, title: 'Shop Management', desc: 'Work order queue, mechanic skill-based assignment, parts procurement, and repair cost tracking.' },
    { icon: <Route className="w-6 h-6" />, title: 'GPS Integration', desc: 'Samsara, CalAmp, Verizon Connect — real-time tracking, geofence breach alerts, and theft recovery support.' },
  ];
  return (
    <section id="platform" className="py-24 bg-gradient-to-b from-black to-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <FadeUp className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium text-white/60 mb-4">
              The AIR Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white">Built for the whole operation</h2>
            <p className="text-white/50 mt-4 text-lg max-w-2xl mx-auto">
              From the counter to the field, from a quinceañera to a city contract — one platform connects it all.
            </p>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pillars.map((p, i) => (
              <FadeUp key={i} delay={i * 0.07}>
                <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-6 transition-all group">
                  <div className="text-cyan-400 mb-3 group-hover:scale-110 transition-transform inline-block">{p.icon}</div>
                  <h3 className="font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── Testimonial / Quote ─────────────────────────────────────────────────────
function QuoteSection() {
  return (
    <section className="py-20 bg-slate-950 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <AnimatedSection>
          <FadeUp>
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
            </div>
            <blockquote className="text-2xl md:text-3xl font-light text-white/80 italic leading-relaxed mb-8">
              "Before AIRental, invoicing a tent job took 20 minutes and two people. 
              Now one counter person does it in under 3 — with delivery fees, discounts, and a printed contract."
            </blockquote>
            <div className="text-white/40 text-sm">Rental World Equipment · McAllen, TX · Pilot Customer</div>
          </FadeUp>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
function PricingSection() {
  const tiers = [
    {
      name: 'Core',
      price: '$199',
      per: '/mo · single branch',
      desc: 'Everything a single-branch operator needs to replace legacy software and go live fast.',
      badge: null,
      compare: 'EZRentOut charges $399 for fewer features.',
      features: [
        'Unlimited contracts & invoices',
        'Equipment catalog — unlimited units',
        'Customer management & DL scan',
        'Counter & manager apps',
        'Email & SMS notifications',
        'AI rental assistant (scoped to your catalog)',
        'Delivery matrix & driver dispatch',
        'AIReports — utilization & fleet health',
      ],
      cta: 'Start Free Trial',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$449',
      per: '/mo · unlimited branches',
      desc: 'Multi-branch operations with full field ops, event planning, and advanced analytics.',
      badge: 'MOST POPULAR',
      compare: 'Point of Rental starts at $540/mo for 3 users — one branch.',
      features: [
        'Everything in Core',
        'Unlimited branches',
        'Cross-branch availability & transfers',
        'AIREvents canvas & floor plans',
        'ADA compliance engine',
        'Permit & anchoring tracker',
        'QuickBooks sync',
        'Volume, loyalty & promo discount engine',
        'Seasonal demand forecasting',
      ],
      cta: 'Start Free Trial',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      per: '',
      desc: 'White-label, SSO, government bid intelligence, and dedicated infrastructure.',
      badge: null,
      compare: null,
      features: [
        'Everything in Pro',
        'AIRfq — AI Government Bid Intelligence',
        'White-label domain & branding',
        'SSO (Google Workspace / Microsoft / Okta)',
        'Isolated tenant environment',
        'Custom API integrations',
        'Dedicated onboarding & SLA',
        'Priority support + account manager',
      ],
      cta: 'Contact Sales',
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="py-24 bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <FadeUp className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white">Simple, transparent pricing</h2>
          <p className="text-white/50 mt-4 text-lg max-w-2xl mx-auto">No setup fees. No per-contract charges. No per-user nickeling. AI included. Cancel anytime.</p>
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-white/40">
            <span>✓ Booqable: $149/mo — no AI, no dispatch, no field ops</span>
            <span>✓ Point of Rental: $540+/mo — legacy UX, no AI</span>
            <span>✓ EZRentOut: $399/mo — no event canvas, no bid tools</span>
          </div>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className={`rounded-2xl border p-8 h-full flex flex-col relative ${tier.highlight ? 'bg-cyan-500/10 border-cyan-400/50' : 'bg-white/5 border-white/10'}`}>
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-black px-4 py-1 rounded-full">
                      {tier.badge}
                    </div>
                  )}
                  <div>
                    <div className="text-white/60 text-sm font-medium mb-2">{tier.name}</div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-black text-white">{tier.price}</span>
                      <span className="text-white/40 text-sm mb-1">{tier.per}</span>
                    </div>
                    <p className="text-white/50 text-sm mb-3">{tier.desc}</p>
                    {tier.compare && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-400 mb-5">
                        💡 {tier.compare}
                      </div>
                    )}
                    <ul className="space-y-2.5 mb-8">
                      {tier.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-white/70">
                          <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button className={`mt-auto w-full py-3 rounded-xl font-bold text-sm transition ${tier.highlight ? 'bg-cyan-500 hover:bg-cyan-400 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                    {tier.cta}
                  </button>
                </div>
              </FadeUp>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-black border-t border-white/10 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg" alt="AIR" className="h-12 w-12 rounded-xl mb-2" />
            <div className="text-xs text-cyan-400 font-medium tracking-widest uppercase mb-3">by Lupine</div>
            <p className="text-white/40 text-sm">The rental equipment platform built for the Rio Grande Valley — and beyond.</p>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Products</div>
            <div className="space-y-3">
              {[
                { name: 'AIRental', icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/68b1feaf4_AIRentalBlack-01.svg' },
                { name: 'AIREvents', icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/f62f4b089_AIREvents_black-01.svg' },
                { name: 'AIRfq', icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/f288b892e_AIRfqBlack-01.svg' },
                { name: 'AIReports', icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/359e95609_AIReportsBlack-01.svg' },
                { name: 'AIRepair', icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/2e3d7b226_AIRepair_png_transparentBlack-01.svg' },
                { name: 'AIRoads', icon: 'https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/aea5997d3_AIRoads_black.png' },
              ].map(p => (
                <button key={p.name} onClick={() => document.querySelector(`#${p.name.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-white/50 hover:text-white transition">
                  <img src={p.icon} alt={p.name} className="h-5 w-5 rounded-md" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Platform</div>
            <div className="space-y-2">
              {['Field Ops', 'Dispatch', 'Analytics', 'Security'].map(p => (
                <div key={p} className="text-white/50 text-sm">{p}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Company</div>
            <div className="space-y-2">
              <button onClick={() => navigate('/lupine')} className="block text-white/50 hover:text-white text-sm transition">Roadmap</button>
              <button onClick={() => navigate('/privacy')} className="block text-white/50 hover:text-white text-sm transition">Privacy</button>
              <button onClick={() => navigate('/terms')} className="block text-white/50 hover:text-white text-sm transition">Terms</button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-white/30 text-sm">© 2026 Lupine Technologies. All rights reserved.</div>
          <button onClick={() => navigate('/availability')}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-sm transition">
            Launch AIRental →
          </button>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AIRWebsite() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      <Nav />
      <Hero />

      {/* Products anchor */}
      <div id="products" />

      <ProductSection
        id="airental"
        tag="AIRental"
        title={<img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/68b1feaf4_AIRentalBlack-01.svg" alt="AIRental" className="h-20 w-20 rounded-2xl" />}
        tagline="Rental management, reinvented."
        description="From quote to signed contract in under 3 minutes. Multi-branch, multi-item, with dynamic pricing, delivery matrix, customer management, and a dispatch board that puts your drivers on the map."
        color="cyan"
        features={[
          { icon: <Zap className="w-5 h-5" />, title: '3-Minute Invoicing', desc: 'Quote → Contract → Printed invoice with signatures, all in under 3 minutes.' },
          { icon: <MapPin className="w-5 h-5" />, title: 'Multi-Branch + Transfers', desc: 'Cross-branch availability, equipment transfers, and centralized reporting.' },
          { icon: <Truck className="w-5 h-5" />, title: 'Dispatch + Driver App', desc: 'Live GPS tracking, delivery manifests, photo capture, and customer signatures — offline-capable.' },
          { icon: <BarChart3 className="w-5 h-5" />, title: 'Smart Pricing Engine', desc: 'Volume discounts, loyalty programs, promo codes, and duration-based pricing — automatic.' },
          { icon: <FileText className="w-5 h-5" />, title: 'Digital Rental Agreements', desc: 'ARA-compliant contracts with e-signatures, initials on every page, and PDF generation.' },
          { icon: <Clock className="w-5 h-5" />, title: 'Timesheets + Clock In/Out', desc: 'Staff time tracking with QR codes, job context, and payroll export.' },
        ]}
        cta="Open AIRental"
        ctaRoute="/availability"
        preview={<AIRentalPreview />}
      />

      <ProductSection
        id="airevents"
        tag="AIREvents"
        title={<img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/f62f4b089_AIREvents_black-01.svg" alt="AIREvents" className="h-20 w-20 rounded-2xl" />}
        tagline="The floor plan IS the order."
        description="Drag equipment onto a live-inventory canvas — every item auto-checks availability, soft-reserves the unit, and adds to the quote. ADA compliance engine, permit tracker, surface & anchoring system built in. PartyCad, replaced."
        color="purple"
        features={[
          { icon: <Calendar className="w-5 h-5" />, title: 'Live Canvas', desc: 'Drag-and-drop floor plans linked to real-time inventory and auto-reservations.' },
          { icon: <Shield className="w-5 h-5" />, title: 'ADA Compliance Engine', desc: 'Automatic pathway validation (72" clear), accessible route reports, audit-ready documentation.' },
          { icon: <CheckCircle className="w-5 h-5" />, title: 'Permit + Certification Tracker', desc: 'Fire marshal, health dept, anchoring, noise variance — tracked with expiry alerts.' },
          { icon: <Brain className="w-5 h-5" />, title: 'AI Event Suggestions', desc: 'Missing power? Outdoor setup? AI recommends generators, stakes, and accessories before you ask.' },
          { icon: <Users className="w-5 h-5" />, title: 'Guest Count Logic', desc: 'Auto-calculates required chairs, tables, and staging based on expected attendance.' },
        ]}
        cta="Explore AIREvents"
        ctaRoute="/airevents"
        preview={<AIREventsPreview />}
      />

      <ProductSection
        id="airfq"
        tag="AIRfq · Premium"
        title={<img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/f288b892e_AIRfqBlack-01.svg" alt="AIRfq" className="h-20 w-20 rounded-2xl" />}
        tagline="Upload the RFQ. Walk away with a bid."
        description="AI reads the government RFQ, matches every line item to your catalog, drafts the full bid response, flags every missing certification, and won't let you submit until it's complete. What used to take a day takes an hour."
        color="blue"
        features={[
          { icon: <FileText className="w-5 h-5" />, title: 'AI RFQ Parsing', desc: 'Upload PDF/Word/Excel — AI extracts every line item, certification, and deadline requirement.' },
          { icon: <Brain className="w-5 h-5" />, title: 'Auto-Draft Response', desc: 'Complete bid drafted from your catalog, with pricing, site plans, and compliance docs attached.' },
          { icon: <CheckCircle className="w-5 h-5" />, title: 'Compliance Gate', desc: 'System blocks submission until every requirement (certs, references, insurance) is resolved.' },
          { icon: <DollarSign className="w-5 h-5" />, title: 'Bid Intelligence', desc: 'Win/loss tracking, authority spending patterns, competitive pricing guidance.' },
          { icon: <TrendingUp className="w-5 h-5" />, title: 'Line Item Matching', desc: 'AI maps RFQ items to your catalog with confidence scores and gap alerts.' },
        ]}
        cta="Learn About AIRfq"
        ctaRoute="/airfq"
        preview={<AIRfqPreview />}
      />

      <ProductSection
        id="aireports"
        tag="AIReports"
        title={<img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/359e95609_AIReportsBlack-01.svg" alt="AIReports" className="h-20 w-20 rounded-2xl" />}
        tagline="Know your numbers. Grow your operation."
        description="Live dashboards built on your real rental data — equipment utilization by category, seasonal demand curves, asset aging, fleet health, and branch revenue side by side. No spreadsheets, no exports, no waiting."
        color="green"
        features={[
          { icon: <BarChart3 className="w-5 h-5" />, title: 'Utilization Analytics', desc: 'Real-time utilization by category, branch, and individual unit — see what earns vs. what sits.' },
          { icon: <TrendingUp className="w-5 h-5" />, title: 'Seasonal Demand Forecasting', desc: '18-month demand curves with AI predictions to optimize purchasing and staffing.' },
          { icon: <Package className="w-5 h-5" />, title: 'Asset Aging + Depreciation', desc: 'Track book value, depreciation schedules, and replacement timing for every unit.' },
          { icon: <AlertTriangle className="w-5 h-5" />, title: 'Fleet Health Dashboard', desc: 'Units in shop, awaiting parts, due for inspection — with cost-to-repair estimates.' },
          { icon: <DollarSign className="w-5 h-5" />, title: 'Revenue per Branch', desc: 'Side-by-side branch performance, profitability, and equipment ROI comparisons.' },
          { icon: <Wrench className="w-5 h-5" />, title: 'Predictive Maintenance Alerts', desc: 'AI flags equipment likely to fail based on rental frequency and repair history.' },
        ]}
        cta="Open AIReports"
        ctaRoute="/aireports"
        preview={<AIReportsPreview />}
      />

      <ProductSection
        id="airepair"
        tag="AIRepair · Shop Management"
        title={<img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/2e3d7b226_AIRepair_png_transparentBlack-01.svg" alt="AIRepair" className="h-20 w-20 rounded-2xl" />}
        tagline="From breakdown to backyard — automatically."
        description="Equipment flagged by field ops flows directly into a work order queue. AI routes jobs to the right mechanic based on skills and availability. Track parts procurement, labor costs, condition before/after. Predict failures before they happen with automated preventive maintenance alerts."
        color="orange"
        features={[
          { icon: <Wrench className="w-5 h-5" />, title: 'Smart Mechanic Assignment', desc: 'AI recommends mechanics based on equipment expertise, current workload, and parts availability.' },
          { icon: <Package className="w-5 h-5" />, title: 'Parts Procurement', desc: 'RFQ generation for vendors, parts tracking, and job block alerts when critical parts are missing.' },
          { icon: <AlertTriangle className="w-5 h-5" />, title: 'Predictive Health Alerts', desc: 'AI analyzes rental patterns and repair history to flag units at risk of failure.' },
          { icon: <TrendingUp className="w-5 h-5" />, title: 'Job Costing + ROI', desc: 'Per-repair labor, parts, and total cost tracking — compare repair vs. replace decisions.' },
          { icon: <Users className="w-5 h-5" />, title: 'Shop Floor Board', desc: 'Real-time view of unassigned jobs, mechanic workloads, and parts pending status.' },
          { icon: <Clock className="w-5 h-5" />, title: 'Preventive Maintenance', desc: 'Automated PM scheduling based on rental cycles, hours, or calendar intervals.' },
        ]}
        cta="Open AIRepair"
        ctaRoute="/airepair"
        preview={<AIRepairPreview />}
      />

      <ProductSection
        id="airoads"
        tag="AIRoads · Logistics"
        title={<img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/aea5997d3_AIRoads_black.png" alt="AIRoads" className="h-20 w-20 rounded-2xl" />}
        tagline="Optimize every route. Ship faster."
        description="Multi-truck load planner with auto-balancing and bin-packing algorithms. Drag items onto virtual trucks, print QR-coded shipping labels, and track deliveries with real-time transit scanning. Minimize cost-per-mile while respecting capacity constraints."
        color="blue"
        features={[
          { icon: <Route className="w-5 h-5" />, title: 'Load Optimization', desc: 'Bin-packing algorithms auto-balance by weight, volume, or minimize total truck count.' },
          { icon: <Truck className="w-5 h-5" />, title: 'Multi-Truck Visual Planner', desc: 'Drag-and-drop interface with real-time capacity (weight/volume) visualization per truck.' },
          { icon: <Package className="w-5 h-5" />, title: 'Shipping Label Printer', desc: 'Generate QR-coded labels for thermal or sheet printers — one click for all items.' },
          { icon: <CheckCircle className="w-5 h-5" />, title: 'Transit Scanning', desc: 'Mobile QR scanner confirms load-in, delivery, and customer signature with GPS stamp.' },
          { icon: <DollarSign className="w-5 h-5" />, title: 'Cost Optimization', desc: 'Minimize cost-per-mile, fuel estimates, and driver assignment recommendations.' },
          { icon: <MapPin className="w-5 h-5" />, title: 'GPS Fleet Tracking', desc: 'Integration with Samsara, CalAmp, Verizon Connect for real-time location and geofence breach alerts.' },
        ]}
        cta="Open AIRoads"
        ctaRoute="/airoads"
        preview={<AIRoadsPreview />}
      />

      <PlatformSection />
      <QuoteSection />
      <PricingSection />
      <Footer />
    </div>
  );
}