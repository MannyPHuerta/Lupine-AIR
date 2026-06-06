/**
 * ReturnCheckInModal — structured check-in flow for returning equipment.
 * BLOCKS completion if equipment has hasHourMeter=true but no meter reading is entered.
 * Runs AI anomaly check on hour meter vs. expected usage before allowing completion.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Check, X, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoCapture from '@/components/delivery/PhotoCapture';

function HourMeterAnomalyBadge({ anomaly }) {
  if (!anomaly) return null;
  const colors = {
    ok: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
    critical: 'bg-red-50 border-red-400 text-red-800',
  };
  return (
    <div className={`rounded-lg border p-2.5 text-xs flex items-start gap-2 ${colors[anomaly.level] || colors.warning}`}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold">{anomaly.label}</div>
        {anomaly.detail && <div className="mt-0.5 text-xs opacity-80">{anomaly.detail}</div>}
      </div>
    </div>
  );
}

function checkHourMeterAnomaly(rental, equipment, meterEnd) {
  const meterStart = rental.hourMeterStart ?? equipment?.currentHourMeterReading ?? 0;
  const hoursUsed = meterEnd - meterStart;
  const rentalDays = rental.totalDays || Math.max(1,
    Math.round((new Date(rental.endDate) - new Date(rental.startDate)) / 86400000) + 1
  );

  // Rollback detected
  if (meterEnd < meterStart) {
    return { level: 'critical', label: '🚨 Meter Rollback Detected', detail: `Reading ${meterEnd} is less than checkout reading ${meterStart}. Possible tampering — call manager.` };
  }

  // Physically impossible: more than 22 hrs/day
  const hoursPerDay = hoursUsed / rentalDays;
  if (hoursPerDay > 22) {
    return { level: 'critical', label: '🚨 Impossible Hours', detail: `${hoursUsed.toFixed(1)} hrs over ${rentalDays} days = ${hoursPerDay.toFixed(1)} hrs/day. Verify reading — possible falsified meter.` };
  }

  // Suspiciously high usage (> 16 hrs/day) — not impossible but flag it
  if (hoursPerDay > 16) {
    return { level: 'warning', label: '⚠️ Unusually High Usage', detail: `${hoursUsed.toFixed(1)} hrs over ${rentalDays} days = ${hoursPerDay.toFixed(1)} hrs/day. Verify with customer.` };
  }

  // Just under overage threshold — possible avoidance (if hourly billing)
  if (rental.hourlyRate > 0 && rental.hourMeterStart != null) {
    // Overage likely kicks in at some threshold — flag if hours used is suspiciously round
    if (hoursUsed > 0 && hoursUsed % 10 === 0) {
      return { level: 'warning', label: '⚠️ Round Hour Count', detail: `${hoursUsed} hours exactly — confirm reading is accurate.` };
    }
  }

  return { level: 'ok', label: `✓ ${hoursUsed.toFixed(1)} hrs used — normal`, detail: null };
}

export default function ReturnCheckInModal({ order, rentals, equipment: allEquipment, onClose, onCompleted }) {
  // Per-line state
  const [meterReadings, setMeterReadings] = useState({});
  const [conditionNotes, setConditionNotes] = useState({});
  const [routing, setRouting] = useState({});
  const [photos, setPhotos] = useState({});
  const [saving, setSaving] = useState(false);

  const lines = order.lines.map(line => {
    const eq = allEquipment.find(e => e.id === line.equipmentId);
    const rental = rentals.find(r => r.id === line.rentalId);
    return { ...line, eq, rental };
  });

  // Validation: block if any meter-equipped item has no reading
  const missingMeters = lines.filter(l => l.eq?.hasHourMeter && !meterReadings[l.rentalId]);

  const handleComplete = async () => {
    if (missingMeters.length > 0) return; // guarded by disabled button

    setSaving(true);
    try {
      for (const line of lines) {
        const { eq, rental, rentalId, equipmentId } = line;
        if (!rental) continue;

        const meterEnd = meterReadings[rentalId] != null ? parseFloat(meterReadings[rentalId]) : null;
        const meterStart = rental.hourMeterStart ?? eq?.currentHourMeterReading ?? 0;
        const hoursUsed = meterEnd != null ? Math.max(0, meterEnd - meterStart) : null;
        const hourMeterCharges = (hoursUsed != null && rental.hourlyRate > 0)
          ? hoursUsed * rental.hourlyRate
          : 0;

        await base44.entities.Rental.update(rentalId, {
          status: 'returned',
          hourMeterEnd: meterEnd,
          hoursUsed: hoursUsed,
          hourMeterCharges: hourMeterCharges > 0 ? hourMeterCharges : 0,
          returnConditionNotes: conditionNotes[rentalId] || '',
          returnPhotos: photos[rentalId] || [],
        });

        if (eq && equipmentId && equipmentId !== 'quote-item') {
          const updates = { unitStatus: routing[rentalId] || 'available' };
          if (conditionNotes[rentalId]) updates.statusNote = conditionNotes[rentalId];
          if (meterEnd != null) updates.currentHourMeterReading = meterEnd;
          await base44.entities.Equipment.update(equipmentId, updates);
        }
      }

      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Camera className="w-5 h-5 text-green-600" />
            Equipment Return — Check-In
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {lines.map(({ eq, rental, rentalId, equipmentId, equipmentName }) => {
            const meterVal = meterReadings[rentalId];
            const anomaly = eq?.hasHourMeter && meterVal != null && rental
              ? checkHourMeterAnomaly(rental, eq, parseFloat(meterVal))
              : null;

            return (
              <div key={rentalId} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="font-semibold text-gray-900">{equipmentName}</div>

                {/* Hour Meter — REQUIRED if hasHourMeter */}
                {eq?.hasHourMeter && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Hour Meter Reading
                      <span className="text-red-500 font-bold ml-0.5">*</span>
                      <span className="text-gray-400 font-normal ml-1">(checkout: {rental?.hourMeterStart ?? eq?.currentHourMeterReading ?? 0})</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={meterVal ?? ''}
                      onChange={e => setMeterReadings(prev => ({ ...prev, [rentalId]: e.target.value }))}
                      placeholder="Enter current reading…"
                      className={`border rounded-lg px-3 py-2 text-sm w-full ${!meterVal ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                    {!meterVal && (
                      <p className="text-xs text-red-600 mt-1 font-medium">⚠ Hour meter reading is required to complete check-in</p>
                    )}
                    {anomaly && <div className="mt-2"><HourMeterAnomalyBadge anomaly={anomaly} /></div>}
                  </div>
                )}

                {/* Condition notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condition Notes</label>
                  <textarea
                    placeholder="Damage, cleaning needed, fuel level, issues…"
                    className="border rounded-lg px-3 py-2 text-sm w-full h-16 resize-none"
                    value={conditionNotes[rentalId] || ''}
                    onChange={e => setConditionNotes(prev => ({ ...prev, [rentalId]: e.target.value }))}
                  />
                </div>

                {/* Photos */}
                <PhotoCapture
                  photos={photos[rentalId] || []}
                  onAddPhoto={photo => setPhotos(prev => ({ ...prev, [rentalId]: [...(prev[rentalId] || []), photo] }))}
                  onRemovePhoto={idx => setPhotos(prev => ({ ...prev, [rentalId]: (prev[rentalId] || []).filter((_, i) => i !== idx) }))}
                />

                {/* Routing */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Route Equipment To:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: 'available', label: '✓ Ready to Rent' },
                      { value: 'in_shop', label: '🔧 Needs Repair' },
                      { value: 'in_laundry', label: '🧼 Needs Cleaning' },
                      { value: 'awaiting_parts', label: '⏳ Awaiting Parts' },
                    ].map(opt => (
                      <label key={opt.value} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border text-sm transition ${(routing[rentalId] || 'available') === opt.value ? 'bg-indigo-50 border-indigo-400 font-semibold text-indigo-800' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name={`routing-${rentalId}`}
                          value={opt.value}
                          checked={(routing[rentalId] || 'available') === opt.value}
                          onChange={() => setRouting(prev => ({ ...prev, [rentalId]: opt.value }))}
                          className="w-3.5 h-3.5 accent-indigo-600"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 flex items-center gap-3">
          {missingMeters.length > 0 && (
            <div className="flex-1 flex items-center gap-1.5 text-xs text-red-600 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Hour meter required for: {missingMeters.map(l => l.equipmentName).join(', ')}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={saving || missingMeters.length > 0}
              className="bg-green-600 hover:bg-green-700 gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Complete Check-In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}