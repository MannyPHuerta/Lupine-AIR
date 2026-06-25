import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneUS } from '@/lib/phoneUtils';
import { useBranches } from '@/hooks/useBranches';

// Fallback branches used only when the DB has no BranchSettings records yet
const FALLBACK_BRANCHES = [
  '01 McAllen', '02 Weslaco', '03 Harlingen',
  '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse',
];

const DEFAULT_PREFIXES = {
  '01 McAllen':    'MCL',
  '02 Weslaco':    'WES',
  '03 Harlingen':  'HRL',
  '05 Brownsville':'BRN',
  '06 Corpus':     'CRP',
  '98 Shop':       'SHP',
  '99 Warehouse':  'WRH',
};

export default function BranchSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});   // branch -> { id?, prefix, nextNumber, address, phone, email, defaultAreaCode, certifications }
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const { branches: dbBranches } = useBranches();

  useEffect(() => {
    supabaseData.BranchSettings.list().then(records => {
      const map = {};
      records.forEach(r => {
        map[r.branch] = {
          id: r.id,
          prefix: r.invoice_prefix || DEFAULT_PREFIXES[r.branch] || '',
          nextNumber: r.next_invoice_number ?? 1000,
          address: r.address || '',
          phone: r.phone || '',
          email: r.email || '',
          partsBuyerEmail: r.parts_buyer_email || '',
          purchasingEmail: r.purchasing_email || '',
          accountingEmail: r.accounting_email || '',
          defaultAreaCode: r.default_area_code || '',
          certifications: r.certifications || [],
        };
      });
      // Merge DB branches with fallback defaults — any new branch in the DB shows up automatically
      const allBranchNames = [...new Set([...dbBranches, ...FALLBACK_BRANCHES])].sort();
      allBranchNames.forEach(b => {
        if (!map[b]) map[b] = { id: null, prefix: DEFAULT_PREFIXES[b] || '', nextNumber: 1000, address: '', phone: '', email: '', partsBuyerEmail: '', purchasingEmail: '', accountingEmail: '', defaultAreaCode: '', certifications: [] };
      });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const handleChange = (branch, field, value) => {
    setSettings(prev => ({ ...prev, [branch]: { ...prev[branch], [field]: value } }));
  };

  const handleSave = async (branch) => {
    const s = settings[branch];
    setSaving(prev => ({ ...prev, [branch]: true }));
    const payload = {
      branch,
      invoicePrefix: s.prefix,
      nextInvoiceNumber: parseInt(s.nextNumber) || 1000,
      address: s.address,
      phone: s.phone,
      email: s.email,
      partsBuyerEmail: s.partsBuyerEmail,
      purchasingEmail: s.purchasingEmail,
      accountingEmail: s.accountingEmail,
      defaultAreaCode: s.defaultAreaCode,
      certifications: s.certifications || [],
    };
    if (s.id) {
      await supabaseData.BranchSettings.update(s.id, payload);
    } else {
      const created = await supabaseData.BranchSettings.create(payload);
      setSettings(prev => ({ ...prev, [branch]: { ...prev[branch], id: created.id } }));
    }
    setSaving(prev => ({ ...prev, [branch]: false }));
    setSaved(prev => ({ ...prev, [branch]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [branch]: false })), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader title="Branch Invoice Settings" subtitle="Configure invoice numbering per branch" backTo="/availability" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Each invoice number is formatted as <strong>PREFIX-NNNN</strong> (e.g. <strong>MCL-1042</strong>).
              The counter auto-increments with each confirmed invoice.
            </p>

            {Object.keys(settings).sort().map(branch => {
              const s = settings[branch] || { prefix: '', nextNumber: 1000, address: '', phone: '', email: '' };
              const preview = `${s.prefix || '???'}-${String(s.nextNumber || 1000).padStart(4, '0')}`;
              return (
                <div key={branch} className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-semibold text-gray-900">{branch}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Next invoice: <span className="font-mono font-medium text-indigo-600">{preview}</span></div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(branch)}
                      disabled={saving[branch]}
                      className="text-white hover:opacity-90" style={{ backgroundColor: saved[branch] ? '#16a34a' : '#F5A623' }}
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {saved[branch] ? 'Saved!' : saving[branch] ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Prefix</label>
                        <Input
                          value={s.prefix}
                          onChange={e => handleChange(branch, 'prefix', e.target.value.toUpperCase().slice(0, 6))}
                          placeholder="e.g. MCL"
                          className="font-mono uppercase"
                          maxLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Next Invoice Number</label>
                        <Input
                          type="number"
                          min="1"
                          value={s.nextNumber}
                          onChange={e => handleChange(branch, 'nextNumber', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="border-t pt-4">
                       <div className="text-xs font-semibold text-gray-700 mb-3">Contact Information</div>
                       <div className="grid grid-cols-1 gap-4">
                         <div>
                           <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                           <Input
                             value={s.address}
                             onChange={e => handleChange(branch, 'address', e.target.value)}
                             placeholder="Street address"
                           />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                             <Input
                               value={s.phone}
                               onChange={e => handleChange(branch, 'phone', formatPhoneUS(e.target.value))}
                               placeholder="(956) 123-4567"
                               inputMode="numeric"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                             <Input
                               type="email"
                               value={s.email}
                               onChange={e => handleChange(branch, 'email', e.target.value)}
                               placeholder="branch@example.com"
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                     <div className="border-t pt-4">
                       <div className="text-xs font-semibold text-gray-700 mb-3">Local Defaults</div>
                       <div className="grid grid-cols-2 gap-4 mb-4">
                         <div>
                           <label className="block text-xs font-medium text-gray-600 mb-1">Default Area Code</label>
                           <Input
                             value={s.defaultAreaCode}
                             onChange={e => handleChange(branch, 'defaultAreaCode', e.target.value.replace(/\D/g, '').slice(0, 3))}
                             placeholder="e.g. 956"
                             inputMode="numeric"
                             maxLength={3}
                           />
                           <p className="text-xs text-gray-400 mt-1">Auto-fills area code when entering customer phone numbers.</p>
                         </div>
                       </div>
                       <div>
                         <label className="block text-xs font-medium text-gray-600 mb-2">Branch Certifications / Licenses</label>
                         <div className="flex gap-2 mb-2">
                           <Input
                             placeholder="e.g. TX Rental Dealer License, DOT #123456"
                             onKeyDown={e => {
                               if (e.key === 'Enter' && e.target.value.trim()) {
                                 handleChange(branch, 'certifications', [...(s.certifications || []), e.target.value.trim()]);
                                 e.target.value = '';
                               }
                             }}
                           />
                           <Button variant="outline" size="sm" onClick={e => {
                             const input = e.target.closest('.border-t').querySelector('input:not([readonly])');
                             if (input?.value.trim()) {
                               handleChange(branch, 'certifications', [...(s.certifications || []), input.value.trim()]);
                               input.value = '';
                             }
                           }}>Add</Button>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {(s.certifications || []).map((cert, ci) => (
                             <span key={ci} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-200">
                               {cert}
                               <button onClick={() => handleChange(branch, 'certifications', s.certifications.filter((_, i) => i !== ci))} className="text-indigo-400 hover:text-indigo-700 ml-0.5">×</button>
                             </span>
                           ))}
                           {(s.certifications || []).length === 0 && <span className="text-xs text-gray-400">No certifications added yet</span>}
                         </div>
                       </div>
                     </div>
                     <div className="border-t pt-4">
                       <div className="text-xs font-semibold text-gray-700 mb-3">Parts Requests</div>
                       <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Default Parts Buyer Email</label>
                         <Input
                           type="email"
                           value={s.partsBuyerEmail}
                           onChange={e => handleChange(branch, 'partsBuyerEmail', e.target.value)}
                           placeholder="buyer@example.com"
                         />
                         <p className="text-xs text-gray-500 mt-1">Shop Floor will use this email by default; supervisors can override it manually.</p>
                       </div>
                     </div>
                     <div className="border-t pt-4">
                       <div className="text-xs font-semibold text-gray-700 mb-3">Procurement Routing</div>
                       <div className="grid grid-cols-1 gap-4">
                         <div>
                           <label className="block text-xs font-medium text-gray-600 mb-1">Purchasing Department Email</label>
                           <Input
                             type="email"
                             value={s.purchasingEmail}
                             onChange={e => handleChange(branch, 'purchasingEmail', e.target.value)}
                             placeholder="purchasing@example.com"
                           />
                           <p className="text-xs text-gray-500 mt-1">Notified when a PO is submitted for purchasing review.</p>
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-gray-600 mb-1">Accounting Email</label>
                           <Input
                             type="email"
                             value={s.accountingEmail}
                             onChange={e => handleChange(branch, 'accountingEmail', e.target.value)}
                             placeholder="accounting@example.com"
                           />
                           <p className="text-xs text-gray-500 mt-1">Receives a copy of every approved PO at the same time it is sent to the vendor.</p>
                         </div>
                       </div>
                     </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}