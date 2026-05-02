import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingHero() {
  const [stage, setStage] = useState('tagline'); // tagline -> air -> icons
  const navigate = useNavigate();

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('air'), 2000);
    const timer2 = setTimeout(() => setStage('icons'), 3500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 text-center space-y-12">
        {/* Tagline + AIR + Subtitle */}
        {(stage === 'tagline' || stage === 'air' || stage === 'icons') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <p className="text-xl text-blue-300 font-light tracking-wide">It's time for a breath of fresh</p>
            
            {/* AIR Text */}
            {(stage === 'air' || stage === 'icons') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <motion.h1
                  className="text-8xl md:text-9xl font-black text-white drop-shadow-lg"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  AIR
                </motion.h1>
              </motion.div>
            )}
            
            <p className="text-sm text-cyan-200/70 font-medium">The FIRST rental equipment cloud software to harness the power of AI</p>
          </motion.div>
        )}

        {/* Icons Grid */}
        {stage === 'icons' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto"
          >
            {[
              { name: 'AIRental', icon: '🚀', desc: 'Equipment Rental Platform', route: '/airental' },
              { name: 'AIREvents', icon: '🎯', desc: 'Event Management Suite', route: '/airevents' },
              { name: 'AIRfq', icon: '📋', desc: 'RFQ & Bid Management', route: '/airfq' },
            ].map((item, i) => (
              <motion.button
                key={item.name}
                onClick={() => navigate(item.route)}
                whileHover={{ scale: 1.1, y: -10 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-75 transition-all duration-300" />
                <div className="relative bg-slate-800/80 backdrop-blur-sm border border-cyan-400/20 hover:border-cyan-400/50 rounded-2xl p-8 transition-all duration-300">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-bold text-cyan-300 mb-2">{item.name}</h3>
                  <p className="text-sm text-blue-200">{item.desc}</p>
                  <p className="text-xs text-blue-300/60 mt-4">Click to explore →</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Scroll hint */}
        {stage === 'icons' && (
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-16 text-blue-300/50 text-sm"
          >
            Scroll to learn more
          </motion.div>
        )}
      </div>
    </div>
  );
}