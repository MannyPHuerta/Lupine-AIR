import { CheckCircle2, AlertTriangle, XCircle, Clock, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'compliant', label: 'Compliant', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  { value: 'compliant_with_exception', label: 'Compliant w/ Exception', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { value: 'non_compliant', label: 'Non-Compliant', icon: XCircle, color: 'text-red-600 bg-red-50' },
  { value: 'not_applicable', label: 'N/A', icon: Minus, color: 'text-gray-500 bg-gray-50' },
  { value: 'pending_review', label: 'Pending Review', icon: Clock, color: 'text-blue-600 bg-blue-50' },
];

function statusStyle(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[4];
}

export default function RFQComplianceMatrix({ matrix = [], onChange }) {
  const updateRow = (index, field, value) => {
    const updated = [...matrix];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addRow = () => {
    onChange([...matrix, {
      sectionNumber: '',
      requirementSummary: '',
      complianceStatus: 'pending_review',
      responseText: '',
      exceptionNote: '',
      documentReference: '',
    }]);
  };

  const removeRow = (index) => {
    onChange(matrix.filter((_, i) => i !== index));
  };

  const counts = {
    compliant: matrix.filter(r => r.complianceStatus === 'compliant').length,
    exception: matrix.filter(r => r.complianceStatus === 'compliant_with_exception').length,
    non: matrix.filter(r => r.complianceStatus === 'non_compliant').length,
    pending: matrix.filter(r => r.complianceStatus === 'pending_review').length,
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 bg-white rounded-lg border p-4">
        <span className="text-sm font-semibold text-gray-700">Compliance Summary:</span>
        <span className="text-sm text-green-700 font-medium">✓ {counts.compliant} Compliant</span>
        <span className="text-sm text-amber-700 font-medium">⚠ {counts.exception} w/ Exception</span>
        <span className="text-sm text-red-700 font-medium">✗ {counts.non} Non-Compliant</span>
        <span className="text-sm text-blue-700 font-medium">⏳ {counts.pending} Pending</span>
      </div>

      {matrix.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <div>No requirements extracted yet. Run AI analysis to populate.</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 border-b">
            <div className="col-span-1">Section</div>
            <div className="col-span-3">Requirement</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Response / Statement</div>
            <div className="col-span-2">Exception / Doc Ref</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y">
            {matrix.map((row, i) => {
              const st = statusStyle(row.complianceStatus);
              return (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-start hover:bg-gray-50 transition">
                  <div className="col-span-1">
                    <input
                      value={row.sectionNumber || ''}
                      onChange={e => updateRow(i, 'sectionNumber', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="3.1"
                    />
                  </div>
                  <div className="col-span-3">
                    <textarea
                      value={row.requirementSummary || ''}
                      onChange={e => updateRow(i, 'requirementSummary', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs resize-none h-16 focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="Requirement description"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={row.complianceStatus || 'pending_review'}
                      onChange={e => updateRow(i, 'complianceStatus', e.target.value)}
                      className={`w-full border rounded px-2 py-1 text-xs font-medium ${st.color} focus:outline-none`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <textarea
                      value={row.responseText || ''}
                      onChange={e => updateRow(i, 'responseText', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs resize-none h-16 focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="Our response to this requirement"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <textarea
                      value={row.exceptionNote || ''}
                      onChange={e => updateRow(i, 'exceptionNote', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs resize-none h-8 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      placeholder="Exception note"
                    />
                    <input
                      value={row.documentReference || ''}
                      onChange={e => updateRow(i, 'documentReference', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="Doc ref (e.g. COI attached)"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500 transition p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button onClick={addRow} variant="outline" size="sm" className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-1" /> Add Requirement Row
      </Button>
    </div>
  );
}