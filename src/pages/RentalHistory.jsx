import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Printer, ChevronDown, ChevronUp, Mail, X, ArrowRight, Pencil, Download, ClipboardList, Camera, AlertCircle, Check, Clock, ShoppingBag } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import EditRentalPanel from '@/components/rentals/EditRentalPanel';
import SignaturePad from '@/components/invoice/SignaturePad';
import PhotoCapture from '@/components/delivery/PhotoCapture';
import ExtraShiftBillingModal from '@/components/rentals/ExtraShiftBillingModal';
import RentToOwnPanel from '@/components/rentals/RentToOwnPanel';


const STATUS_COLORS = {
  quote: 'bg-gray-100 text-gray-700',
  reservation: 'bg-yellow-100 text-yellow-800',
  contract: 'bg-blue-100 text-blue-800',
  out: 'bg-green-100 text-green-800',
  returned: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  // legacy
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
};

function groupIntoOrders(rentals) {
  const map = {};
  rentals.forEach(r => {
    const minute = r.created_date ? r.created_date.slice(0, 16) : 'unknown';
    const key = `${r.customerName}||${minute}`;
    if (!map[key]) {
      map[key] = {
        id: key,
        createdAt: r.created_date,
        rentalIds: [],
        customer: {
          name: r.customerName,
          phone: r.customerPhone || '',
          email: r.customerEmail || '',
          branch: r.branch || '',
          notes: r.notes || '',
        },
        lines: [],
        status: r.status,
        taxRate: 8.25,
        amountPaid: 0,
        signatureDataUrl: null,
      };
    }
    map[key].rentalIds.push(r.id);
    // amountPaid and invoiceNumber are stored on every rental in the order — only take from first
    if (map[key].rentalIds.length === 1) {
      map[key].amountPaid = r.amountPaid || 0;
      map[key].invoiceNumber = r.invoiceNumber || '';
      map[key].signatureDataUrl = r.signatureDataUrl || null;
      map[key].deliveryMethod = r.deliveryMethod || 'customer_pickup';
      map[key].returnMethod = r.returnMethod || 'customer_return';
      map[key].worksiteAddress = r.worksiteAddress || '';
      map[key].worksiteCity = r.worksiteCity || '';
      map[key].worksiteState = r.worksiteState || '';
      map[key].worksiteZip = r.worksiteZip || '';
    }
    map[key].lines.push({
      rentalId: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipmentName || r.equipmentId,
      quantity: 1,
      rate: r.baseAmount && r.totalDays ? r.baseAmount / r.totalDays : 0,
      baseAmount: r.baseAmount || 0,
      // taxable=true unless taxRate is explicitly 0
      taxable: r.taxRate !== 0,
      deposit: r.deposit || 0,
      startDate: r.startDate,
      endDate: r.endDate,
    });
  });
  return Object.values(map).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function OrderCard({ order, equipment, rentals, companyInfo, branchSettings, onConfirmed, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [emailAddress, setEmailAddress] = useState(order.customer.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(order.signatureDataUrl || null);
  const [agreement, setAgreement] = useState(null);
  const [loadingAgreement, setLoadingAgreement] = useState(false);
  const [showReturnCheckIn, setShowReturnCheckIn] = useState(false);
  const [returnPhotos, setReturnPhotos] = useState([]);
  const [conditionNotes, setConditionNotes] = useState({});
  const [needsRouting, setNeedsRouting] = useState({});
  const [showExtraShift, setShowExtraShift] = useState(false);
  const [showRentToOwn, setShowRentToOwn] = useState(false);

  const lines = order.lines;
  const taxRateDecimal = (order.taxRate || 8.25) / 100;
  const rentalTotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const taxableBase = lines.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
  const taxAmount = Math.round(taxableBase * taxRateDecimal * 100) / 100;
  const depositTotal = lines.reduce((s, l) => s + (l.deposit || 0), 0);
  const deliveryFee = order.rentalIds && order.rentalIds.length > 0 ? (order.lines[0]?.deliveryFee || 0) : 0;
  const returnFee = order.rentalIds && order.rentalIds.length > 0 ? (order.lines[0]?.returnFee || 0) : 0;
  const grandTotal = rentalTotal + taxAmount + depositTotal + deliveryFee + returnFee;
  const amountPaid = order.amountPaid || 0;
  const balance = grandTotal - amountPaid;

  const dateRange = lines.length > 0
    ? `${lines[0].startDate || '?'} – ${lines[lines.length - 1].endDate || '?'}`
    : '';

  // Load agreement when order expands
  useEffect(() => {
    if (expanded && !agreement && !loadingAgreement) {
      setLoadingAgreement(true);
      base44.entities.RentalAgreement.filter({ branch: order.customer.branch }, '-updated_date', 1)
        .then(results => {
          setAgreement(results[0] || null);
          setLoadingAgreement(false);
        })
        .catch(() => setLoadingAgreement(false));
    }
  }, [expanded, agreement, loadingAgreement, order.customer.branch]);

  const enriched = lines.map(l => {
    const eq = equipment.find(e => e.id === l.equipmentId);
    return { ...l, equipmentName: eq?.name || l.equipmentName || l.equipmentId, specs: eq?.specs || {} };
  });

  const handlePrint = async () => {
    // --- Availability check ---
    setPrinting(true);
    try {
      const allRentals = await base44.entities.Rental.list('-created_date', 2000);
      const conflicts = [];
      for (const line of enriched) {
        if (!line.equipmentId || line.equipmentId === 'quote-item') continue;
        const conflicting = allRentals.filter(r =>
          r.equipmentId === line.equipmentId &&
          !order.rentalIds.includes(r.id) &&
          ['contract', 'out', 'reservation'].includes(r.status) &&
          r.startDate && r.endDate && line.startDate && line.endDate &&
          new Date(r.startDate) <= new Date(line.endDate) &&
          new Date(r.endDate) >= new Date(line.startDate)
        );
        if (conflicting.length > 0) {
          conflicts.push(`${line.equipmentName}: already booked ${conflicting[0].startDate}–${conflicting[0].endDate} (${conflicting[0].invoiceNumber || conflicting[0].id})`);
        }
      }
      if (conflicts.length > 0) {
        const proceed = confirm(`⚠️ Availability conflict:\n\n${conflicts.join('\n')}\n\nProceed anyway?`);
        if (!proceed) { setPrinting(false); return; }
      }
    } catch (e) {
      console.warn('Availability check failed:', e.message);
    }

    const bs = branchSettings[order.customer.branch];
    const { openInvoiceWindow, writeInvoiceToWindow } = await import('@/lib/buildInvoiceHTML');
    const win = openInvoiceWindow();

    writeInvoiceToWindow(win, {
      ...order,
      id: order.invoiceNumber || order.id,
      lines: enriched,
      branchInfo: bs ? { name: bs.branchName || order.customer.branch, address: bs.address || '', phone: bs.phone || '', email: bs.email || '' } : { name: order.customer.branch, address: '', phone: '', email: '' },
      companyInfo: companyInfo ? { companyName: companyInfo.companyName || '', logoUrl: companyInfo.logoUrl || '', invoiceFooter: companyInfo.invoiceFooter || '' } : {},
      agreement: agreement ? { title: agreement.title || 'Equipment Rental Agreement', content: agreement.content, pages: agreement.pages || 1 } : null,
    }, amountPaid, signatureDataUrl);

    // Update rental status + mark equipment as reserved
    await Promise.all(order.rentalIds.map(id =>
      base44.entities.Rental.update(id, { status: 'contract' })
    ));

    // Mark each equipment unit as reserved
    for (const line of enriched) {
      if (!line.equipmentId || line.equipmentId === 'quote-item') continue;
      try {
        await base44.entities.Equipment.update(line.equipmentId, { unitStatus: 'reserved' });
      } catch (e) {
        console.warn('Could not update equipment status:', e.message);
      }
    }

    setPrinting(false);
    onConfirmed();
  };

  const STATUS_FLOW = ['quote', 'reservation', 'contract', 'out', 'returned', 'completed'];
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    if (!confirm(`Move this order to "${nextStatus}"?`)) return;
    setAdvancingStatus(true);
    await Promise.all(order.rentalIds.map(id =>
      base44.entities.Rental.update(id, { status: nextStatus })
    ));
    setAdvancingStatus(false);
    onConfirmed();
  };

  const handleReturnCheckIn = async () => {
    if (!showReturnCheckIn) {
      setShowReturnCheckIn(true);
      return;
    }
    
    setAdvancingStatus(true);
    try {
      // Update all rentals to "returned" status
      for (const rentalId of order.rentalIds) {
        const rental = rentals.find(r => r.id === rentalId);
        if (!rental) continue;

        const equipment = rental.equipmentId ? equipment.find(e => e.id === rental.equipmentId) : null;
        
        // Get hour meter end reading from user
        let hourMeterEnd = null;
        if (equipment?.hasHourMeter) {
          const prompt = `Enter hour meter reading for ${equipment.name} (current: ${equipment.currentHourMeterReading || 0}):`;
          hourMeterEnd = prompt(prompt);
          if (hourMeterEnd) {
            await base44.entities.Equipment.update(rental.equipmentId, {
              currentHourMeterReading: parseFloat(hourMeterEnd)
            });
          }
        }

        // Calculate hours used and charges
        const hourMeterStart = rental.hourMeterStart || 0;
        const hoursUsed = hourMeterEnd ? (parseFloat(hourMeterEnd) - hourMeterStart) : 0;
        const hourlyRate = rental.hourlyRate || equipment?.hourlyRate || 0;
        const hourMeterCharges = hoursUsed > 0 ? (hoursUsed * hourlyRate) : 0;

        // Get condition notes and routing
        const conditionNote = conditionNotes[rentalId] || '';
        const routing = needsRouting[rentalId] || 'available';

        // Update rental with return data
        await base44.entities.Rental.update(rentalId, {
          status: 'returned',
          hourMeterEnd: hourMeterEnd ? parseFloat(hourMeterEnd) : null,
          hoursUsed: hoursUsed > 0 ? hoursUsed : null,
          hourMeterCharges: hourMeterCharges > 0 ? hourMeterCharges : 0,
          returnConditionNotes: conditionNote,
          returnPhotos: returnPhotos[rentalId] || [],
        });

        // Update equipment status based on routing
        if (rental.equipmentId && rental.equipmentId !== 'quote-item') {
          await base44.entities.Equipment.update(rental.equipmentId, {
            unitStatus: routing,
            statusNote: conditionNote || null
          });
        }
      }

      alert('✓ Equipment returned successfully!');
      setShowReturnCheckIn(false);
      setReturnPhotos({});
      setConditionNotes({});
      setNeedsRouting({});
      onConfirmed();
    } catch (err) {
      alert(`Error processing return: ${err.message}`);
    } finally {
      setAdvancingStatus(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!emailAddress) {
      alert('Please enter an email address');
      return;
    }
    setSendingEmail(true);
    try {
      console.log('Sending email with:', { rentalIds: order.rentalIds, emailAddress });
      const res = await base44.functions.invoke('sendRentalConfirmation', {
        rentalIds: order.rentalIds,
        customerEmail: emailAddress,
        customerPhone: order.customer.phone || '',
        invoiceNumber: order.invoiceNumber || order.id,
        autoSendCommunications: true,
      });
      console.log('Email response:', res.data);
      if (res.data?.error && !res.data?.emailSent) {
        alert(`Email failed: ${res.data.error}`);
      } else {
        alert('Invoice emailed successfully!');
        setEmailMode(false);
      }
    } catch (err) {
      console.error('Email error:', err);
      // Email may have still sent — check logs
      alert(`Note: Email may have sent but got an unexpected response. Check the customer's inbox. (${err.message || 'Unknown error'})`);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{order.customer.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {lines.length} item{lines.length !== 1 ? 's' : ''} · {dateRange}
            {order.customer.branch && <span className="ml-2 text-gray-400">{order.customer.branch}</span>}
            {order.invoiceNumber && <span className="ml-2 font-mono text-indigo-500">#{order.invoiceNumber}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-indigo-700">${grandTotal.toFixed(2)}</div>
          <div className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
          {order.status}
        </span>
        <button className="text-gray-400 ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {order.customer.phone && <span>📞 {order.customer.phone}</span>}
            {order.customer.email && <span>✉️ {order.customer.email}</span>}
            {order.customer.notes && <span className="italic text-gray-400">"{order.customer.notes}"</span>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left pb-1">Item</th>
                <th className="text-center pb-1 w-16">Qty</th>
                <th className="text-center pb-1 w-32">Dates</th>
                <th className="text-right pb-1 w-24">Rental</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((l, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">{l.equipmentName}</td>
                  <td className="py-1.5 text-center text-gray-500">{l.quantity}</td>
                  <td className="py-1.5 text-center text-xs text-gray-500">{l.startDate} – {l.endDate}</td>
                  <td className="py-1.5 text-right font-medium">${(l.baseAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between"><span>Rental Subtotal</span><span>${rentalTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Sales Tax ({(taxRateDecimal * 100).toFixed(2)}%)</span><span>${taxAmount.toFixed(2)}</span></div>
            {depositTotal > 0 && <div className="flex justify-between"><span>Deposits</span><span>${depositTotal.toFixed(2)}</span></div>}
            {deliveryFee > 0 && <div className="flex justify-between"><span>🚚 Delivery Fee</span><span>${deliveryFee.toFixed(2)}</span></div>}
            {returnFee > 0 && <div className="flex justify-between"><span>🚚 Return/Pickup Fee</span><span>${returnFee.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 border-t pt-1 mt-1"><span>Total Due</span><span className="text-indigo-700">${grandTotal.toFixed(2)}</span></div>
            {amountPaid > 0 && <div className="flex justify-between text-green-700 font-semibold"><span>Paid</span><span>${amountPaid.toFixed(2)}</span></div>}
            {amountPaid > 0 && <div className="flex justify-between font-bold border-t pt-1"><span>Balance</span><span className={balance <= 0 ? 'text-green-600' : 'text-red-600'}>${balance.toFixed(2)}</span></div>}
          </div>

          {/* Agreement display */}
          {agreement && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-700 uppercase">{agreement.title || 'Equipment Rental Agreement'}</div>
              <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{agreement.content}</div>
              {signatureDataUrl && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium text-gray-500 mb-1">Customer Signature</div>
                  <img src={signatureDataUrl} alt="signature" className="h-12 border rounded" />
                </div>
              )}
            </div>
          )}

          {/* Inline signature pad — shown when ready to print */}
          {showSignature && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <SignaturePad
                onSave={(url) => { setSignatureDataUrl(url); }}
                onClear={() => setSignatureDataUrl(null)}
              />
              {signatureDataUrl && (
                <div className="text-xs text-green-700 font-medium flex items-center gap-2">
                  <span>✓ Signature captured</span>
                  <button onClick={() => setSignatureDataUrl(null)} className="text-gray-400 hover:text-red-500 underline">Remove</button>
                </div>
              )}
            </div>
          )}

          {/* Extra Shift Billing Modal */}
          {showExtraShift && (
            <ExtraShiftBillingModal
              rental={rentals.find(r => r.id === order.rentalIds[0])}
              equipment={equipment.find(e => e.id === order.lines[0]?.equipmentId)}
              onClose={() => setShowExtraShift(false)}
              onSuccess={() => {
                setShowExtraShift(false);
                onConfirmed();
                alert('Extra shift billing added successfully!');
              }}
            />
          )}

          {/* Rent-to-Own Panel */}
          {showRentToOwn && (
            <RentToOwnPanel
              rental={rentals.find(r => r.id === order.rentalIds[0])}
              onClose={() => {
                setShowRentToOwn(false);
                onConfirmed();
              }}
            />
          )}

          {/* Return Check-In Modal */}
          {showReturnCheckIn && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
              <div className="flex items-center gap-2 text-green-800 font-semibold">
                <Camera className="w-5 h-5" />
                Equipment Return Check-In
              </div>

              {order.lines.map((line, idx) => {
                const eq = equipment.find(e => e.id === line.equipmentId);
                const rental = rentals.find(r => r.id === line.rentalId);
                return (
                  <div key={line.rentalId} className="border rounded-lg p-3 bg-white space-y-3">
                    <div className="font-medium text-gray-900">{line.equipmentName}</div>
                    
                    {/* Hour meter */}
                    {eq?.hasHourMeter && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hour Meter Reading</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={`Current: ${eq.currentHourMeterReading || 0}`}
                          className="border rounded px-2 py-1 text-sm w-full"
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (val) {
                              await base44.entities.Equipment.update(eq.id, { currentHourMeterReading: val });
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Condition notes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Condition Notes</label>
                      <textarea
                        placeholder="Any damage, cleaning needed, issues..."
                        className="border rounded px-2 py-1 text-sm w-full h-20"
                        value={conditionNotes[line.rentalId] || ''}
                        onChange={(e) => setConditionNotes(prev => ({ ...prev, [line.rentalId]: e.target.value }))}
                      />
                    </div>

                    {/* Photos */}
                    <PhotoCapture
                      photos={returnPhotos[line.rentalId] || []}
                      onAddPhoto={(photo) => setReturnPhotos(prev => ({
                        ...prev,
                        [line.rentalId]: [...(prev[line.rentalId] || []), photo]
                      }))}
                      onRemovePhoto={(idx) => setReturnPhotos(prev => ({
                        ...prev,
                        [line.rentalId]: (prev[line.rentalId] || []).filter((_, i) => i !== idx)
                      }))}
                    />

                    {/* Routing */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Route Equipment To:</label>
                      <div className="space-y-2">
                        {[
                          { value: 'available', label: '✓ Available (Ready to Rent)', color: 'green' },
                          { value: 'in_shop', label: '🔧 Needs Repair (Shop)', color: 'orange' },
                          { value: 'in_laundry', label: '🧼 Needs Cleaning (Laundry)', color: 'blue' },
                          { value: 'awaiting_parts', label: '⏳ Awaiting Parts', color: 'yellow' },
                        ].map(opt => (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded border hover:bg-gray-50">
                            <input
                              type="radio"
                              name={`routing-${line.rentalId}`}
                              value={opt.value}
                              checked={(needsRouting[line.rentalId] || 'available') === opt.value}
                              onChange={() => setNeedsRouting(prev => ({ ...prev, [line.rentalId]: opt.value }))}
                              className={`w-4 h-4 accent-${opt.color}-600`}
                            />
                            <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowReturnCheckIn(false);
                    setReturnPhotos({});
                    setConditionNotes({});
                    setNeedsRouting({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReturnCheckIn}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" /> Complete Check-In
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => onEdit(order)} className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const bs = branchSettings[order.customer.branch];
                const { openInvoiceWindow, writeInvoiceToWindow } = await import('@/lib/buildInvoiceHTML');
                const win = openInvoiceWindow();
                writeInvoiceToWindow(win, {
                  ...order,
                  id: order.invoiceNumber || order.id,
                  lines: enriched,
                  branchInfo: bs ? { name: bs.branchName || order.customer.branch, address: bs.address || '', phone: bs.phone || '', email: bs.email || '' } : { name: order.customer.branch, address: '', phone: '', email: '' },
                  companyInfo: companyInfo ? { companyName: companyInfo.companyName || '', logoUrl: companyInfo.logoUrl || '', invoiceFooter: companyInfo.invoiceFooter || '' } : {},
                  agreement: agreement ? { title: agreement.title || 'Equipment Rental Agreement', content: agreement.content, pages: agreement.pages || 1 } : null,
                }, amountPaid, signatureDataUrl);
              }}
              className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <Download className="w-3.5 h-3.5" /> Reprint Contract
            </Button>
            {emailMode ? (
              <div className="flex items-center gap-2 w-full">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleEmailInvoice} disabled={sendingEmail} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Mail className="w-4 h-4" /> {sendingEmail ? 'Sending…' : 'Send'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEmailMode(false); setEmailAddress(order.customer.email || ''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                {/* Extra Shift Billing Button - shown when status is "out" */}
                {order.status === 'out' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setShowExtraShift(true)}
                      disabled={advancingStatus}
                      className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Clock className="w-4 h-4" /> Add Extra Shift
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowRentToOwn(true)}
                      disabled={advancingStatus}
                      className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <ShoppingBag className="w-4 h-4" /> Rent-to-Own
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReturnCheckIn}
                      disabled={advancingStatus}
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ArrowLeft className="w-4 h-4" /> Check-In Return
                    </Button>
                  </>
                )}
                {nextStatus && nextStatus !== 'returned' && (
                  <Button size="sm" onClick={handleAdvanceStatus} disabled={advancingStatus} variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                    <ArrowRight className="w-4 h-4" /> {advancingStatus ? '...' : `→ ${nextStatus}`}
                  </Button>
                )}
                <Button size="sm" onClick={() => setEmailMode(true)} variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" /> Email Invoice
                </Button>
                {!showSignature ? (
                  <Button size="sm" onClick={() => setShowSignature(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setShowSignature(false)} className="text-gray-500">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handlePrint} disabled={printing} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Printer className="w-4 h-4" /> {printing ? 'Saving…' : 'Confirm & Print'}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RentalHistory() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [branchSettings, setBranchSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);

  const reload = () => {
    base44.entities.Rental.list('-created_date', 2000).then(setRentals);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Rental.list('-created_date', 2000),
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.CompanySettings.list(),
      base44.entities.BranchSettings.list(),
    ]).then(([rent, eq, company, branches]) => {
      setRentals(rent);
      setEquipment(eq);
      setCompanyInfo(company[0] || null);
      const branchMap = {};
      branches.forEach(b => { branchMap[b.branch] = b; });
      setBranchSettings(branchMap);
      setLoading(false);
    });
  }, []);

  const orders = groupIntoOrders(rentals);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.phone.includes(q) ||
      o.customer.email.toLowerCase().includes(q) ||
      o.lines.some(l => l.equipmentName?.toLowerCase().includes(q));
    const matchInvoice = !invoiceSearch || (o.invoiceNumber && o.invoiceNumber.toString().includes(invoiceSearch));
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const orderDate = o.createdAt ? o.createdAt.split('T')[0] : '';
    const matchDateRange = (!dateFrom || orderDate >= dateFrom) && (!dateTo || orderDate <= dateTo);
    return matchSearch && matchInvoice && matchStatus && matchDateRange;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Rental History"
        subtitle={`${orders.length} orders`}
        icon={ClipboardList}
        action={
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/10 text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search customer, phone, email, equipment..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Invoice #"
              value={invoiceSearch}
              onChange={e => setInvoiceSearch(e.target.value)}
              className="w-32"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="quote">Quote</option>
              <option value="reservation">Reservation</option>
              <option value="contract">Contract</option>
              <option value="out">Out on Rental</option>
              <option value="returned">Returned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-600 block mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {(dateFrom || dateTo || invoiceSearch) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setInvoiceSearch(''); }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No rentals found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} equipment={equipment} rentals={rentals} companyInfo={companyInfo} branchSettings={branchSettings} onConfirmed={reload} onEdit={setEditingOrder} />
            ))}
          </div>
        )}
      </div>

      {editingOrder && (
        <EditRentalPanel
          order={editingOrder}
          equipment={equipment}
          onClose={() => setEditingOrder(null)}
          onSaved={() => { reload(); setEditingOrder(null); }}
        />
      )}


    </div>
  );
}