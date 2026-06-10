import { useState, useEffect, useRef } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings, Link2, History, Printer, Building2, Cog, Activity, RotateCcw, X, Users, Truck, Tag, Wrench, FlaskConical, ShoppingBag } from 'lucide-react';
import RtoSetupModal from '@/components/rentals/RtoSetupModal';
import AppPageHeader from '@/components/AppPageHeader';
import DeliveryRecommendation from '@/components/counter/DeliveryRecommendation';
import PracticeModeWatermark from '@/components/PracticeModeWatermark';
import RentalAlertModal from '@/components/equipment/RentalAlertModal';
import { openInvoiceWindow, writeInvoiceToWindow } from '@/lib/buildInvoiceHTML';
import { calcDeliveryFee } from '@/lib/deliveryFee';
import { calcBillableDays } from '@/lib/rentalDayCalc';
import SignaturePad from '@/components/invoice/SignaturePad';
import BranchSelect from '@/components/invoice/BranchSelect';
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
  const [worksiteAddress, setWorksiteAddress] = useState('');
  const [worksiteCity, setWorksiteCity] = useState('');
  const [worksiteState, setWorksiteState] = useState('TX');
  const [worksiteZip, setWorksiteZip] = useState('');
  const [autoSendCommunications, setAutoSendCommunications] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(null); // percent number or null
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [volumeRules, setVolumeRules] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [practiceMode, setPracticeMode] = useState(() => localStorage.getItem('practiceMode') === 'true');
  const [aiDeliveryRec, setAiDeliveryRec] = useState(null); // { addedFee: number } when AI fee was applied
  const [aiDeliveryFee, setAiDeliveryFee] = useState(null); // overrides matrix delivery fee when set
  const [pendingAlertEquipment, setPendingAlertEquipment] = useState(null); // { eq, onConfirm }
  const [rtoSetup, setRtoSetup] = useState(null); // { eq } when modal open
  const [rtoData, setRtoData] = useState(null); // confirmed RTO terms { purchasePrice, termMonths, creditPercent, expiryDate }

  const [pickupTime, setPickupTime] = useState('08:00'); // HH:MM — used for clock_hour billing mode
  const [returnTime, setReturnTime] = useState('17:00'); // HH:MM — used for clock_hour billing mode
  const qtyRefs = useRef({});
  const addButtonRef = useRef(null);



  const [currentUser, setCurrentUser] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [branchSettings, setBranchSettings] = useState({});
  const [deliveryMatrices, setDeliveryMatrices] = useState({});
  const [rentalAgreements, setRentalAgreements] = useState({});

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
    Promise.resolve(null).then(u => {
      setCurrentUser(u);
    }).catch(() => {});
    // Batch into two groups to avoid rate limiting
    Promise.all([
      supabaseData.Equipment.list('name', 2000),
      supabaseData.Rental.list('-created_date', 1000),
      supabaseData.CompanySettings.list(),
      supabaseData.BranchSettings.list(),
    ]).then(async ([eq, rent, company, branches]) => {
      const [matrices, volRules, promoCodes, agreements] = await Promise.all([
        supabaseData.DeliveryMatrix.list(),
        supabaseData.VolumeDiscountRule.filter({ active: true }),
        supabaseData.PromoCode.list('-created_date', 200),
        supabaseData.RentalAgreement.list(),
      ]);
      return [eq, rent, company, branches, matrices, volRules, promoCodes, agreements];
    }).then(([eq, rent, company, branches, matrices, volRules, promoCodes, agreements]) => {
      setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
      setRentals(rent);
      setCompanyInfo(company[0] || null);
      const branchMap = {};
      branches.forEach(b => { branchMap[b.branch] = b; });
      setBranchSettings(branchMap);
      const matrixMap = {};
      matrices.forEach(m => { matrixMap[m.branch] = m; });
      setDeliveryMatrices(matrixMap);
      const agreementMap = {};
      agreements.forEach(a => { agreementMap[a.branch] = a; });
      setRentalAgreements(agreementMap);
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

  const rentalDayMode = companyInfo?.rentalDayMode || 'clock_hour';

  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    return calcBillableDays(start, end, pickupTime, rentalDayMode);
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
    // RTO fields — passed through to invoice for addendum generation
    isRentToOwn: !!rtoData,
    purchasePrice: rtoData?.purchasePrice || 0,
    rentToOwnTermMonths: rtoData?.termMonths || 0,
    rentToOwnCreditPercent: rtoData?.creditPercent || 0,
    purchaseOptionExpiry: rtoData?.expiryDate || null,
    worksiteAddress: deliveryMethod === 'company_delivery' ? worksiteAddress : '',
    worksiteCity: deliveryMethod === 'company_delivery' ? worksiteCity : '',
    worksiteState: deliveryMethod === 'company_delivery' ? worksiteState : '',
    worksiteZip: deliveryMethod === 'company_delivery' ? worksiteZip : '',
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

  const validate = async () => {
    if (!customer.name) { alert('Please fill in customer name.'); return false; }
    if (!customer.phone) { alert('Phone number is required.'); return false; }
    const validLines = lines.filter(l => l.equipmentId);
    if (validLines.length === 0) { alert('Please add at least one equipment item.'); return false; }
    if (validLines.some(l => !l.startDate || !l.endDate)) { alert('Please set dates for all equipment lines.'); return false; }
    
    // Check customer status if we have a customer ID
    if (customer.id && customer.id !== 'walkin') {
      const custList = await supabaseData.Customer.filter({ id: customer.id });
      const cust = custList[0];
      if (cust) {
        if (cust.blacklisted) {
          alert('⛔ This customer is blacklisted. Please contact management before proceeding.');
          return false;
        }
        if (cust.creditHold) {
          const proceed = confirm(`⚠️ ${cust.fullName} has a credit hold on their account.\n\nThey may have an outstanding balance due. Would you like to note this and proceed, or would you prefer to contact them first?\n\nTap OK to proceed with caution, or Cancel to address payment.`);
          if (!proceed) return false;
        }
      }
    }
    
    return validLines;
  };

  const handleSave = async (status = 'pending') => {
    const validLines = await validate();
    if (!validLines) return [];

    // PRACTICE MODE — skip all DB writes, reset form, return fake IDs
    if (practiceMode) {
      setSaved(true);
      setCustomer(EMPTY_CUSTOMER);
      setLines([newLine()]);
      setDiscount('');
      setTaxRate('8.25');
      setAmountPaid('');
      setPaymentMethod('');
      setReturnMethod('customer_return');
      setDeliveryMethod('customer_pickup');
      setWorksiteAddress('');
      setWorksiteCity('');
      setWorksiteState('TX');
      setWorksiteZip('');
      setSignatureDataUrl(null);
      setAppliedPromo(null);
      setLoyaltyDiscount(null);
      setManualInvoiceNumber('');
      setAiDeliveryFee(null);
      setAiDeliveryRec(null);
      setRtoData(null);
      setTimeout(() => setSaved(false), 3000);
      return ['practice-id'];
    }

    const taxRateDecimal = (parseFloat(taxRate) || 8.25) / 100;
    const paid = parseFloat(amountPaid) || 0;

    // Always auto-assign invoice number from branch sequence on first save
    let invoiceNumber = '';
    const branchSettingsList = await supabaseData.BranchSettings.filter({ branch: customer.branch });
    const bs = branchSettingsList[0];
    if (bs) {
      const num = bs.nextInvoiceNumber || 1000;
      invoiceNumber = `${bs.invoicePrefix || ''}-${String(num).padStart(4, '0')}`;
      await supabaseData.BranchSettings.update(bs.id, { nextInvoiceNumber: num + 1 });
    }

    setSaving(true);
    const createdIds = [];
    try {
      // Auto-sync customer record on all saves (quote or confirmed)
      let customerId = null;
      if (customer.name) {
        try {
          const res = await fetch('/api/functions/upsertCustomer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              city: customer.city,
              state: customer.state,
              zip: customer.zip,
              branch: customer.branch,
            }),
          });
          const data = await res.json();
          customerId = data?.customerId || null;
        } catch (syncErr) {
          console.warn('Customer sync failed (non-blocking):', syncErr.message);
        }
      }

      for (const line of validLines) {
      const taxAmount = line.taxable !== false ? Math.round(line.baseAmount * taxRateDecimal * 100) / 100 : 0;
      const totalDays = calcBillableDays(line.startDate, line.endDate, pickupTime, rentalDayMode);

      // Hour meter tracking
      const hourMeterStart = line.hourMeterStart ?? null;
      const hourMeterEnd = line.hourMeterEnd ?? null;
      const hoursUsed = line.hoursUsed ?? (hourMeterStart !== null && hourMeterEnd !== null ? hourMeterEnd - hourMeterStart : null);
      const hourlyRate = line.hourlyRate ?? 0;
      const hourMeterCharges = line.hourMeterCharges ?? 0;

      // Calculate delivery/return fees — only charge once per order, not per line
      const matrixFee = calcDeliveryFee(deliveryMatrices[customer.branch], customer.zip);
      const dFee = createdIds.length === 0 && deliveryMethod === 'company_delivery' ? (aiDeliveryFee ?? matrixFee) : 0;
      const rFee = createdIds.length === 0 && returnMethod === 'company_pickup' ? matrixFee : 0;

      // Lock equipment at source branch when cross-branch
      if (line.isCrossBranch && line.equipmentId) {
        try {
          await supabaseData.Equipment.update(line.equipmentId, {
            unitStatus: 'reserved',
            statusNote: `Cross-branch borrow → ${customer.branch} for ${customer.name} (${line.startDate})`,
            statusUpdatedAt: new Date().toISOString(),
            statusUpdatedBy: currentUser?.email || 'system',
          });
        } catch (e) { console.warn('Could not lock equipment:', e.message); }
      }

      const oldRental = null; // New rental, no old data
      const rental = await supabaseData.Rental.create({
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
        hourMeterStart,
        hourMeterEnd,
        hoursUsed,
        hourlyRate,
        hourMeterCharges,
        taxRate: taxRateDecimal,
        taxAmount,
        deposit: (line.deposit || 0) * line.quantity,
        deliveryFee: dFee,
        returnFee: rFee,
        amountPaid: status === 'confirmed' ? paid : 0,
        invoiceNumber,
        status: status === 'confirmed' ? 'contract' : 'quote',
        returnMethod: returnMethod || 'customer_return',
        deliveryMethod: deliveryMethod || 'customer_pickup',
        worksiteAddress: deliveryMethod === 'company_delivery' ? worksiteAddress : '',
        worksiteCity: deliveryMethod === 'company_delivery' ? worksiteCity : '',
        worksiteState: deliveryMethod === 'company_delivery' ? worksiteState : '',
        worksiteZip: deliveryMethod === 'company_delivery' ? worksiteZip : '',
        signatureDataUrl: status === 'confirmed' ? signatureDataUrl : null,
        notes: [
          customer.notes,
          customer.saleType === 'business' ? 'Business sale' : null,
          customer.saleType === 'business' && customer.companyName ? `Company: ${customer.companyName}` : null,
        ].filter(Boolean).join(' | ') || undefined,
        isCrossBranch: line.isCrossBranch || false,
        sourceBranch: line.sourceBranch || null,
        transferOutCompleted: false,
        transferBackCompleted: false,
        // RTO fields (only on first line if RTO is set up)
        ...(rtoData && createdIds.length === 0 ? {
          isRentToOwn: true,
          purchasePrice: rtoData.purchasePrice,
          rentToOwnCreditPercent: rtoData.creditPercent,
          balanceRemaining: rtoData.purchasePrice,
          amountCredited: 0,
          purchaseOptionExpiry: rtoData.expiryDate,
        } : {}),
      });
      
      // Audit: Rental created
      await supabaseData.AuditLog.create({
        action: 'create',
        entityName: 'Rental',
        entityId: rental.id,
        entityLabel: `${line.equipmentName} - ${customer.name}`,
        performedBy: currentUser?.email || 'system',
        performedAt: new Date().toISOString(),
        branch: customer.branch,
        changes: {
          status: { before: null, after: status === 'confirmed' ? 'contract' : 'quote' },
          baseAmount: { before: null, after: line.baseAmount },
          taxAmount: { before: null, after: taxAmount },
          deposit: { before: null, after: (line.deposit || 0) * line.quantity },
          amountPaid: { before: null, after: status === 'confirmed' ? paid : 0 },
          invoiceNumber: { before: null, after: invoiceNumber },
        },
        reason: status === 'confirmed' ? 'Confirmed rental' : 'Quote created',
      });
      
      createdIds.push(rental.id);

      // If RTO, generate payment schedule (only for first line)
      if (rtoData && createdIds.length === 1) {
        const monthlyAmount = Math.round((rtoData.purchasePrice / rtoData.termMonths) * 100) / 100;
        const scheduleStart = new Date(line.startDate + 'T12:00:00');
        for (let i = 0; i < rtoData.termMonths; i++) {
          const dueDate = new Date(scheduleStart);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          await supabaseData.RtoPayment.create({
            rentalId: rental.id,
            customerName: customer.name,
            customerEmail: customer.email,
            equipmentName: line.equipmentName,
            paymentNumber: i + 1,
            totalPayments: rtoData.termMonths,
            dueDate: dueDate.toISOString().split('T')[0],
            amountDue: monthlyAmount,
            amountPaid: 0,
            status: 'pending',
            branch: customer.branch,
            purchasePrice: rtoData.purchasePrice,
            creditPercent: rtoData.creditPercent,
          });
        }
      }
      }
      // Create cross-branch transfer Delivery records (one per cross-branch line) rooted at the SOURCE branch
      const crossBranchLines = validLines.filter(l => l.isCrossBranch && l.sourceBranch);
      for (let i = 0; i < crossBranchLines.length; i++) {
        const line = crossBranchLines[i];
        const rentalId = createdIds[validLines.indexOf(line)];
        try {
          await supabaseData.Delivery.create({
            rentalId: rentalId || createdIds[0],
            customerId: customerId || null,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: `→ ${customer.branch}`,
            customerCity: customer.city || '',
            customerState: customer.state || '',
            customerZip: customer.zip || '',
            branch: line.sourceBranch, // delivery originates from the LENDING branch
            status: 'scheduled',
            items: [{ equipmentId: line.equipmentId, equipmentName: line.equipmentName, quantity: line.quantity || 1, checked: false }],
            scheduledDate: line.startDate,
            notes: `⇄ Cross-branch transfer to ${customer.branch} for ${customer.name} · Invoice ${invoiceNumber}`,
            isCrossTransfer: true,
            destinationBranch: customer.branch,
          });
        } catch (e) { console.warn('Could not create transfer delivery:', e.message); }
      }

      setSaved(true);
      supabaseData.Rental.list('-created_date', 1000).then(setRentals);
      setCustomer(EMPTY_CUSTOMER);
      setLines([newLine()]);
      setDiscount('');
      setTaxRate('8.25');
      setAmountPaid('');
      setPaymentMethod('');
      setReturnMethod('customer_return');
      setDeliveryMethod('customer_pickup');
      setWorksiteAddress('');
      setWorksiteCity('');
      setWorksiteState('TX');
      setWorksiteZip('');
      setSignatureDataUrl(null);
      setAppliedPromo(null);
      setLoyaltyDiscount(null);
      setManualInvoiceNumber('');
      setAiDeliveryFee(null);
      setAiDeliveryRec(null);
      setRtoData(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
    return createdIds;
  };

  const handlePrintAndConfirm = async () => {
    const validLines = await validate();
    if (!validLines) return;

    // Verify email before proceeding if auto-send is enabled (skip in practice mode)
    if (!practiceMode && autoSendCommunications && !customer.email) {
      alert('Please enter a customer email address to enable automatic confirmation emails.');
      return;
    }

    // Fetch invoice number preview (not incremented yet — that happens in handleSave)
    let invNumber = '';
    const _branchSettingsPreview = await supabaseData.BranchSettings.filter({ branch: customer.branch });
    const _bsPreview = _branchSettingsPreview[0];
    if (_bsPreview) {
      invNumber = `${_bsPreview.invoicePrefix || ''}-${String(_bsPreview.nextInvoiceNumber || 1000).padStart(4, '0')}`;
    }

    // Calculate total amount due
    const taxRateDecimal = (parseFloat(taxRate) || 8.25) / 100;
    const subtotal = validLines.reduce((s, l) => s + (l.baseAmount || 0), 0);
    const taxableBase = validLines.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
    const taxAmount = Math.round(Math.max(0, taxableBase) * taxRateDecimal * 100) / 100;
    const depositTotal = validLines.reduce((s, l) => s + ((l.deposit || 0) * (l.quantity || 1)), 0);
    const discountAmount = parseFloat(discount) || 0;
    const matrix = deliveryMatrices[customer.branch];
    const matrixDeliveryFee = calcDeliveryFee(matrix, customer.zip);
    const dFee = deliveryMethod === 'company_delivery' ? (aiDeliveryFee ?? matrixDeliveryFee) : 0;
    const rFee = returnMethod === 'company_pickup' ? matrixDeliveryFee : 0;
    const totalDue = Math.max(0, subtotal + taxAmount + depositTotal - discountAmount + dFee + rFee);

    // If non-card payment method (or none selected), skip payment processor and go straight to confirmation
    const CARD_METHODS = ['Credit Card', 'Debit Card'];
    if (practiceMode || !CARD_METHODS.includes(paymentMethod)) {
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
        rentalAgreement: rentalAgreements[customer.branch] || null,
        paymentMethod,
        deliveryFee: dFee,
        returnFee: rFee,
        clockInUrl: (() => { const p = new URLSearchParams(); if (customer.branch) p.set('branch', customer.branch); if (invNumber) p.set('job', invNumber); p.set('jobType', deliveryMethod === 'company_delivery' ? 'delivery' : 'general'); return `${window.location.origin}/clockin?${p.toString()}`; })(),
      };

      // Capture email/phone before handleSave resets the form
      const emailToSend = customer.email;
      const phoneToSend = customer.phone;

      console.log('[PrintConfirm] emailToSend:', emailToSend, '| autoSend:', autoSendCommunications, '| practiceMode:', practiceMode);

      // In practice mode, write the invoice first (with practice watermark), then reset — no DB writes
      writeInvoiceToWindow(win, invoiceOrder, paid, signatureDataUrl, practiceMode);
      const rentalIds = await handleSave('confirmed');

      console.log('[PrintConfirm] rentalIds after save:', rentalIds);

      if (!practiceMode && autoSendCommunications && emailToSend && rentalIds.length > 0) {
        console.log('[PrintConfirm] Sending confirmation email...');
        try {
          const emailRes = await fetch('/api/functions/sendRentalConfirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rentalIds,
              customerEmail: emailToSend,
              customerPhone: phoneToSend,
              invoiceNumber: invNumber,
              autoSendCommunications,
            }),
          });
          const emailData = await emailRes.json();
          console.log('[PrintConfirm] Email result:', emailData);
          if (emailData?.error) {
            alert('⚠️ Email failed to send: ' + emailData.error);
          } else if (emailData?.skipped) {
            alert('ℹ️ Email was skipped (check auto-send settings)');
          }
        } catch (err) {
          console.error('[PrintConfirm] Failed to send confirmation:', err);
          alert('⚠️ Email error: ' + err.message);
        }
      } else {
        console.warn('[PrintConfirm] Email skipped — practiceMode:', practiceMode, '| autoSend:', autoSendCommunications, '| email:', emailToSend, '| rentalIds:', rentalIds);
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
        clockInUrl: (() => { const p = new URLSearchParams(); if (customer.branch) p.set('branch', customer.branch); if (invNumber) p.set('job', invNumber); p.set('jobType', deliveryMethod === 'company_delivery' ? 'delivery' : 'general'); return `${window.location.origin}/clockin?${p.toString()}`; })(),
      },
      totalDue,
    });

    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (!pendingInvoice) return;

    // Capture email/phone before handleSave resets the form
    const emailToSend = customer.email;
    const phoneToSend = customer.phone;

    try {
    // Save the rental records
    const rentalIds = await handleSave('confirmed');

    // Open invoice window and print
    const paid = parseFloat(amountPaid) || pendingInvoice.totalDue;
    const win = openInvoiceWindow();
    writeInvoiceToWindow(win, { ...pendingInvoice.invoiceOrder, rentalAgreement: rentalAgreements[customer.branch] || null }, paid, signatureDataUrl, practiceMode);

      // Send email/SMS if enabled
      if (autoSendCommunications && emailToSend && rentalIds.length > 0) {
        try {
          const emailRes = await fetch('/api/functions/sendRentalConfirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rentalIds,
              customerEmail: emailToSend,
              customerPhone: phoneToSend,
              invoiceNumber: pendingInvoice.invNumber,
              autoSendCommunications,
            }),
          });
          const emailData = await emailRes.json();
          if (emailData?.error) {
            alert('⚠️ Email failed: ' + emailData.error);
          }
        } catch (err) {
          console.error('Failed to send confirmation:', err);
          alert('⚠️ Email error: ' + err.message);
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
      {pendingAlertEquipment && (
        <RentalAlertModal
          equipment={pendingAlertEquipment.eq}
          onConfirm={() => { pendingAlertEquipment.onConfirm(); setPendingAlertEquipment(null); }}
          onCancel={() => setPendingAlertEquipment(null)}
        />
      )}
      {rtoSetup && (
        <RtoSetupModal
          equipment={rtoSetup.eq}
          onConfirm={(data) => { setRtoData(data); setRtoSetup(null); }}
          onCancel={() => setRtoSetup(null)}
        />
      )}
      {practiceMode && <PracticeModeWatermark />}
      {practiceMode && (
        <div className="bg-red-600 text-white text-center text-xs font-bold py-1.5 tracking-widest z-40 relative print:block">
          ⚠ PRACTICE MODE — Nothing will be saved ⚠
        </div>
      )}
      <AppPageHeader
        title="New Rental Quote"
        subtitle={`${equipment.length} items in catalog`}
        icon={Plus}
        action={
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5 text-xs">
              <button onClick={() => navigate('/counter')} className="px-3 py-1.5 rounded-md text-white/70 hover:text-white font-semibold transition">Quick</button>
              <button className="px-3 py-1.5 rounded-md bg-white text-slate-900 font-semibold">Full Form</button>
            </div>
            <button
              onClick={() => setPracticeMode(p => { const next = !p; localStorage.setItem('practiceMode', next); return next; })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${practiceMode ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {practiceMode ? 'PRACTICE ON' : 'Practice'}
            </button>
            {[
              { icon: RotateCcw, title: 'Restore saved form', onClick: () => { if (confirm('Restore last saved form state?')) { const s = localStorage.getItem('rentalFormState'); if (s) { try { const { customer: c, lines: l, discount: d, taxRate: t, amountPaid: a, paymentMethod: p } = JSON.parse(s); setCustomer(c || EMPTY_CUSTOMER); setLines(l || [newLine()]); setDiscount(d || ''); setTaxRate(t || '8.25'); setAmountPaid(a || ''); setPaymentMethod(p || ''); } catch(_) {} } } } },
              { icon: History, title: 'Rental history', onClick: () => navigate('/rental-history') },
              { icon: Settings, title: 'Pricing editor', onClick: () => navigate('/pricing-editor') },
              { icon: Link2, title: 'Dependencies', onClick: () => navigate('/dependencies-editor') },
              { icon: Building2, title: 'Branch settings', onClick: () => navigate('/branch-settings') },
              { icon: Cog, title: 'Company settings', onClick: () => navigate('/company-settings') },
              { icon: Activity, title: 'Equipment status', onClick: () => navigate('/equipment-status') },
              { icon: Users, title: 'Customers', onClick: () => navigate('/customers') },
              { icon: Truck, title: 'Delivery matrix', onClick: () => navigate('/delivery-matrix') },
              { icon: Tag, title: 'Discounts', onClick: () => navigate('/discounts') },
              { icon: Wrench, title: 'Shop', onClick: () => navigate('/shop') },
            ].map(({ icon: Ic, title, onClick }) => (
              <button key={title} onClick={onClick} title={title} className="p-2 rounded-lg hover:bg-white/10 text-white transition">
                <Ic className="w-4 h-4" />
              </button>
            ))}
          </div>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Branch selector — top of form, establishes context for everything below */}
        <div className="bg-white rounded-xl border shadow-sm px-5 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Working Branch</span>
          <div style={{ width: '200px' }}>
            <BranchSelect
              value={customer.branch}
              onChange={(v) => setCustomer({ ...customer, branch: v })}
            />
          </div>
        </div>

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

        {/* Branch selector + Equipment lines */}
        <div className="space-y-3">
          {/* Equipment items with branch selector prepended to first item */}
          {lines.map((line, idx) => {
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
                afterDatesRef={addButtonRef}
                customerBranch={customer.branch}
                onAlertRequired={(eq, onConfirm) => setPendingAlertEquipment({ eq, onConfirm })}
              />
            );
          })}
        </div>

        {/* RTO Nudge — shown when any selected equipment is RTO eligible */}
        {(() => {
          const rtoLines = lines.filter(l => {
            const eq = equipment.find(e => e.id === l.equipmentId);
            return eq?.rentToOwnEligible && eq?.rentToOwnPrice && eq?.rentToOwnTermMonths;
          });
          if (rtoLines.length === 0) return null;
          const firstRtoEq = equipment.find(e => e.id === rtoLines[0].equipmentId);

          return (
            <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${rtoData ? 'bg-green-50 border-green-400' : 'bg-purple-50 border-purple-300'}`}>
              <ShoppingBag className={`w-5 h-5 flex-shrink-0 mt-0.5 ${rtoData ? 'text-green-600' : 'text-purple-600'}`} />
              <div className="flex-1">
                {rtoData ? (
                  <>
                    <div className="font-semibold text-green-900 text-sm">✅ RTO Contract Configured</div>
                    <div className="text-xs text-green-800 mt-1">
                      Purchase price: <strong>${rtoData.purchasePrice.toFixed(2)}</strong> · 
                      ${(rtoData.purchasePrice / rtoData.termMonths).toFixed(2)}/mo × {rtoData.termMonths} months · 
                      {rtoData.creditPercent}% rental credit · Expires {rtoData.expiryDate}
                    </div>
                    <button onClick={() => setRtoData(null)} className="text-xs text-green-700 underline mt-1">Remove RTO</button>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-purple-900 text-sm">💜 Rent-to-Own Available!</div>
                    {rtoLines.map(l => {
                      const eq = equipment.find(e => e.id === l.equipmentId);
                      const monthly = (eq.rentToOwnPrice / eq.rentToOwnTermMonths).toFixed(2);
                      return (
                        <div key={l.id} className="text-xs text-purple-800 mt-1">
                          <strong>{eq.name}</strong>: Own it for <strong>${monthly}/mo</strong> over {eq.rentToOwnTermMonths} months (${eq.rentToOwnPrice.toFixed(2)} total).
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              {!rtoData && (
                <button
                  onClick={() => setRtoSetup({ eq: firstRtoEq })}
                  className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  Set Up RTO →
                </button>
              )}
            </div>
          );
        })()}

        {/* Add Equipment */}
        <button
          ref={addButtonRef}
          onClick={addLine}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Equipment
        </button>

        {/* Customer identity — SECOND: collect after availability confirmed */}
        <CustomerIdentity
          customer={customer}
          currentUser={currentUser}
          branchSettings={branchSettings}
          onChange={(updated) => {
            setCustomer(updated);
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
              const filtered = prev.filter(l => l.equipmentId);
              return [...filtered, ...newLines];
            });
          }}
        />

        {/* Delivery & Return Methods */}
        <div className="bg-white rounded-xl border shadow-sm px-6 py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-6">
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
            {rentalDayMode === 'clock_hour' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">⏰ Pickup Time</label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                  className="border border-input rounded-md px-2 py-1.5 text-sm bg-white w-28"
                  title="Sets the daily billing anchor time (24-hour rolling)"
                />
              </div>
            )}
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
            {rentalDayMode === 'clock_hour' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">⏰ Return Time</label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="border border-input rounded-md px-2 py-1.5 text-sm bg-white w-28"
                  title="Sets the daily billing anchor time for returns (24-hour rolling)"
                />
              </div>
            )}
          </div>
          {deliveryMethod === 'company_delivery' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="text-xs font-semibold text-amber-800">📍 Delivery / Worksite Address</div>
              <div className="text-xs text-amber-700">Leave blank to use the customer's home address on file.</div>
              <input
                className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
                placeholder="Street address"
                value={worksiteAddress}
                onChange={e => setWorksiteAddress(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="col-span-1 h-9 border border-input rounded-md px-3 text-sm bg-white"
                  placeholder="City"
                  value={worksiteCity}
                  onChange={e => setWorksiteCity(e.target.value)}
                />
                <input
                  className="h-9 border border-input rounded-md px-3 text-sm bg-white"
                  placeholder="ST"
                  maxLength={2}
                  value={worksiteState}
                  onChange={e => setWorksiteState(e.target.value)}
                />
                <input
                  className="h-9 border border-input rounded-md px-3 text-sm bg-white"
                  placeholder="ZIP"
                  value={worksiteZip}
                  onChange={e => setWorksiteZip(e.target.value)}
                />
              </div>

              {/* AI Delivery Recommendation */}
              <DeliveryRecommendation
                cartItems={lines.filter(l => l.equipmentId).map(l => {
                  const eq = equipment.find(e => e.id === l.equipmentId);
                  return { name: l.equipmentName, category: eq?.category, quantity: l.quantity || 1, weight: null };
                })}
                deliveryAddress={{
                  address: worksiteAddress || customer.address,
                  city: worksiteCity || customer.city,
                  state: worksiteState || customer.state,
                  zip: worksiteZip || customer.zip,
                }}
                onAddDeliveryFee={(fee) => {
                  setAiDeliveryRec({ addedFee: fee });
                  setAiDeliveryFee(fee);
                }}
              />
            </div>
          )}
        </div>

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
              deliveryFee={aiDeliveryFee ?? calcDeliveryFee(deliveryMatrices[customer.branch], customer.zip)}
              returnFee={calcDeliveryFee(deliveryMatrices[customer.branch], customer.zip)}
              appliedPromo={appliedPromo}
              onPromoApply={(promo) => {
                setAppliedPromo(promo);
                // Increment usage count non-blocking
                supabaseData.PromoCode.update(promo.id, { usageCount: (promo.usageCount || 0) + 1 }).catch(() => {});
              }}
              onPromoRemove={() => setAppliedPromo(null)}
              loyaltyDiscount={loyaltyDiscount}
              volumeRules={volumeRules}
              equipment={equipment}
              promoCodes={promoCodes}
              showManualInvoiceField={false}
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
            onClick={() => { setCustomer(EMPTY_CUSTOMER); setLines([newLine()]); setDiscount(''); setTaxRate('8.25'); setAmountPaid(''); setReturnMethod('customer_return'); setAppliedPromo(null); setLoyaltyDiscount(null); setManualInvoiceNumber(''); }}
          >
            Clear
          </Button>
          <Button
            onClick={() => handleSave('pending')}
            disabled={saving}
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Quote'}
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