import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, BarChart3, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIRental() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              AIRental
            </h1>
            <p className="text-xl text-blue-200">The future of equipment rental management</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-cyan-300">Key Features</h2>
              <ul className="space-y-3">
                {[
                  { icon: <Zap className="w-5 h-5" />, title: 'Instant Quotes', desc: 'Real-time availability & pricing' },
                  { icon: <BarChart3 className="w-5 h-5" />, title: 'Smart Analytics', desc: 'Track utilization & demand' },
                  { icon: <MapPin className="w-5 h-5" />, title: 'Multi-Branch', desc: 'Manage across locations' },
                  { icon: <Clock className="w-5 h-5" />, title: 'Dispatch Tracking', desc: 'Live delivery & recovery ops' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-700/50 rounded-lg border border-cyan-400/20 hover:border-cyan-400/50 transition-all">
                    <div className="text-cyan-400 flex-shrink-0">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold text-cyan-300">{item.title}</h3>
                      <p className="text-sm text-blue-200">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-cyan-300">Built for Scale</h2>
              <p className="text-blue-200 leading-relaxed">
                Whether you're managing a single branch or a nationwide fleet, AIRental adapts to your business. 
                Automate customer onboarding, instantly calculate dynamic pricing, and track every asset in real-time.
              </p>
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-lg p-6">
                <p className="text-sm text-blue-300">
                  <strong>Rental World Equipment</strong> uses AIRental to manage 100+ units across 5 branches with 
                  zero manual invoice creation and live delivery tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700">
              See Live Demo
            </Button>
            <Button size="lg" variant="outline" className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10">
              Request Trial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}