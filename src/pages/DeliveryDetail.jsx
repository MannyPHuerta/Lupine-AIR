import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, Check, MapPin, Phone, AlertCircle, MessageSquare, CalendarClock, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ManifestChecklist from '@/components/delivery/ManifestChecklist';
import PhotoCapture from '@/components/delivery/PhotoCapture';
import SignaturePad from '@/components/delivery/SignaturePad';
import DeliveryRescheduleModal from '@/components/delivery/DeliveryRescheduleModal';
import { useDeliveryOfflineQueue } from '@/hooks/useDeliveryOfflineQueue';

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState(null);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const { isOnline, pendingCount, syncing, enqueue, syncQueue } = useDeliveryOfflineQueue();

  useEffect(() => {
    if (!id || id === ':id') {
      setError('Invalid delivery ID');
      setLoading(false);
      return;
    }

    base44.entities.Delivery.filter({ id })
      .then(async ([delivery]) => {
        if (!delivery) {
          setError('Delivery not found');
          setLoading(false);
          return;
        }
        setDelivery(delivery);
        setPhotos(delivery.photos || []);
        if (delivery.rentalId) {
          const rentals = await base44.entities.Rental.filter({ id: delivery.rentalId });
          setRental(rentals[0] || null);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    const updates = { status: newStatus };
    const now = new Date().toISOString();

    if (newStatus === 'departed') {
      updates.departedAt = now;
    } else if (newStatus === 'arrived') {
      updates.arrivedAt = now;
    } else if (newStatus === 'setup_complete') {
      updates.photos = photos;
    } else if (newStatus === 'signed') {
      updates.signatureDataUrl = signature;
      updates.signedAt = now;
    } else if (newStatus === 'completed') {
      updates.completedAt = now;
    }

    // Optimistically update UI immediately
    setDelivery(d => ({ ...d, ...updates }));

    if (!isOnline) {
      // Queue all changes for later sync
      enqueue('delivery_status', { deliveryId: id, updates });
      if (newStatus === 'setup_complete' && photos.length > 0) {
        enqueue('delivery_photos', { deliveryId: id, photos });
      }
      if (newStatus === 'signed' && signature) {
        enqueue('delivery_signature', { deliveryId: id, signatureDataUrl: signature, signedAt: now });
      }
      if (newStatus === 'departed' && rental?.id && ['contract', 'reservation', 'quote'].includes(rental.status)) {
        enqueue('rental_status', { rentalId: rental.id, status: 'out' });
        setRental(r => ({ ...r, status: 'out' }));
      }
      if (newStatus === 'completed' && rental?.id) {
        if (['contract', 'reservation', 'quote'].includes(rental.status)) {
          enqueue('rental_status', { rentalId: rental.id, status: 'out' });
          setRental(r => ({ ...r, status: 'out' }));
        }
        if (rental.equipmentId) {
          enqueue('equipment_status', { equipmentId: rental.equipmentId, unitStatus: 'out_on_rental' });
        }
      }
      setUpdating(false);
      return;
    }

    try {
      await base44.entities.Delivery.update(id, updates);

      if (newStatus === 'departed' && rental?.id && ['contract', 'reservation', 'quote'].includes(rental.status)) {
        await base44.entities.Rental.update(rental.id, { status: 'out' });
        setRental(r => ({ ...r, status: 'out' }));
      }

      if (newStatus === 'completed' && rental?.id) {
        if (['contract', 'reservation', 'quote'].includes(rental.status)) {
          await base44.entities.Rental.update(rental.id, { status: 'out' });
          setRental(r => ({ ...r, status: 'out' }));
        }
        if (rental.equipmentId) {
          await base44.entities.Equipment.update(rental.equipmentId, { unitStatus: 'out_on_rental' });
        }
      }
    } catch (err) {
      // Roll back optimistic update and queue for retry
      enqueue('delivery_status', { deliveryId: id, updates });
      alert(`Saved offline — will sync when connection is restored.`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
        <div className="text-gray-700 text-center">
          <div className="font-medium">{error}</div>
          <button
            onClick={() => navigate(-1)}
            className="text-indigo-600 hover:underline text-sm mt-2"
          >
            Back to driver dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Delivery not found</div>
      </div>
    );
  }

  const sendSMS = async (messageType) => {
    setSendingSMS(true);
    try {
      await base44.functions.invoke('driverSMS', { deliveryId: id, messageType });
      alert('SMS sent to customer');
    } catch (err) {
      alert(`SMS failed: ${err.message}`);
    } finally {
      setSendingSMS(false);
    }
  };

  const canProceed = {
    departed: delivery.items?.every(i => i.checked) || false,
    arrived: delivery.status === 'departed',
    setup_complete: photos.length > 0,
    signed: photos.length > 0,
    completed: signature !== null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white p-3 rounded-xl hover:bg-indigo-800 active:bg-indigo-700 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold leading-tight truncate">{delivery.customerName}</div>
            <div className="text-indigo-300 text-sm mt-0.5">{delivery.customerCity}, {delivery.customerState}</div>
          </div>
          {!['completed','cancelled','departed','arrived','setup_complete','signed'].includes(delivery.status) && (
            <button
              onClick={() => setShowReschedule(true)}
              className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex-shrink-0"
            >
              <CalendarClock className="w-4 h-4" /> Reschedule
            </button>
          )}
          <StatusIndicator status={delivery.status} />
        </div>

        {/* Progress stepper */}
        <DeliveryProgressBar status={delivery.status} />
      </div>

      {/* Offline / Pending Sync Banner */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`px-4 py-4 flex items-center gap-3 text-base font-semibold ${!isOnline ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span>You're offline — changes saved locally and will sync automatically.</span>
            </>
          ) : (
            <>
              <RefreshCw className={`w-4 h-4 flex-shrink-0 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing…' : `${pendingCount} pending change(s) — tap to sync`}</span>
              {!syncing && (
                <button onClick={syncQueue} className="ml-auto underline text-xs font-semibold">Sync now</button>
              )}
            </>
          )}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Info */}
        <div className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-base text-gray-700">
              {delivery.customerAddress}<br />
              {delivery.customerCity}, {delivery.customerState} {delivery.customerZip}
            </div>
          </div>
          {delivery.customerPhone && (
            <a href={`tel:${delivery.customerPhone}`} className="flex items-center gap-3 text-base text-indigo-600 active:text-indigo-800">
              <Phone className="w-5 h-5 flex-shrink-0" />
              {delivery.customerPhone}
            </a>
          )}
          {delivery.customerPhone && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => sendSMS('on_my_way')}
                disabled={sendingSMS}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-3 rounded-xl hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-50 transition"
              >
                <MessageSquare className="w-4 h-4" /> On My Way
              </button>
              <button
                onClick={() => sendSMS('arrived')}
                disabled={sendingSMS}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-3 py-3 rounded-xl hover:bg-amber-100 active:bg-amber-200 disabled:opacity-50 transition"
              >
                <MessageSquare className="w-4 h-4" /> Arrived
              </button>
            </div>
          )}
        </div>

        {/* Manifest Checklist */}
        {delivery.status === 'scheduled' || delivery.status === 'departed' ? (
          <ManifestChecklist
            items={delivery.items || []}
            onCheckItem={(idx, checked) => {
              const updated = [...delivery.items];
              updated[idx].checked = checked;
              setDelivery({ ...delivery, items: updated });
            }}
            branch={delivery.branch}
            jobReference={delivery.rentalId}
            jobType="delivery"
          />
        ) : null}

        {/* Photos */}
        {(delivery.status === 'arrived' || delivery.status === 'setup_complete' || delivery.status === 'signed') && (
          <PhotoCapture
            photos={photos}
            onAddPhoto={(photo) => setPhotos([...photos, photo])}
            onRemovePhoto={(idx) => setPhotos(photos.filter((_, i) => i !== idx))}
          />
        )}

        {/* Signature */}
        {delivery.status === 'setup_complete' || delivery.status === 'signed' ? (
          <SignaturePad onSignatureCapture={setSignature} existingSignature={delivery.signatureDataUrl} />
        ) : null}

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          {delivery.status === 'scheduled' && (
            <Button
              onClick={() => handleStatusUpdate('departed')}
              disabled={updating}
              className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Mark as Departed
            </Button>
          )}

          {delivery.status === 'departed' && (
            <Button
              onClick={() => handleStatusUpdate('arrived')}
              disabled={updating || !canProceed.arrived}
              className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Mark as Arrived
            </Button>
          )}

          {delivery.status === 'arrived' && (
            <Button
              onClick={() => handleStatusUpdate('setup_complete')}
              disabled={updating}
              className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Setup Complete
            </Button>
          )}

          {delivery.status === 'setup_complete' && (
            <Button
              onClick={() => handleStatusUpdate('signed')}
              disabled={updating || photos.length === 0}
              className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Get Signature
            </Button>
          )}

          {delivery.status === 'signed' && (
            <Button
              onClick={() => handleStatusUpdate('completed')}
              disabled={updating || !signature}
              className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl shadow-md"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Complete Delivery ✓
            </Button>
          )}

          {delivery.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center text-base text-green-800 font-semibold">
              ✅ Delivery Completed at {new Date(delivery.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {showReschedule && (
        <DeliveryRescheduleModal
          delivery={delivery}
          onClose={() => setShowReschedule(false)}
          onSaved={(updated) => { setDelivery(updated); setShowReschedule(false); }}
        />
      )}
    </div>
  );
}

function StatusIndicator({ status }) {
  const colors = {
    scheduled: 'bg-blue-400',
    departed: 'bg-indigo-400',
    arrived: 'bg-amber-400',
    setup_complete: 'bg-purple-400',
    signed: 'bg-green-400',
    completed: 'bg-green-500',
  };

  return (
    <div className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-400'}`} />
  );
}

function DeliveryProgressBar({ status }) {
  const steps = [
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'departed',  label: 'Departed' },
    { key: 'arrived',   label: 'Arrived' },
    { key: 'setup_complete', label: 'Setup' },
    { key: 'signed',    label: 'Signed' },
    { key: 'completed', label: 'Done' },
  ];
  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {idx > 0 && <div className={`flex-1 h-0.5 ${done || active ? 'bg-indigo-300' : 'bg-white/20'}`} />}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-green-400' : active ? 'bg-white' : 'bg-white/30'}`} />
                {idx < steps.length - 1 && <div className={`flex-1 h-0.5 ${done ? 'bg-indigo-300' : 'bg-white/20'}`} />}
              </div>
              <div className={`text-[9px] mt-1 ${active ? 'text-white font-bold' : done ? 'text-indigo-300' : 'text-white/40'}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}