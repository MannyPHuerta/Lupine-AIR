import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, Check, MapPin, Phone, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ManifestChecklist from '@/components/delivery/ManifestChecklist';
import PhotoCapture from '@/components/delivery/PhotoCapture';
import SignaturePad from '@/components/delivery/SignaturePad';

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
    
    if (newStatus === 'departed') {
      updates.departedAt = new Date().toISOString();
    } else if (newStatus === 'arrived') {
      updates.arrivedAt = new Date().toISOString();
    } else if (newStatus === 'setup_complete') {
      updates.photos = photos;
    } else if (newStatus === 'signed') {
      updates.signatureDataUrl = signature;
      updates.signedAt = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
    }

    try {
      await base44.entities.Delivery.update(id, updates);
      setDelivery({ ...delivery, ...updates });

      // Auto-advance Rental status when driver departs (equipment is now "out")
      if (newStatus === 'departed' && rental?.id && ['contract', 'reservation', 'quote'].includes(rental.status)) {
        await base44.entities.Rental.update(rental.id, { status: 'out' });
        setRental(r => ({ ...r, status: 'out' }));
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
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
            onClick={() => navigate('/driver')}
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
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/driver')} className="text-white p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">{delivery.customerName}</div>
            <div className="text-indigo-300 text-xs">{delivery.customerCity}, {delivery.customerState}</div>
          </div>
          <StatusIndicator status={delivery.status} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Info */}
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              {delivery.customerAddress}<br />
              {delivery.customerCity}, {delivery.customerState} {delivery.customerZip}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a href={`tel:${delivery.customerPhone}`} className="text-sm text-indigo-600 hover:underline">
              {delivery.customerPhone}
            </a>
          </div>
          {delivery.customerPhone && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => sendSMS('on_my_way')}
                disabled={sendingSMS}
                className="flex items-center gap-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 disabled:opacity-50"
              >
                <MessageSquare className="w-3 h-3" /> On My Way
              </button>
              <button
                onClick={() => sendSMS('arrived')}
                disabled={sendingSMS}
                className="flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-100 disabled:opacity-50"
              >
                <MessageSquare className="w-3 h-3" /> Arrived
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
        <div className="space-y-2">
          {delivery.status === 'scheduled' && (
            <Button
              onClick={() => handleStatusUpdate('departed')}
              disabled={updating}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Mark as Departed
            </Button>
          )}

          {delivery.status === 'departed' && (
            <Button
              onClick={() => handleStatusUpdate('arrived')}
              disabled={updating || !canProceed.arrived}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Mark as Arrived
            </Button>
          )}

          {delivery.status === 'arrived' && (
            <Button
              onClick={() => handleStatusUpdate('setup_complete')}
              disabled={updating}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Setup Complete
            </Button>
          )}

          {delivery.status === 'setup_complete' && (
            <Button
              onClick={() => handleStatusUpdate('signed')}
              disabled={updating || photos.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Get Signature
            </Button>
          )}

          {delivery.status === 'signed' && (
            <Button
              onClick={() => handleStatusUpdate('completed')}
              disabled={updating || !signature}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Complete Delivery
            </Button>
          )}

          {delivery.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm text-green-800 font-medium">
              ✅ Delivery Completed at {new Date(delivery.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({ status }) {
  const colors = {
    scheduled: 'bg-blue-600',
    departed: 'bg-indigo-600',
    arrived: 'bg-amber-600',
    setup_complete: 'bg-purple-600',
    signed: 'bg-green-600',
    completed: 'bg-green-700',
  };

  return (
    <div className={`h-3 w-3 rounded-full ${colors[status]}`} />
  );
}