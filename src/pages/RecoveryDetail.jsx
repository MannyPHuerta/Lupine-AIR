import { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, Check, MapPin, AlertCircle, SplitSquareHorizontal } from 'lucide-react';
import ClaimPackageButton from '@/components/recovery/ClaimPackageButton';
import { Button } from '@/components/ui/button';
import PhotoCapture from '@/components/delivery/PhotoCapture';

const STATUS_STEPS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'departed', label: 'Departed' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'photos_captured', label: 'Photos' },
  { key: 'loaded', label: 'Loaded' },
  { key: 'returned_to_branch', label: 'At Branch' },
  { key: 'completed', label: 'Completed' },
];

export default function RecoveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [deliveryPhotos, setDeliveryPhotos] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    base44.entities.Recovery.list('-created_date', 200)
      .then(async recs => {
        const rec = recs.find(r => r.id === id);
        if (!rec) { setError('Recovery not found'); setLoading(false); return; }
        setRecovery(rec);
        setPhotos(rec.photos || []);

        // Fetch delivery photos for side-by-side comparison
        if (rec.rentalId) {
          const deliveries = await base44.entities.Delivery.filter({ rentalId: rec.rentalId });
          const deliveryWithPhotos = deliveries.find(d => d.photos && d.photos.length > 0);
          if (deliveryWithPhotos) setDeliveryPhotos(deliveryWithPhotos.photos);
        }

        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    const updates = { status: newStatus };
    if (newStatus === 'departed') updates.departedAt = new Date().toISOString();
    else if (newStatus === 'arrived') updates.arrivedAt = new Date().toISOString();
    else if (newStatus === 'photos_captured') updates.photos = photos;
    else if (newStatus === 'returned_to_branch') updates.returnedToBranchAt = new Date().toISOString();
    else if (newStatus === 'completed') updates.completedAt = new Date().toISOString();

    await base44.entities.Recovery.update(id, updates);
    setRecovery({ ...recovery, ...updates });
    setUpdating(false);
  };

  const removePhoto = (idx) => setPhotos(photos.filter((_, i) => i !== idx));

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4">
      <AlertCircle className="w-8 h-8 text-red-600" />
      <div className="text-center"><div className="font-medium">{error}</div>
        <button onClick={() => navigate('/driver')} className="text-indigo-600 hover:underline text-sm mt-2">Back to dashboard</button>
      </div>
    </div>
  );

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === recovery.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-rose-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/driver')} className="p-2 rounded-lg hover:bg-rose-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">{recovery.customerName}</div>
            <div className="text-rose-300 text-xs">Recovery · {recovery.customerCity}, {recovery.customerState}</div>
          </div>
          <div className="h-3 w-3 rounded-full bg-rose-400" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Progress */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold
                  ${idx < currentStepIdx ? 'bg-green-500 text-white' :
                    idx === currentStepIdx ? 'bg-rose-600 text-white' :
                    'bg-gray-200 text-gray-500'}`}>
                  {idx < currentStepIdx ? '✓' : idx + 1}
                </div>
                <span className="text-xs text-gray-500 hidden sm:block">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              {recovery.customerName}<br />
              {recovery.customerCity}, {recovery.customerState}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-gray-900">Items to Recover</h3>
          {(recovery.items || []).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-gray-800">{item.equipmentName}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">Qty: {item.quantity}</span>
            </div>
          ))}
          {(!recovery.items || recovery.items.length === 0) && (
            <div className="text-xs text-gray-400">No items listed</div>
          )}
        </div>

        {/* Side-by-side comparison */}
        {['arrived', 'photos_captured', 'loaded', 'returned_to_branch'].includes(recovery.status) && deliveryPhotos.length > 0 && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <button
              onClick={() => setShowComparison(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition"
            >
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <SplitSquareHorizontal className="w-4 h-4" />
                Compare: Delivery vs. Recovery ({deliveryPhotos.length} delivery photo{deliveryPhotos.length !== 1 ? 's' : ''})
              </div>
              <span className="text-xs text-amber-600">{showComparison ? 'Hide' : 'Show'}</span>
            </button>
            {showComparison && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500">Left: taken at delivery · Right: take recovery photo for comparison</p>
                <div className="grid grid-cols-2 gap-3">
                  {deliveryPhotos.map((dp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        📦 Delivery — {new Date(dp.timestamp).toLocaleDateString()}
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden border border-blue-200">
                        <img src={dp.url} alt={`Delivery ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      {photos[idx] && (
                        <>
                          <div className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            🔄 Recovery — {new Date(photos[idx].timestamp).toLocaleTimeString()}
                          </div>
                          <div className="aspect-square rounded-lg overflow-hidden border border-rose-200">
                            <img src={photos[idx].url} alt={`Recovery ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        </>
                      )}
                      {!photos[idx] && (
                        <div className="aspect-square rounded-lg border-2 border-dashed border-rose-200 flex items-center justify-center text-xs text-rose-400">
                          Take recovery photo ↓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photos — show when arrived or later */}
        {['arrived', 'photos_captured', 'loaded', 'returned_to_branch'].includes(recovery.status) && (
          <PhotoCapture
            photos={photos}
            onAddPhoto={(photo) => setPhotos([...photos, photo])}
            onRemovePhoto={removePhoto}
          />
        )}

        {/* Damage notes */}
        {recovery.detectedDamages && recovery.detectedDamages.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Damage Notes</h3>
            {recovery.detectedDamages.map((d, idx) => (
              <div key={idx} className="text-sm text-red-800">{d.equipmentName}: {d.damageType} — {d.severity}</div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {recovery.status === 'scheduled' && (
            <Button onClick={() => handleStatusUpdate('departed')} disabled={updating} className="w-full bg-rose-600 hover:bg-rose-700">
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Departed to Customer
            </Button>
          )}
          {recovery.status === 'departed' && (
            <Button onClick={() => handleStatusUpdate('arrived')} disabled={updating} className="w-full bg-rose-600 hover:bg-rose-700">
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Arrived at Location
            </Button>
          )}
          {recovery.status === 'arrived' && (
            <Button onClick={() => handleStatusUpdate('photos_captured')} disabled={updating || photos.length === 0} className="w-full bg-rose-600 hover:bg-rose-700">
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Photos Captured ({photos.length})
            </Button>
          )}
          {recovery.status === 'photos_captured' && (
            <Button onClick={() => handleStatusUpdate('loaded')} disabled={updating} className="w-full bg-rose-600 hover:bg-rose-700">
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Equipment Loaded
            </Button>
          )}
          {recovery.status === 'loaded' && (
            <Button onClick={() => handleStatusUpdate('returned_to_branch')} disabled={updating} className="w-full bg-rose-600 hover:bg-rose-700">
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Returned to Branch
            </Button>
          )}
          {recovery.status === 'returned_to_branch' && (
            <>
              <Button
                onClick={async () => {
                  await base44.entities.Equipment.update(recovery.equipmentId, { unitStatus: 'under_inspection' });
                  alert('✓ Equipment flagged for shop inspection');
                }}
                disabled={updating}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                🚩 Flag for Shop Inspection
              </Button>
              <Button onClick={() => handleStatusUpdate('completed')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Mark Recovery Complete (No Repair)
              </Button>
            </>
          )}
          {recovery.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm text-green-800 font-medium">
              ✅ Recovery Completed at {new Date(recovery.completedAt).toLocaleTimeString()}
            </div>
          )}

          {['returned_to_branch', 'completed'].includes(recovery.status) && (
            <ClaimPackageButton recovery={recovery} deliveryPhotos={deliveryPhotos} />
          )}
        </div>
      </div>
    </div>
  );
}