import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings, Link2, History, Printer } from 'lucide-react';
import { openInvoicePopup } from '@/lib/buildInvoiceHTML';
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const qtyRefs = useRef({});
  const addButtonRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-created_date', 1000),
    ]).then(([eq, rent]) => {
      setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
      setRentals(rent);
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

  const handlePreviewInvoice = () => {
    const validLines = lines.filter(l => l.equipmentId);
    if (!customer.name || validLines.length === 0) {
      alert('Please fill in customer name and add at least one equipment item.');
      return;
    }
    const taxRateNum = parseFloat(taxRate) || 8.25;
    const order = {
      id: null,
      createdAt: new Date().toISOString(),
      taxRate: taxRateNum,
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        branch: customer.branch,
        notes: customer.notes,
      },
      lines: validLines.map(l => ({
        equipmentId: l.equipmentId,
        equipmentName: l.equipmentName,
        quantity: l.quantity || 1,
        rate: l.rate || 0,
        baseAmount: l.baseAmount || 0,
        taxable: l.taxable !== false,
        deposit: (l.deposit || 0) * (l.quantity || 1),
        startDate: l.startDate,
        endDate: l.endDate,
      })),
    };
    openInvoicePopup(order, 0);
  };

  const handleSave = async (status = 'pending') => {
    if (!customer.name) {
      alert('Please fill in customer name.');
      return;
    }
    const missingDates = lines.filter(l => l.equipmentId).some(l => !l.startDate || !l.endDate);
    if (missingDates) {
      alert('Please set dates for all equipment lines.');
      return;
    }
    const validLines = lines.filter(l => l.equipmentId);
    if (validLines.length === 0) {
      alert('Please add at least one equipment item.');
      return;
    }

    setSaving(true);
    try {
      for (const line of validLines) {
        const taxAmount = line.taxable ? Math.round(line.baseAmount * 0.0825 * 100) / 100 : 0;
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
          taxRate: 0.0825,
          taxAmount,
          deposit: (line.deposit || 0) * line.quantity,
          status,
          notes: customer.notes,
        });
      }
      setSaved(true);
      // Reload rentals to update availability checks
      base44.entities.Rental.list('-created_date', 1000).then(setRentals);
      // Reset form
      setCustomer(EMPTY_CUSTOMER);
      setLines([newLine()]);
      setDiscount('');
      setTaxRate('8.25');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
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
        <CustomerIdentity customer={customer} onChange={setCustomer} />

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
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end print:hidden pb-8 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { setCustomer(EMPTY_CUSTOMER); setLines([newLine()]); setDiscount(''); setTaxRate('8.25'); }}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={handlePreviewInvoice}
            className="border-gray-400 text-gray-700 hover:bg-gray-50 gap-2"
          >
            <Printer className="w-4 h-4" /> Preview Invoice
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
            onClick={() => handleSave('confirmed')}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ Confirm Rental'}
          </Button>
        </div>
      </div>
    </div>
  );
}