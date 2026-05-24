import { CheckCircle2, Circle } from 'lucide-react';

function ClockInQR({ branch, jobReference, jobType }) {
  if (!branch && !jobReference) return null;
  const params = new URLSearchParams();
  if (branch) params.set('branch', branch);
  if (jobReference) params.set('job', jobReference);
  if (jobType) params.set('jobType', jobType);
  const url = `${window.location.origin}/clockin?${params.toString()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`;
  return (
    <div className="border rounded-lg p-3 bg-indigo-50 flex items-center gap-3">
      <img src={qrUrl} alt="Clock-in QR" className="w-20 h-20 flex-shrink-0" />
      <div className="text-xs text-indigo-800">
        <div className="font-bold mb-1">📲 Staff Clock-In</div>
        <div>Branch: {branch || '—'}</div>
        {jobReference && <div>Job: {jobReference}</div>}
        <div className="text-indigo-500 mt-1 break-all">{url}</div>
      </div>
    </div>
  );
}

export default function ManifestChecklist({ items, onCheckItem, branch, jobReference, jobType }) {
  const allChecked = items.every(i => i.checked);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Pre-Departure Checklist</h3>
        {allChecked && <div className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">✓ All checked</div>}
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onCheckItem(idx, !item.checked)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition active:scale-[0.99] text-left
              ${item.checked ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50'}`}
          >
            {item.checked ? (
              <CheckCircle2 className="w-7 h-7 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="w-7 h-7 text-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-base ${item.checked ? 'text-green-800 line-through opacity-70' : 'text-gray-900'}`}>{item.equipmentName}</div>
              <div className="text-sm text-gray-500 mt-0.5">Qty: {item.quantity}</div>
            </div>
          </button>
        ))}
      </div>

      {!allChecked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2 rounded-lg">
          Check off all items before departing
        </div>
      )}

      <ClockInQR branch={branch} jobReference={jobReference} jobType={jobType} />
    </div>
  );
}