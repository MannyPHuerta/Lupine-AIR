import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { openInvoicePopup } from '@/lib/buildInvoiceHTML';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
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
      };
    }
    map[key].rentalIds.push(r.id);
    // amountPaid and invoiceNumber are stored on every rental in the order — only take from first
    if (map[key].rentalIds.length === 1) {
      map[key].amountPaid = r.amountPaid || 0;
      map[key].invoiceNumber = r.invoiceNumber || '';
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

function OrderCard({ order, equipment, companyInfo, branchSettings, onConfirmed }) {
  const [expanded, setExpanded] = useState(false);
  const [printing, setPrinting] = useState(false);

  const lines = order.lines;
  const taxRateDecimal = (order.taxRate || 8.25) / 100;
  const rentalTotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const taxableBase = lines.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
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
    return { ...l, equipmentName: eq?.name || l.equipmentName || l.equipmentId, specs: eq?.specs || {} };
  });

  const handlePrint = async () => {
    const bs = branchSettings[order.customer.branch];
    openInvoicePopup({
      ...order,
      id: order.invoiceNumber || order.id,
      lines: enriched,
      branchInfo: bs ? { name: bs.branchName || order.customer.branch, address: bs.address || '', phone: bs.phone || '', email: bs.email || '' } : { name: order.customer.branch, address: '', phone: '', email: '' },
      companyInfo: companyInfo ? { companyName: companyInfo.companyName || '', logoUrl: companyInfo.logoUrl || '', invoiceFooter: companyInfo.invoiceFooter || '' } : {},
    }, amountPaid);

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
  const [companyInfo, setCompanyInfo] = useState(null);
  const [branchSettings, setBranchSettings] = useState({});
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
              <OrderCard key={order.id} order={order} equipment={equipment} companyInfo={companyInfo} branchSettings={branchSettings} onConfirmed={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}