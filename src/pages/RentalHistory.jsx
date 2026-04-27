import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getBranchInfo } from '@/lib/branchInfo';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

const fmt = (n) => (n || 0).toFixed(2);

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
      };
    }
    map[key].rentalIds.push(r.id);
    map[key].amountPaid += (r.amountPaid || 0);
    map[key].lines.push({
      rentalId: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipmentName || r.equipmentId,
      quantity: 1,
      rate: r.baseAmount && r.totalDays ? r.baseAmount / r.totalDays : 0,
      baseAmount: r.baseAmount || 0,
      taxable: r.taxRate == null ? true : r.taxRate > 0,
      deposit: r.deposit || 0,
      startDate: r.startDate,
      endDate: r.endDate,
    });
  });
  return Object.values(map).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function buildInvoiceHTML(order, amountPaid) {
  const branch = getBranchInfo(order.customer.branch);
  const lines = order.lines;
  const taxRateDecimal = (order.taxRate || 8.25) / 100;
  const rentalSubtotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const depositTotal = lines.reduce((s, l) => s + (l.deposit || 0) * (l.quantity || 1), 0);
  const taxableBase = lines.reduce((s, l) => s + (l.taxable ? (l.baseAmount || 0) : 0), 0);
  const taxAmount = Math.round(taxableBase * taxRateDecimal * 100) / 100;
  const grandTotal = rentalSubtotal + taxAmount + depositTotal;
  const paid = parseFloat(amountPaid) || 0;
  const balance = grandTotal - paid;

  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const lineRows = lines.filter(l => l.equipmentId).map(l => {
    const tax = l.taxable ? Math.round((l.baseAmount || 0) * taxRateDecimal * 100) / 100 : 0;
    const total = (l.baseAmount || 0) + tax + (l.deposit || 0) * (l.quantity || 1);
    return `
      <tr>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #f0f0f0;font-weight:500">${l.equipmentName}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666">${l.quantity}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:11px;color:#666">${l.startDate || ''} – ${l.endDate || ''}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">$${fmt(l.rate)}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right">$${fmt(l.baseAmount)}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">${l.taxable ? '$' + fmt(tax) : '—'}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">${l.deposit > 0 ? '$' + fmt((l.deposit || 0) * (l.quantity || 1)) : '—'}</td>
        <td style="padding:6px 0 6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">$${fmt(total)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice – ${order.customer.name}</title>
  <style>
    body { font-family: sans-serif; font-size: 13px; color: #111; margin: 0; padding: 32px; }
    @media print { body { padding: 16px; } #toolbar { display: none !important; } }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .05em; padding: 4px 6px 8px; border-bottom: 2px solid #e5e7eb; }
    #toolbar { display:flex; align-items:center; gap:12px; margin-bottom:24px; padding:12px 16px; background:#f1f5f9; border-radius:8px; }
    #paid-input { border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:14px; width:120px; }
    #print-btn { padding: 8px 24px; background:#3730a3; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
    #print-btn:hover { background:#312e81; }
    #balance-display { font-weight:700; font-size:15px; margin-left:auto; }
    #totals-section { display:flex;justify-content:flex-end;margin-bottom:32px; }
    #totals-box { width:220px; }
    .total-row { display:flex; justify-content:space-between; color:#555; margin-bottom:4px; }
    .grand-row { display:flex; justify-content:space-between; font-weight:700; font-size:15px; border-top:2px solid #e5e7eb; padding-top:8px; margin-top:8px; }
    .paid-row { display:flex; justify-content:space-between; color:#16a34a; margin-top:6px; font-weight:600; }
    .balance-row { display:flex; justify-content:space-between; font-weight:700; font-size:15px; border-top:2px solid #e5e7eb; padding-top:8px; margin-top:4px; }
  </style>
</head>
<body>
  <div id="toolbar">
    <label style="font-weight:600;font-size:14px">Amount Paid: $</label>
    <input id="paid-input" type="number" min="0" step="0.01" value="${paid}" oninput="updateTotals()" />
    <button id="print-btn" onclick="window.print()">🖨 Print Invoice</button>
    <span id="balance-display"></span>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div>
      <div style="font-size:20px;font-weight:700;color:#1e1b4b">${branch.name}</div>
      ${branch.address ? `<div style="color:#555;margin-top:4px">${branch.address}</div>` : ''}
      ${branch.phone ? `<div style="color:#555">${branch.phone}</div>` : ''}
      ${branch.email ? `<div style="color:#555">${branch.email}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:28px;font-weight:700;color:#d1d5db">INVOICE</div>
      ${order.id ? `<div style="font-size:11px;color:#888">#${order.id.slice(-8).toUpperCase()}</div>` : ''}
      ${dateStr ? `<div style="font-size:11px;color:#888">${dateStr}</div>` : ''}
    </div>
  </div>

  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
    <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Bill To</div>
    <div style="font-weight:600">${order.customer.name}</div>
    ${order.customer.phone ? `<div style="color:#555">${order.customer.phone}</div>` : ''}
    ${order.customer.email ? `<div style="color:#555">${order.customer.email}</div>` : ''}
    ${order.customer.notes ? `<div style="color:#888;font-size:12px;margin-top:6px;font-style:italic">${order.customer.notes}</div>` : ''}
  </div>

  <table style="margin-bottom:24px">
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:center;width:48px">Qty</th>
        <th style="text-align:center;width:140px">Dates</th>
        <th style="text-align:right;width:72px">Rate/Day</th>
        <th style="text-align:right;width:80px">Rental</th>
        <th style="text-align:right;width:64px">Tax</th>
        <th style="text-align:right;width:72px">Deposit</th>
        <th style="text-align:right;width:80px">Total</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div id="totals-section">
    <div id="totals-box">
      <div class="total-row"><span>Rental Subtotal</span><span>$${fmt(rentalSubtotal)}</span></div>
      <div class="total-row"><span>Sales Tax (${(taxRateDecimal * 100).toFixed(2)}%)</span><span>$${fmt(taxAmount)}</span></div>
      ${depositTotal > 0 ? `<div class="total-row"><span>Deposits</span><span>$${fmt(depositTotal)}</span></div>` : ''}
      <div class="grand-row"><span>Total Due</span><span style="color:#3730a3">$${fmt(grandTotal)}</span></div>
      <div id="paid-display"></div>
      <div id="balance-section"></div>
    </div>
  </div>

  <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:11px;color:#aaa;text-align:center">
    Thank you for your business! Questions? Contact us at ${branch.email || branch.phone || 'your local branch'}.
  </div>

  <script type="text/javascript">
    var GT = ${grandTotal};
    function updateTotals() {
      var paidVal = parseFloat(document.getElementById('paid-input').value) || 0;
      var balance = GT - paidVal;
      var paidEl = document.getElementById('paid-display');
      var balEl = document.getElementById('balance-section');
      var bdEl = document.getElementById('balance-display');
      if (paidVal > 0) {
        paidEl.innerHTML = '<div class="paid-row"><span>Paid</span><span>$' + paidVal.toFixed(2) + '</span></div>';
        balEl.innerHTML = '<div class="balance-row"><span>Balance</span><span style="color:' + (balance <= 0 ? '#16a34a' : '#dc2626') + '">$' + balance.toFixed(2) + '</span></div>';
        bdEl.textContent = 'Balance: $' + balance.toFixed(2);
        bdEl.style.color = balance <= 0 ? '#16a34a' : '#dc2626';
      } else {
        paidEl.innerHTML = '';
        balEl.innerHTML = '';
        bdEl.textContent = '';
      }
    }
    window.onload = function() { updateTotals(); };
  </script>
</body>
</html>`;
}

function OrderCard({ order, equipment, onConfirmed }) {
  const [expanded, setExpanded] = useState(false);
  const [printing, setPrinting] = useState(false);

  const lines = order.lines;
  const taxRateDecimal = (order.taxRate || 8.25) / 100;
  const rentalTotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const taxableBase = lines.reduce((s, l) => s + (l.taxable ? (l.baseAmount || 0) : 0), 0);
  const taxAmount = Math.round(taxableBase * taxRateDecimal * 100) / 100;
  const depositTotal = lines.reduce((s, l) => s + (l.deposit || 0), 0);
  const grandTotal = rentalTotal + taxAmount + depositTotal;
  const amountPaid = order.amountPaid || 0;
  const balance = grandTotal - amountPaid;

  const dateRange = lines.length > 0
    ? `${lines[0].startDate || '?'} – ${lines[lines.length - 1].endDate || '?'}`
    : '';

  const enriched = lines.map(l => {
    const eq = equipment.find(e => e.id === l.equipmentId);
    return { ...l, equipmentName: eq?.name || l.equipmentName || l.equipmentId };
  });

  const handlePrint = async () => {
    // Open window immediately (must be synchronous with user click to avoid popup block)
    const win = window.open('', '_blank');
    const html = buildInvoiceHTML({ ...order, lines: enriched }, amountPaid);
    win.document.write(html);
    win.document.close();

    // Confirm in background
    setPrinting(true);
    await Promise.all(order.rentalIds.map(id =>
      base44.entities.Rental.update(id, { status: 'confirmed' })
    ));
    setPrinting(false);
    onConfirmed();
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
            <div className="flex justify-between"><span>Sales Tax (8.25%)</span><span>${taxAmount.toFixed(2)}</span></div>
            {depositTotal > 0 && <div className="flex justify-between"><span>Deposits</span><span>${depositTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 border-t pt-1 mt-1"><span>Total Due</span><span className="text-indigo-700">${grandTotal.toFixed(2)}</span></div>
            {amountPaid > 0 && <div className="flex justify-between text-green-700 font-semibold"><span>Paid</span><span>${amountPaid.toFixed(2)}</span></div>}
            {amountPaid > 0 && <div className="flex justify-between font-bold border-t pt-1"><span>Balance</span><span className={balance <= 0 ? 'text-green-600' : 'text-red-600'}>${balance.toFixed(2)}</span></div>}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handlePrint} disabled={printing} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Printer className="w-4 h-4" /> {printing ? 'Saving…' : 'Print & Confirm'}
            </Button>
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const reload = () => {
    base44.entities.Rental.list('-created_date', 2000).then(setRentals);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Rental.list('-created_date', 2000),
      base44.entities.Equipment.list('-created_date', 500),
    ]).then(([rent, eq]) => {
      setRentals(rent);
      setEquipment(eq);
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
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={() => navigate('/availability')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Rental History</div>
            <div className="text-indigo-300 text-xs">{orders.length} orders</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
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
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
              <OrderCard key={order.id} order={order} equipment={equipment} onConfirmed={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}