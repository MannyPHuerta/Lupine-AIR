import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings, Link2, History, Printer, Building2, Cog, Activity, RotateCcw, X, Users, Truck, Tag } from 'lucide-react';
import { openInvoiceWindow, writeInvoiceToWindow } from '@/lib/buildInvoiceHTML';
import { calcDeliveryFee } from '@/lib/deliveryFee';
import SignaturePad from '@/components/invoice/SignaturePad';
import { Button } from '@/components/ui/button';
import { CustomerIdentity } from '@/components/invoice/CustomerHeader';
import EquipmentLineItem from '@/components/invoice/EquipmentLineItem';
import InvoiceTotals from '@/components/invoice/InvoiceTotals';
import PaymentForm from '@/components/invoice/PaymentForm';

const EMPTY_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  branch: '01 McAllen',
  address: '',
  city: '',
  state: 'TX',
  zip: '',
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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [returnMethod, setReturnMethod] = useState('customer_return');
  const [deliveryMethod, setDeliveryMethod] = useState('customer_pickup');
  const [autoSendCommunications, setAutoSendCommunications] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(null); // percent number or null
  const [volumeRules, setVolumeRules] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const qtyRefs = useRef({});
  const addButtonRef = useRef(null);

  const [companyInfo, setCompanyInfo] = useState(null);
  const [branchSettings, setBranchSettings] = useState({});
  const [deliveryMatrices, setDeliveryMatrices] = useState({});

  // NOTE: Auto-restore on mount removed — use the Restore button (↺) in the header to intentionally recover a saved form.

  // Auto-save form state to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('rentalFormState', JSON.stringify({
        customer, lines, discount, taxRate, amountPaid, paymentMethod, returnMethod, deliveryMethod, appliedPromo
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [customer, lines, discount, taxRate, amountPaid, paymentMethod, returnMethod, deliveryMethod, appliedPromo]);

  // Fetch catalog and rental data
  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-created_date', 1000),
      base44.entities.CompanySettings.list(),
      base44.entities.BranchSettings.list(),
      base44.entities.DeliveryMatrix.list(),
      base44.entities.VolumeDiscountRule.filter({ active: true }),
      base44.entities.PromoCode.list('-created_date', 200),
    ]).then(([eq, rent, company, branches, matrices, volRules, promoCodes]) => {
      setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
      setRentals(rent);
      setCompanyInfo(company[0] || null);
      const branchMap = {};
      branches.forEach(b => { branchMap[b.branch] = b; });
      setBranchSettings(branchMap);
      const matrixMap = {};
      matrices.forEach(m => { matrixMap[m.branch] = m; });
      setDeliveryMatrices(matrixMap);
      setVolumeRules(volRules);
      setPromoCodes(promoCodes);
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

  const calcAutoDiscount = (validLines) => {
    const rentalSubtotal = validLines.reduce((s, l) => s + (l.baseAmount || 0), 0);
    // Volume discounts
    const volumeTotal = validLines.flatMap(line => {
      const eqRecord = equipment.find(e => e.id === line.equipmentId);
      const lineCategory = eqRecord?.category || '';
      return volumeRules.filter(rule => {
        if (!rule.active) return false;
        const qty = line.quantity || 1;
        if (qty < rule.minimumQuantity) return false;
        if (rule.equipmentId && rule.equipmentId !== line.equipmentId) return false;
        if (!rule.equipmentId && rule.category && rule.category !== lineCategory) return false;
        return true;
      }).map(rule => rule.discountType === 'percent'
        ? Math.round(line.baseAmount * (rule.discountValue / 100) * 100) / 100
        : Math.round(rule.discountValue * (line.quantity || 1) * 100) / 100);
    }).reduce((s, v) => s + v, 0);
    // Promo discount
    const promoDisc = appliedPromo
      ? appliedPromo.discountType === 'percent'
        ? Math.round(rentalSubtotal * (appliedPromo.discountValue / 100) * 100) / 100
        : Math.min(appliedPromo.discountValue, rentalSubtotal)
      : 0;
    // Loyalty discount
    const loyaltyDisc = loyaltyDiscount
      ? Math.round((rentalSubtotal - promoDisc - volumeTotal) * (loyaltyDiscount / 100) * 100) / 100
      : 0;
    return promoDisc + volumeTotal + loyaltyDisc;
  };

  const buildOrder = (validLines, invNumber = '') => ({
    id: invNumber || null,
    createdAt: new Date().toISOString(),
    taxRate: parseFloat(taxRate) || 8.25,
    discount: parseFloat(discount) || 0,
    autoDiscount: calcAutoDiscount(validLines),
    paymentMethod: paymentMethod || '',
    deliveryMethod: deliveryMethod || 'customer_pickup',
    returnMethod: returnMethod || 'customer_return',
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      branch: customer.branch,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
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
    if (!validLines) return [];

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
    const createdIds = [];
    try {
      // Auto-sync customer record on confirmed rentals
      let customerId = null;
      if (status === 'confirmed' || status === 'contract') {
        try {
          const res = await base44.functions.invoke('upsertCustomer', {
            fullName: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            branch: customer.branch,
          });
          customerId = res?.data?.customerId || null;
        } catch (syncErr) {
          console.warn('Customer sync failed (non-blocking):', syncErr.message);
        }
      }

      for (const line of validLines) {
        const taxAmount = line.taxable !== false ? Math.round(line.baseAmount * taxRateDecimal * 100) / 100 : 0;
        const totalDays = Math.floor((new Date(line.endDate) - new Date(line.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        const rental = await base44.entities.Rental.create({
          equipmentId: line.equipmentId,
          equipmentName: line.equipmentName,
          startDate: line.startDate,
          endDate: line.endDate,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          customerCity: customer.city,
          customerState: customer.state,
          customerZip: customer.zip,
          customerId: customerId || null,
          branch: customer.branch,
          totalDays,
          baseAmount: line.baseAmount,
          taxRate: taxRateDecimal,
          taxAmount,
          deposit: (line.deposit || 0) * line.quantity,
          amountPaid: status === 'confirmed' ? paid : 0,
          invoiceNumber,
          status: status === 'confirmed' ? 'contract' : 'quote',
          returnMethod: returnMethod || 'customer_return',
          deliveryMethod: deliveryMethod || 'customer_pickup',
          signatureDataUrl: status === 'confirmed' ? signatureDataUrl : null,
          notes: customer.notes,
        });
        createdIds.push(rental.id);
      }
      setSaved(true);
      base44.entities.Rental.list('-created_date', 1000).then(setRentals);
      setCustomer(EMPTY_CUSTOMER);
      setLines([newLine()]);
      setDiscount('');
      setTaxRate('8.25');
      setAmountPaid('');
      setPaymentMethod('');
      setReturnMethod('customer_return');
      setDeliveryMethod('customer_pickup');
      setSignatureDataUrl(null);
      setAppliedPromo(null);
      setLoyaltyDiscount(null);
      setAppliedPromo(null);
      setLoyaltyDiscount(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
    return createdIds;
  };

  const handlePrintAndConfirm = async () => {
    const validLines = validate();
    if (!validLines) return;

    // Fetch invoice number
    const branchSettingsList = await base44.entities.BranchSettings.filter({ branch: customer.branch });
    const bs = branchSettingsList[0];
    const invNumber = bs ? `${bs.invoicePrefix || ''}-${String(bs.nextInvoiceNumber || 1000).padStart(4, '0')}` : '';

    // Calculate total amount due
    const taxRateDecimal = (parseFloat(taxRate) || 8.25) / 100;
    const subtotal = validLines.reduce((s, l) => s + (l.baseAmount || 0), 0);
    const taxableBase = validLines.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
    const taxAmount = Math.round(Math.max(0, taxableBase) * taxRateDecimal * 100) / 100;
    const depositTotal = validLines.reduce((s, l) => s + ((l.deposit || 0) * (l.quantity || 1)), 0);
    const discountAmount = parseFloat(discount) || 0;
    const matrix = deliveryMatrices[customer.branch];
    const dFee = deliveryMethod === 'company_delivery' ? calcDeliveryFee(matrix, customer.zip) : 0;
    const rFee = returnMethod === 'company_pickup' ? calcDeliveryFee(matrix, customer.zip) : 0;
    const totalDue = Math.max(0, subtotal + taxAmount + depositTotal - discountAmount + dFee + rFee);

    // If non-card payment method, skip payment processor and go straight to confirmation
    if (['Cash', 'Check', 'Net 30'].includes(paymentMethod)) {
      const paid = parseFloat(amountPaid) || 0;
      const win = openInvoiceWindow();
      
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
        paymentMethod,
        deliveryFee: dFee,
        returnFee: rFee,
      };

      const rentalIds = await handleSave('confirmed');
      writeInvoiceToWindow(win, invoiceOrder, paid, signatureDataUrl);

      if (autoSendCommunications && customer.email) {
        try {
          await base44.functions.invoke('sendRentalConfirmation', {
            rentalIds,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            invoiceNumber: invNumber,
            autoSendCommunications,
          });
        } catch (err) {
          console.error('Failed to send confirmation:', err);
        }
      }
      return;
    }

    // Store invoice data for post-payment
    setPendingInvoice({
      validLines,
      invNumber,
      invoiceOrder: {
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
        paymentMethod: paymentMethod || '',
        deliveryFee: dFee,
        returnFee: rFee,
      },
      totalDue,
    });

    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (!pendingInvoice) return;

    try {
      // Save the rental records
      const rentalIds = await handleSave('confirmed');
      
      // Open invoice window and print
      const paid = parseFloat(amountPaid) || pendingInvoice.totalDue;
      const win = openInvoiceWindow();
      writeInvoiceToWindow(win, pendingInvoice.invoiceOrder, paid, signatureDataUrl);

      // Send email/SMS if enabled
      if (autoSendCommunications && customer.email) {
        try {
          await base44.functions.invoke('sendRentalConfirmation', {
            rentalIds,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            invoiceNumber: pendingInvoice.invNumber,
            autoSendCommunications,
          });
        } catch (err) {
          console.error('Failed to send confirmation:', err);
        }
      }

      setShowPayment(false);
      setPendingInvoice(null);
    } catch (err) {
      alert(`Error completing rental: ${err.message}`);
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
              onClick={() => {
                if (confirm('Restore last saved form state?')) {
                  const saved = localStorage.getItem('rentalFormState');
                  if (saved) {
                    try {
                      const { customer: c, lines: l, discount: d, taxRate: t, amountPaid: a, paymentMethod: p } = JSON.parse(saved);
                      setCustomer(c || EMPTY_CUSTOMER);
                      setLines(l || [newLine()]);
                      setDiscount(d || '');
                      setTaxRate(t || '8.25');
                      setAmountPaid(a || '');
                      setPaymentMethod(p || '');
                    } catch (_) {}
                  }
                }
              }}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Restore saved form state"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
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
            <button
              onClick={() => navigate('/customers')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Customer records"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/delivery-matrix')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Delivery matrix & rates"
            >
              <Truck className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/discounts')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Discount manager"
            >
              <Tag className="w-4 h-4" />
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

         {/* Payment Modal */}
         {showPayment && pendingInvoice && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-gray-900">Complete Payment</h2>
                 <button
                   onClick={() => { setShowPayment(false); setPendingInvoice(null); }}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
               <PaymentForm
                 amount={pendingInvoice.totalDue}
                 customerEmail={customer.email}
                 customerName={customer.name}
                 onSuccess={handlePaymentSuccess}
                 onCancel={() => { setShowPayment(false); setPendingInvoice(null); }}
               />
             </div>
           </div>
         )}

        {/* Customer identity */}
        <CustomerIdentity
          customer={customer}
          onChange={(updated) => {
            setCustomer(updated);
            // Auto-apply loyalty discount when customer with loyalty is selected
            if (updated.loyaltyDiscountEnabled && updated.loyaltyDiscountPercent) {
              setLoyaltyDiscount(updated.loyaltyDiscountPercent);
            } else if (!updated.loyaltyDiscountEnabled) {
              setLoyaltyDiscount(null);
            }
          }}
          rentals={rentals}
          lines={lines}
          onAddItems={(items) => {
            setLines(prev => {
              // Inherit dates from last line that has BOTH equipment AND dates
              const lastWithDates = [...prev].reverse().find(l => l.equipmentId && l.startDate && l.endDate);
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

        {/* Delivery & Return Methods */}
        <div className="bg-white rounded-xl border shadow-sm px-6 py-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Delivery Method</label>
            <select
              value={deliveryMethod}
              onChange={e => setDeliveryMethod(e.target.value)}
              className="border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="customer_pickup">🙋 Customer Pickup</option>
              <option value="company_delivery">🚚 Company Delivery</option>
              <option value="shipped">📦 Shipped</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Return Method</label>
            <select
              value={returnMethod}
              onChange={e => setReturnMethod(e.target.value)}
              className="border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="customer_return">🙋 Customer Return</option>
              <option value="company_pickup">🚚 Company Pickup</option>
              <option value="customer_ships">📦 Customer Ships</option>
            </select>
          </div>
        </div>

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
          <>
            <InvoiceTotals
              lines={lines}
              discount={discount}
              onDiscountChange={setDiscount}
              taxRate={taxRate}
              onTaxRateChange={setTaxRate}
              amountPaid={amountPaid}
              onAmountPaidChange={setAmountPaid}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              autoSendCommunications={autoSendCommunications}
              onAutoSendChange={setAutoSendCommunications}
              deliveryMethod={deliveryMethod}
              returnMethod={returnMethod}
              deliveryFee={calcDeliveryFee(deliveryMatrices[customer.branch], customer.zip)}
              returnFee={calcDeliveryFee(deliveryMatrices[customer.branch], customer.zip)}
              appliedPromo={appliedPromo}
              onPromoApply={(promo) => {
                setAppliedPromo(promo);
                // Increment usage count non-blocking
                base44.entities.PromoCode.update(promo.id, { usageCount: (promo.usageCount || 0) + 1 }).catch(() => {});
              }}
              onPromoRemove={() => setAppliedPromo(null)}
              loyaltyDiscount={loyaltyDiscount}
              volumeRules={volumeRules}
              equipment={equipment}
              promoCodes={promoCodes}
            />
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <SignaturePad
                onSave={setSignatureDataUrl}
                onClear={() => setSignatureDataUrl(null)}
              />
              {signatureDataUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-medium">
                  <span>✓ Signature captured</span>
                  <button onClick={() => setSignatureDataUrl(null)} className="text-gray-400 hover:text-red-500 underline">Remove</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end print:hidden pb-8 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { setCustomer(EMPTY_CUSTOMER); setLines([newLine()]); setDiscount(''); setTaxRate('8.25'); setAmountPaid(''); setReturnMethod('customer_return'); setAppliedPromo(null); setLoyaltyDiscount(null); }}
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