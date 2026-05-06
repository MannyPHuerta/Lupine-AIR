import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, DollarSign, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIRfq() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/0ce13a2ef_AIRfq_final.svg" alt="AIRfq" className="h-16 w-16 rounded-2xl" />
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                AIRfq
              </h1>
            </div>
            <p className="text-xl text-blue-200">Request for Quote & bid management platform</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-cyan-300">Smart Quoting</h2>
              <ul className="space-y-3">
                {[
                  { icon: <FileText className="w-5 h-5" />, title: 'RFQ Templates', desc: 'Standardized requests' },
                  { icon: <Zap className="w-5 h-5" />, title: 'Auto-Generate Bids', desc: 'AI-powered pricing' },
                  { icon: <DollarSign className="w-5 h-5" />, title: 'Margin Management', desc: 'Competitive analysis' },
                  { icon: <CheckCircle className="w-5 h-5" />, title: 'Approval Workflows', desc: 'Route to decision makers' },
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
              <h2 className="text-2xl font-bold text-cyan-300">Win More Bids</h2>
              <p className="text-blue-200 leading-relaxed">
                Respond to RFQs faster with intelligent quoting that accounts for inventory, availability, 
                and pricing rules. AIRfq ensures consistent margins while staying competitive.
              </p>
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-lg p-6">
                <p className="text-sm text-blue-300">
                  <strong>Rental World Equipment:</strong> AIRfq improved quote response time by 75% and 
                  reduced manual pricing errors to zero.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700">
              Request Access
            </Button>
            <Button size="lg" variant="outline" className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10">
              View Specs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}