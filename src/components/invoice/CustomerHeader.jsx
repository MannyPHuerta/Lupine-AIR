import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import BranchSelect from '@/components/invoice/BranchSelect';
import { formatPhoneUS } from '@/lib/phoneUtils';

const BRANCHES = [
  '01 McAllen',
  '02 Weslaco',
  '03 Harlingen',
  '05 Brownsville',
  '06 Corpus',
  '98 Shop',
  '99 Warehouse',
];

// Capitalize first letter of each word
function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function DateInput({ label, value, onChange }) {
  const ref = useRef(null);
  const open = () => { try { ref.current?.showPicker?.(); } catch (_) {} ref.current?.focus(); };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer items-center"
        onClick={open}
      >
        <input
          ref={ref}
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={open}
          className="flex-1 bg-transparent outline-none text-sm cursor-pointer"
        />
      </div>
    </div>
  );
}

/** Top card: customer identity fields (name, phone, email, branch) */
export function CustomerIdentity({ customer, onChange }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
          <Input
            autoFocus
            placeholder="John Doe"
            value={customer.name}
            onChange={e => set('name', toTitleCase(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <Input
            placeholder="(956) 123-4567"
            value={customer.phone}
            onChange={e => set('phone', formatPhoneUS(e.target.value))}
            inputMode="numeric"
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
          <BranchSelect value={customer.branch} onChange={v => set('branch', v)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
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

/** Bottom card: default rental dates and notes */
export function RentalDates({ customer, onChange }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DateInput label="Default Start" value={customer.startDate} onChange={v => set('startDate', v)} />
        <DateInput label="Default End" value={customer.endDate} onChange={v => set('endDate', v)} />
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <Input
            placeholder="Special requests, delivery instructions..."
            value={customer.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">Dates above pre-fill each line — override per item as needed.</p>
    </div>
  );
}

// Default export kept for any legacy usage
export default function CustomerHeader({ customer, onChange }) {
  return (
    <>
      <CustomerIdentity customer={customer} onChange={onChange} />
      <RentalDates customer={customer} onChange={onChange} />
    </>
  );
}