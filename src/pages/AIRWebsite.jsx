import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Zap, BarChart3, MapPin, Clock, Users, Calendar, FileText,
  DollarSign, CheckCircle, ChevronRight, ArrowRight, Menu, X,
  Truck, Shield, Brain, Star, Play, Building2, TrendingUp, Package, AlertTriangle, Wrench, Route, Phone, Mail
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

function Nav() {
  const [open, setOpen] = useState(false);
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

function Hero() {
  return (
    <section className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden pt-16">
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
            automating operations, predicting failures, and maximizing profitability.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={() => document.querySelector('#waitlist')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-lg transition flex items-center gap-2">
            <Play className="w-5 h-5" />
            Request Early Access
          </button>
          <button onClick={() => document.querySelector('#airental')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-lg transition flex items-center gap-2">
            Explore Features
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-12">
          <p className="text-slate-500 text-sm mb-4">Trusted by innovative rental companies</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="flex items-center gap-2 text-white/80">
              <Building2 className="w-6 h-6" />
              <span className="font-semibold">Rental World</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Truck className="w-6 h-6" />
              <span className="font-semibold">McAllen Equipment</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Shield className="w-6 h-6" />
              <span className="font-semibold">Lupine Industries</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const products = [
  { id: 'airental', name: 'AIRental', icon: Calendar, tagline: 'Intelligent Rental Operations', description: 'Automate counter operations, optimize equipment utilization, and deliver exceptional customer experiences with AI-powered workflows.', features: ['Smart availability engine', 'Automated customer verification', 'Dynamic pricing optimization', 'One-click rental agreements'], color: 'cyan' },
  { id: 'airevents', name: 'AIREvents', icon: Star, tagline: 'Event Planning Reimagined', description: 'Visual event planning canvas with AI suggestions for tent layouts, table arrangements, and equipment bundles.', features: ['Interactive 2D canvas', 'AI-powered space optimization', 'Auto-generated checklists', 'Real-time availability checks'], color: 'blue' },
  { id: 'airfq', name: 'AIRfq', icon: FileText, tagline: 'Instant RFQ Responses', description: 'Turn complex RFPs and RFQs into winning bids in minutes. AI analyzes requirements, checks compliance, and generates professional responses.', features: ['Automated compliance matrix', 'Line-item intelligence', 'Historical bid analysis', 'Professional proposal generation'], color: 'violet' },
  { id: 'aireports', name: 'AIReports', icon: BarChart3, tagline: 'Business Intelligence on Autopilot', description: 'Beautiful, actionable reports delivered daily. Track KPIs, spot trends, and make data-driven decisions without manual analysis.', features: ['Daily digest reports', 'Custom KPI dashboards', 'Trend analysis & forecasting', 'Automated insights'], color: 'emerald' },
  { id: 'airepair', name: 'AIRepair', icon: Wrench, tagline: 'Predictive Maintenance', description: 'Prevent equipment failures before they happen. AI analyzes usage patterns, predicts maintenance needs, and optimizes shop workflows.', features: ['Predictive failure alerts', 'Smart parts forecasting', 'Mechanic assignment optimization', 'Maintenance cost tracking'], color: 'orange' },
  { id: 'airoads', name: 'AIRoads', icon: Route, tagline: 'Smart Logistics & Delivery', description: 'Optimize delivery routes, manage cross-branch transfers, and track equipment in transit with intelligent logistics.', features: ['Route optimization', 'Cross-branch transfers', 'Real-time GPS tracking', 'Automated manifests'], color: 'rose' },
];

const colorClasses = {
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', button: 'bg-cyan-500 hover:bg-cyan-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', button: 'bg-blue-500 hover:bg-blue-400' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', button: 'bg-violet-500 hover:bg-violet-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', button: 'bg-emerald-500 hover:bg-emerald-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', button: 'bg-orange-500 hover:bg-orange-400' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', button: 'bg-rose-500 hover:bg-rose-400' },
};

function ProductSection({ product }) {
  const colors = colorClasses[product.color];
  const Icon = product.icon;
  
  return (
    <section id={product.id} className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <div className={`inline-flex items-center gap-2 ${colors.bg} ${colors.border} border rounded-full px-4 py-1.5 mb-6`}>
              <Icon className={`w-4 h-4 ${colors.text}`} />
              <span className={`text-sm font-medium ${colors.text}`}>{product.name}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">{product.tagline}</h2>
            <p className="text-xl text-slate-400 mb-8">{product.description}</p>
            <ul className="space-y-3 mb-8">
              {product.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className={`w-5 h-5 ${colors.text}`} />
                  {feature}
                </li>
              ))}
            </ul>
            <button className={`px-6 py-3 ${colors.button} text-black font-bold rounded-xl transition flex items-center gap-2`}>
              Learn More <ChevronRight className="w-5 h-5" />
            </button>
          </AnimatedSection>
          <AnimatedSection>
            <div className="relative">
              <div className={`absolute inset-0 ${colors.bg} blur-3xl rounded-full opacity-50`} />
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/10">
                <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center">
                  <Icon className={`w-24 h-24 ${colors.text} opacity-50`} />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section id="platform" className="py-24 bg-gradient-to-b from-black to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Built for the modern rental business</h2>
            <p className="text-xl text-slate-400">Everything you need to run your rental operations, all in one intelligent platform.</p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant, end-to-end encryption, role-based access control' },
            { icon: Zap, title: 'Lightning Fast', desc: 'Sub-second page loads, real-time updates, offline-capable' },
            { icon: Brain, title: 'AI-Powered', desc: 'Machine learning models trained on millions of rental transactions' },
            { icon: Users, title: 'Multi-Branch', desc: 'Manage unlimited locations from a single dashboard' },
            { icon: Clock, title: '24/7 Support', desc: 'Dedicated support team, comprehensive documentation, video tutorials' },
            { icon: TrendingUp, title: 'Scalable', desc: 'From single locations to enterprise fleets with 10,000+ assets' },
          ].map((feature, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition">
                <feature.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Simple, transparent pricing</h2>
            <p className="text-xl text-slate-400">Choose the plan that fits your business. All plans include a 14-day free trial.</p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { name: 'Core', price: '299', desc: 'Perfect for single-location operations', features: ['Up to 500 equipment items', 'Basic reporting', 'Email support', '1 branch'] },
            { name: 'Pro', price: '599', desc: 'Most popular for growing businesses', features: ['Unlimited equipment', 'Advanced AI features', 'Priority support', 'Up to 5 branches', 'Custom integrations'], popular: true },
            { name: 'Enterprise', price: 'Custom', desc: 'For large-scale operations', features: ['Everything in Pro', 'Unlimited branches', 'Dedicated account manager', 'Custom AI training', 'SLA guarantee'] },
          ].map((plan, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div className={`relative bg-slate-800/50 border ${plan.popular ? 'border-cyan-500' : 'border-white/10'} rounded-2xl p-8 hover:border-cyan-500/30 transition`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-black font-bold px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  {plan.price === 'Custom' ? (
                    <span className="text-4xl font-black text-white">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-white">${plan.price}</span>
                      <span className="text-slate-400">/month</span>
                    </>
                  )}
                </div>
                <p className="text-slate-400 mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-bold transition ${plan.popular ? 'bg-cyan-500 hover:bg-cyan-400 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function Waitlist() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', branches: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('https://theprojectair.com/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        setMessage("You're on the list! We'll be in touch soon.");
        setForm({ name: '', email: '', company: '', phone: '', branches: '' });
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <section id="waitlist" className="py-24 bg-gradient-to-b from-slate-900 to-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Get early access</h2>
            <p className="text-xl text-slate-400 mb-8">Join the waitlist and be among the first to experience the future of rental management. Early subscribers lock in founding pricing for 24 months.</p>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8">
            {status === 'success' ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                <p className="text-slate-400">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition" placeholder="john@company.com" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
                    <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition" placeholder="Acme Rentals" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition" placeholder="(956) 555-1234" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Number of Branches</label>
                  <input type="text" value={form.branches} onChange={e => setForm(f => ({ ...f, branches: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition" placeholder="e.g., 1, 2-5, 5+" />
                </div>
                {status === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{message}</div>
                )}
                <button type="submit" disabled={status === 'loading'} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-black font-bold rounded-xl text-lg transition flex items-center justify-center gap-2">
                  {status === 'loading' ? (<><Clock className="w-5 h-5 animate-spin" /> Submitting...</>) : (<><>Request Early Access <ArrowRight className="w-5 h-5" /></></>)}
                </button>
                <p className="text-xs text-slate-500 text-center">By submitting, you agree to our Terms of Service and Privacy Policy.</p>
              </form>
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg" alt="AIR" className="h-10 w-10 rounded-lg" />
              <div>
                <div className="text-white font-bold">AIR</div>
                <div className="text-xs text-cyan-400">by Lupine</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm">The first rental equipment cloud platform powered by AI.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Products</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {['AIRental', 'AIREvents', 'AIRfq', 'AIReports', 'AIRepair', 'AIRoads'].map(name => (
                <li key={name}><button onClick={() => document.querySelector(`#${name.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-cyan-400 transition">{name}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/about" className="hover:text-cyan-400 transition">About</a></li>
              <li><button onClick={() => document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-cyan-400 transition">Pricing</button></li>
              <li><a href="/privacy" className="hover:text-cyan-400 transition">Privacy</a></li>
              <li><a href="/terms" className="hover:text-cyan-400 transition">Terms</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /><a href="tel:+19565551234" className="hover:text-cyan-400 transition">(956) 555-1234</a></li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><a href="mailto:info@theprojectair.com" className="hover:text-cyan-400 transition">info@theprojectair.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} AIR by Lupine. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="/privacy" className="hover:text-cyan-400 transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-cyan-400 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function AIRWebsite() {
  return (
    <div className="bg-black min-h-screen">
      <Nav />
      <Hero />
      {products.map(product => (
        <ProductSection key={product.id} product={product} />
      ))}
      <Platform />
      <Pricing />
      <Waitlist />
      <Footer />
    </div>
  );
}