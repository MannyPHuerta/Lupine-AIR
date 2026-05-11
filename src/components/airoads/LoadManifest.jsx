import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoadManifest({ loads, truckSpecs, distance }) {
  const handlePrint = () => {
    window.print();
  };

  const getTruckStats = (truck) => {
    const spec = truckSpecs[truck.type] || {};
    const weight = truck.items?.reduce((s, e) => s + (e.weight || 0), 0) || 0;
    const volume = truck.items?.reduce((s, e) => s + (e.volume || 0), 0) || 0;
    return { weight, volume, spec };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Load Manifests</h2>
          <p className="text-sm text-gray-600 mt-1">One-way trip: {distance} miles</p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print All
        </Button>
      </div>

      <div className="space-y-6 print:space-y-0">
        {loads.map((truck, idx) => {
          const { weight, volume, spec } = getTruckStats(truck);

          return (
            <div key={truck.id} className="bg-white rounded-xl border shadow-sm p-8 print:break-after-page print:page-break-after">
              {/* Header */}
              <div className="border-b-2 border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">LOAD MANIFEST</h1>
                <div className="grid grid-cols-2 gap-6 text-sm mt-4">
                  <div>
                    <div className="text-gray-600">Vehicle:</div>
                    <div className="font-bold text-lg">{truck.name} – {spec.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Manifest #:</div>
                    <div className="font-bold text-lg">{truck.id}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="border rounded-lg p-4">
                  <div className="text-gray-600 text-xs uppercase font-semibold">Total Items</div>
                  <div className="text-3xl font-bold text-gray-900">{truck.items?.length || 0}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-gray-600 text-xs uppercase font-semibold">Total Weight</div>
                  <div className="text-3xl font-bold text-gray-900">{(weight / 1000).toFixed(1)}k</div>
                  <div className="text-xs text-gray-500">of {(spec.weightCapacity / 1000).toFixed(0)}k lbs</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-gray-600 text-xs uppercase font-semibold">Total Volume</div>
                  <div className="text-3xl font-bold text-gray-900">{volume}</div>
                  <div className="text-xs text-gray-500">of {spec.volumeCapacity} cu ft</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-800">
                    <th className="text-left py-2 font-bold text-gray-900">Equipment Name</th>
                    <th className="text-right py-2 font-bold text-gray-900">Weight</th>
                    <th className="text-right py-2 font-bold text-gray-900">Volume</th>
                    <th className="text-center py-2 font-bold text-gray-900">Seq.</th>
                  </tr>
                </thead>
                <tbody>
                  {truck.items && truck.items.length > 0 ? (
                    truck.items.map((item, i) => (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 text-gray-900 font-medium">{item.name}</td>
                        <td className="text-right py-2 text-gray-700">{item.weight ? `${(item.weight / 1000).toFixed(1)}k lbs` : '—'}</td>
                        <td className="text-right py-2 text-gray-700">{item.volume ? `${item.volume} cu ft` : '—'}</td>
                        <td className="text-center py-2 text-gray-500 text-xs font-semibold bg-gray-100 rounded px-2">{i + 1}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        No items assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Footer */}
              <div className="border-t-2 border-gray-800 pt-4 space-y-3 text-xs text-gray-700">
                <div>
                  <span className="font-bold">Driver Signature:</span>
                  <span className="ml-16 border-b border-gray-800 inline-block w-40"></span>
                  <span className="ml-4">Date: <span className="border-b border-gray-800 inline-block w-24"></span></span>
                </div>
                <div>
                  <span className="font-bold">Loaded By:</span>
                  <span className="ml-24 border-b border-gray-800 inline-block w-40"></span>
                  <span className="ml-4">Time: <span className="border-b border-gray-800 inline-block w-24"></span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}