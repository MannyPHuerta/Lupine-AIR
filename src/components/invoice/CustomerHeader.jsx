import { Input } from '@/components/ui/input';

const BRANCHES = [
  '01 McAllen',
  '02 Weslaco',
  '03 Harlingen',
  '05 Brownsville',
  '06 Corpus',
  '98 Shop',
  '99 Warehouse',
];

export default function CustomerHeader({ customer, onChange }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Customer & Rental Info</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
          <Input
            autoFocus
            placeholder="John Doe"
            value={customer.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <Input
            placeholder="(555) 123-4567"
            value={customer.phone}
            onChange={e => set('phone', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={customer.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
          <select
            value={customer.branch}
            onChange={e => set('branch', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {BRANCHES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
          <Input
            type="date"
            value={customer.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
          <Input
            type="date"
            value={customer.endDate}
            onChange={e => set('endDate', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <Input
            placeholder="Special requests, delivery instructions..."
            value={customer.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}