import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIREvents() {
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
              AIREvents
            </h1>
            <p className="text-xl text-blue-200">Seamless event planning & coordination</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-cyan-300">Capabilities</h2>
              <ul className="space-y-3">
                {[
                  { icon: <Calendar className="w-5 h-5" />, title: 'Timeline Management', desc: 'Plan deliveries & setups' },
                  { icon: <Users className="w-5 h-5" />, title: 'Team Coordination', desc: 'Assign & communicate tasks' },
                  { icon: <AlertCircle className="w-5 h-5" />, title: 'Risk Mitigation', desc: 'Pre-event checklists' },
                  { icon: <TrendingUp className="w-5 h-5" />, title: 'Event Analytics', desc: 'Performance insights' },
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
              <h2 className="text-2xl font-bold text-cyan-300">For Event Teams</h2>
              <p className="text-blue-200 leading-relaxed">
                Coordinate complex events with dozens of equipment deliveries, teams, and timelines. AIREvents 
                keeps everyone on the same page—from pre-event planning through post-event recovery.
              </p>
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-lg p-6">
                <p className="text-sm text-blue-300">
                  <strong>Coming Soon:</strong> Integration with major event planning platforms for 
                  seamless workflow automation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700">
              Learn More
            </Button>
            <Button size="lg" variant="outline" className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10">
              Join Waitlist
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}