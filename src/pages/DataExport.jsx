import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppPageHeader from '@/components/AppPageHeader';
import { Download, Database, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ENTITY_LIST = [
  'Equipment', 'Rental', 'Customer', 'Delivery', 'WorkOrder',
  'MaintenanceLog', 'Expense', 'Recovery', 'Report', 'InventoryItem',
  'BranchSettings', 'CompanySettings', 'AvailabilityConfig', 'DeliveryMatrix',
  'VolumeDiscountRule', 'PromoCode', 'DiscountLog', 'AuditLog',
  'RentalAgreement', 'EquipmentCategory', 'MechanicProfile', 'Timesheet',
  'PartRequirement', 'PartsProcurement', 'RFQRecord', 'EventPlan',
  'PredictiveAlert', 'GPSProvider', 'EquipmentGPSLink', 'StaffPhone',
  'DriverLocation', 'PaymentSettings', 'CustomEmail', 'Role'
];

export default function DataExport() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [recordCount, setRecordCount] = useState(null);

  const handleExport = async () => {
    setStatus('loading');
    setErrorMsg('');
    setRecordCount(null);

    try {
      const response = await base44.functions.invoke('exportAllData', {});
      const data = response.data;

      // Count total records
      let total = 0;
      for (const key of Object.keys(data.entities || {})) {
        const val = data.entities[key];
        if (Array.isArray(val)) total += val.length;
      }
      setRecordCount(total);

      // Trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `air-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message || 'Export failed');
      setStatus('error');
    }
  };

  return (
    <div>
      <AppPageHeader
        title="Data Export & Backup"
        subtitle="Download a complete backup of all platform data"
        icon={Database}
      />

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Info card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3">
          <h2 className="font-bold text-blue-900 text-lg">What's included in the export</h2>
          <p className="text-blue-700 text-sm">
            A full JSON snapshot of all {ENTITY_LIST.length} entity types — equipment, rentals, customers,
            deliveries, work orders, expenses, and all settings. Use it for:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Platform backup / disaster recovery</li>
            <li>Migrating to a new instance (new subscriber onboarding)</li>
            <li>Data portability / switching platforms</li>
            <li>Offline archive</li>
          </ul>
        </div>

        {/* Entity list */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Entities exported</h3>
          <div className="flex flex-wrap gap-2">
            {ENTITY_LIST.map(e => (
              <span key={e} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md font-mono">{e}</span>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">Full Data Export</div>
              <div className="text-sm text-gray-500">Downloads as a single JSON file</div>
            </div>
            <Button
              onClick={handleExport}
              disabled={status === 'loading'}
              className="gap-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="w-4 h-4" /> Export All Data</>
              )}
            </Button>
          </div>

          {status === 'done' && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Export complete — {recordCount?.toLocaleString()} total records downloaded.
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Admin access required. Export includes all branches and all records. Large datasets may take 30–60 seconds.
        </p>
      </div>
    </div>
  );
}