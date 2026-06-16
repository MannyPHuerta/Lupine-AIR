import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Zap, BarChart3, MapPin, Clock, Users, Calendar, FileText,
  DollarSign, CheckCircle, ChevronRight, ArrowRight, Menu, X,
  Truck, Shield, Brain, Star, Play, Building2, TrendingUp, Package, AlertTriangle, Wrench, Route, Phone
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
          <button onClick={() => document.querySelector('#waitlist')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white font-medium transition">
            Request Access
          </button>
          <button onClick={() => document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition">
            See Pricing →
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
          <button onClick={() => document.querySelector('#waitlist')?.scrollIntoView({ behavior: 'smooth' })} className="block w-full text-center px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-sm">
            Request Early Access →
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
            <span className="text-cyan-400 text-sm font-medium">Now live — Rental World Equipment, McAllen TX</span>
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
 
