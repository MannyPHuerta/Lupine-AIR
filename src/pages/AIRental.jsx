import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, BarChart3, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIRental() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1b3e' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-8" style={{ color: '#F5A623' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="space-y-8">
          <div className="space-y-4">
            <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/52eafcdcd_AIRental_final.svg" alt="AIRental" className="h-24 w-24 rounded-2xl" />
            <p className="text-xl" style={{ color: '#a0aec0' }}>The future of equipment rental management</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold" style={{ color: '#F5A623' }}>Key Features</h2>
              <ul className="space-y-3">
                {[
                  { icon: <Zap className="w-5 h-5" />, title: 'Instant Quotes', desc: 'Real-time availability & pricing' },
                   { icon: <BarChart3 className="w-5 h-5" />, title: 'Smart Analytics', desc: 'Track utilization & demand' },
                   { icon: <MapPin className="w-5 h-5" />, title: 'Multi-Branch', desc: 'Manage across locations' },
                   { icon: <Clock className="w-5 h-5" />, title: 'Dispatch Tracking', desc: 'Live delivery & recovery ops' },
                  ].map((item, i) => (
                   <div key={i} className="flex gap-4 p-4 rounded-lg border transition-all" style={{ backgroundColor: 'rgba(15, 31, 59, 0.8)', borderColor: 'rgba(245, 166, 35, 0.3)' }}>
                     <div style={{ color: '#F5A623' }} className="flex-shrink-0">{item.icon}</div>
                     <div>
                       <h3 className="font-semibold" style={{ color: '#F5A623' }}>{item.title}</h3>
                       <p className="text-sm" style={{ color: '#a0aec0' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold" style={{ color: '#F5A623' }}>Built for Scale</h2>
               <p className="leading-relaxed" style={{ color: '#a0aec0' }}>
                Whether you're managing a single branch or a nationwide fleet, AIRental adapts to your business. 
                Automate customer onboarding, instantly calculate dynamic pricing, and track every asset in real-time.
              </p>
              <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(245, 166, 35, 0.05)', borderColor: 'rgba(245, 166, 35, 0.3)' }}>
                <p className="text-sm" style={{ color: '#a0aec0' }}>
                  <strong>Rental World Equipment</strong> uses AIRental to manage 100+ units across 5 branches with 
                  zero manual invoice creation and live delivery tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" style={{ backgroundColor: '#F5A623' }} className="text-white hover:opacity-90">
              See Live Demo
            </Button>
            <Button size="lg" variant="outline" style={{ borderColor: 'rgba(245, 166, 35, 0.5)', color: '#F5A623' }} className="hover:opacity-80">
              Request Trial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}