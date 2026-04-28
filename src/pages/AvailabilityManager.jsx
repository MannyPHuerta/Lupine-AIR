import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings, Link2, History, Printer, Building2, Cog, Activity } from 'lucide-react';
import { openInvoiceWindow, writeInvoiceToWindow } from '@/lib/buildInvoiceHTML';
import { Button } from '@/components/ui/button';
import { CustomerIdentity } from '@/components/invoice/CustomerHeader';
import EquipmentLineItem from '@/components/invoice/EquipmentLineItem';
import InvoiceTotals from '@/components/invoice/InvoiceTotals';

const EMPTY_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  branch: '01 McAllen',
  notes: '',
};

const newLine = () => ({
  id: crypto.randomUUID(),
  equipmentId: '',
  equipmentName: '',
  quantity: 1,
  rate: 0,
  baseAmount: 0,
  taxable: true,
  deposit: 0,
});

export default function AvailabilityManager() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [lines, setLines] = useState([newLine()]);
  const [discount, setDiscount] = useState('');
  const [taxRate, setTaxRate] = useState('8.25');
  const [amountPaid, setAmountPaid] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const qtyRefs = useRef({});
  const addButtonRef = useRef(null);

  const [companyInfo, setCompanyInfo] = useState(null);
  const [branchSettings, setBranchSettings] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-created_date', 1000),
      base44.entities.CompanySettings.list(),
      base44.entities.BranchSettings.list(),
    ]).then(([eq, rent, company, branches]) => {
      setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
      setRentals(rent);
      setCompanyInfo(company[0] || null);
      const branchMap = {};
      branches.forEach(b => { branchMap[b.branch] = b; });
      setBranchSettings(branchMap);
      setLoading(false);
    });
  }, []);

  const updateLine = (id, updated) => {
    setLines(prev => prev.map(l => l.id === id ? updated : l));
  };

  const removeLine = (id) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const addLine = () => {
    setLines(prev => {
      const last = prev[prev.length - 1];
      return [...prev, { ...newLine(), startDate: last?.startDate || '', endDate: last?.endDate || '' }];
    });
  };

  const handleAddSuggestedItem = (sugg, startDate, endDate, eq) => {
    const newItem = {
      ...newLine(),
      equipmentId: sugg.id,
      equipmentName: sugg.name,
      startDate: startDate || '',
      endDate: endDate || '',
      taxable: eq?.taxable !== false,
      deposit: eq?.depositRequired || 0,
    };
    const rate = calcRate(eq, calcDays(startDate, endDate));
    const days = calcDays(startDate, endDate);
    const baseAmount = Math.round(rate * days * 100) / 100;
    setLines(prev => [...prev, { ...newItem, rate, baseAmount }]);
  };

  const calcRate = (eq, days) => {
    if (!eq) return 0;
    if (days >= 30 && eq.monthlyRate) return eq.monthlyRate / 30;
    if (days >= 7 && eq.weeklyRate) return eq.weeklyRate / 7;
    return eq.dailyRate || 0;
  };

  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    return Math.floor((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
  };

  const buildOrder = (validLines, invNumber = '') => ({
    id: invNumber || null,
    createdAt: new Date().toISOString(),
    taxRate: parseFloat(taxRate) || 8.25,
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      branch: customer.branch,
      notes: customer.notes,
    },
    lines: validLines.map(l => {
      const eqRecord = equipment.find(e => e.id === l.equipmentId);
      return {
        equipmentId: l.equipmentId,
        equipmentName: l.equipmentName,
        quantity: l.quantity || 1,
        rate: l.rate || 0,
        baseAmount: l.baseAmount || 0,
        taxable: l.taxable !== false,
        deposit: l.deposit || 0,
        startDate: l.startDate,
        endDate: l.endDate,
        specs: eqRecord?.specs || {},
      };
    }),
  });

  const validate = () => {
    if (!customer.name) { alert('Please fill in customer name.'); return false; }
    const validLines = lines.filter(l => l.equipmentId);
    if (validLines.length === 0) { alert('Please add at least one equipment item.'); return false; }
    if (validLines.some(l => !l.startDate || !l.endDate)) { alert('Please set dates for all equipment lines.'); return false; }
    return validLines;
  };

  const handleSave = async (status = 'pending') => {
    const validLines = validate();
    if (!validLines) return;

    const taxRateDecimal = (parseFloat(taxRate) || 8.25) / 100;
    const paid = parseFloat(amountPaid) || 0;

    // Fetch and increment invoice number for confirmed invoices
    let invoiceNumber = '';
    if (status === 'confirmed') {
      const branchSettingsList = await base44.entities.BranchSettings.filter({ branch: customer.branch });
      const bs = branchSettingsList[0];
      if (bs) {
        const num = bs.nextInvoiceNumber || 1000;
        invoiceNumber = `${bs.invoicePrefix || ''}-${String(num).padStart(4, '0')}`;
        await base44.entities.BranchSettings.update(bs.id, { nextInvoiceNumber: num + 1 });
      }
    }

    setSaving(true);
    try {
      for (const line of validLines) {
        const taxAmount = line.taxable !== false ? Math.round(line.baseAmount * taxRateDecimal * 100) / 100 : 0;
        const totalDays = Math.floor((new Date(line.endDate) - new Date(line.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        await base44.entities.Rental.create({
          equipmentId: line.equipmentId,
          equipmentName: line.equipmentName,
          startDate: line.startDate,
          endDate: line.endDate,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          branch: customer.branch,
          totalDays,
          baseAmount: line.baseAmount,
          taxRate: taxRateDecimal,
          taxAmount,
          deposit: (line.deposit || 0) * line.quantity,
          amountPaid: status === 'confirmed' ? paid : 0,
          invoiceNumber,
          status,
          notes: customer.notes,
        });
      }
      setSaved(true);
      base44.entities.Rental.list('-created_date', 1000).then(setRentals);
      setCustomer(EMPTY_CUSTOMER);
      setLines([newLine()]);
      setDiscount('');
      setTaxRate('8.25');
      setAmountPaid('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintAndConfirm = async () => {
    const validLines = validate();
    if (!validLines) return;

    // Must open window synchronously (before any await) or browser blocks it
    const paid = parseFloat(amountPaid) || 0;
    const win = openInvoiceWindow();

    // Fetch invoice number before saving
    const branchSettingsList = await base44.entities.BranchSettings.filter({ branch: customer.branch });
    const bs = branchSettingsList[0];
    const invNumber = bs ? `${bs.invoicePrefix || ''}-${String(bs.nextInvoiceNumber || 1000).padStart(4, '0')}` : '';

    const invoiceOrder = {
      ...buildOrder(validLines, invNumber),
      branchInfo: branchSettings[customer.branch] ? {
        name: branchSettings[customer.branch].branchName || customer.branch,
        address: branchSettings[customer.branch].address || '',
        phone: branchSettings[customer.branch].phone || '',
        email: branchSettings[customer.branch].email || '',
      } : { name: customer.branch, address: '', phone: '', email: '' },
      companyInfo: companyInfo ? {
        companyName: companyInfo.companyName || '',
        logoUrl: companyInfo.logoUrl || '',
        invoiceFooter: companyInfo.invoiceFooter || '',
      } : {},
    };

    // Now save async
    await handleSave('confirmed');

    // Write invoice after save completes
    writeInvoiceToWindow(win, invoiceOrder, paid);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg print:hidden">
        <div className="px-4 py-3 flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">New Rental Invoice</div>
            <div className="text-indigo-300 text-xs">{equipment.length} items in catalog</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate('/rental-history')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Rental history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/pricing-editor')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Edit pricing"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/dependencies-editor')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Manage dependencies"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/branch-settings')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Branch invoice settings"
            >
              <Building2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/company-settings')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Company settings & logo"
            >
              <Cog className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/equipment-status')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Equipment status board"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Success banner */}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
            ✓ Rental saved successfully!
          </div>
        )}

        {/* Customer identity */}
        <CustomerIdentity
          customer={customer}
          onChange={setCustomer}
          rentals={rentals}
          lines={lines}
          onAddItems={(items) => {
            setLines(prev => {
              // Inherit dates from last line that has dates
              const lastWithDates = [...prev].reverse().find(l => l.startDate);
              const inheritStart = lastWithDates?.startDate || '';
              const inheritEnd = lastWithDates?.endDate || '';
              const newLines = items.map(item => {
                const eq = equipment.find(e => e.id === item.equipmentId);
                const days = calcDays(inheritStart, inheritEnd);
                const rate = calcRate(eq, days);
                return {
                  ...newLine(),
                  equipmentId: item.equipmentId,
                  equipmentName: item.equipmentName,
                  quantity: item.quantity || 1,
                  taxable: eq?.taxable !== false,
                  deposit: eq?.depositRequired || 0,
                  rate,
                  baseAmount: Math.round(rate * days * (item.quantity || 1) * 100) / 100,
                  startDate: inheritStart,
                  endDate: inheritEnd,
                };
              });
              // Remove blank placeholder line if it's the only one
              const filtered = prev.filter(l => l.equipmentId);
              return [...filtered, ...newLines];
            });
          }}
        />

        {/* Line items */}
        <div className="space-y-3">
          {lines.map(line => {
            if (!qtyRefs.current[line.id]) qtyRefs.current[line.id] = { current: null };
            return (
              <EquipmentLineItem
                key={line.id}
                line={line}
                equipment={equipment}
                rentals={rentals}
                onUpdate={(updated) => updateLine(line.id, updated)}
                onRemove={() => removeLine(line.id)}
                qtyRef={qtyRefs.current[line.id]}
                onAddLine={handleAddSuggestedItem}
              />
            );
          })}
        </div>

        {/* Add Equipment */}
        <button
          ref={addButtonRef}
          onClick={addLine}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Equipment
        </button>

        {/* Totals */}
        {lines.some(l => l.equipmentId) && (
          <InvoiceTotals
            lines={lines}
            discount={discount}
            onDiscountChange={setDiscount}
            taxRate={taxRate}
            onTaxRateChange={setTaxRate}
            amountPaid={amountPaid}
            onAmountPaidChange={setAmountPaid}
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end print:hidden pb-8 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { setCustomer(EMPTY_CUSTOMER); setLines([newLine()]); setDiscount(''); setTaxRate('8.25'); setAmountPaid(''); }}
          >
            Clear
          </Button>
          <Button
            onClick={() => handleSave('pending')}
            disabled={saving}
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Draft'}
          </Button>
          <Button
            onClick={handlePrintAndConfirm}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Printer className="w-4 h-4" /> Print & Confirm</>}
          </Button>
        </div>
      </div>
    </div>
  );
}