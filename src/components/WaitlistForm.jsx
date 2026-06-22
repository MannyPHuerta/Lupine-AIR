// src/components/WaitlistForm.jsx
import { useState } from 'react';

const INITIAL = {
  full_name: '',
  email: '',
  phone: '',
  company: '',
  role: '',
  branch_count: '',
  message: '',
};

export default function WaitlistForm() {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      setStatus({ state: 'error', message: 'Name and email are required.' });
      return;
    }
    setStatus({ state: 'submitting', message: '' });

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          role: form.role.trim(),
          branch_count: form.branch_count ? Number(form.branch_count) : null,
          message: form.message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setStatus({
          state: 'error',
          message: data?.error
            ? typeof data.error === 'string'
              ? data.error
              : 'Something went wrong. Please try again.'
            : 'Something went wrong. Please try again.',
        });
        return;
      }

      setStatus({
        state: 'success',
        message:
          data.message ||
          (data.duplicate
            ? "You're already on the AIR early access list. We've re-sent your confirmation."
            : "Thanks — you're on the AIR early access list."),
      });
      if (!data.duplicate) setForm(INITIAL);
    } catch (err) {
      setStatus({
        state: 'error',
        message: 'Network error. Please try again.',
      });
    }
  };

  const disabled = status.state === 'submitting';

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Full name *</span>
          <input
            name="full_name"
            value={form.full_name}
            onChange={onChange}
            required
            autoComplete="name"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Work email *</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Phone</span>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            autoComplete="tel"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Company</span>
          <input
            name="company"
            value={form.company}
            onChange={onChange}
            autoComplete="organization"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Your role</span>
          <input
            name="role"
            value={form.role}
            onChange={onChange}
            placeholder="Owner, Manager, etc."
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-200"># of branches</span>
          <input
            type="number"
            min="0"
            name="branch_count"
            value={form.branch_count}
            onChange={onChange}
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-200">Anything else?</span>
        <textarea
          name="message"
          value={form.message}
          onChange={onChange}
          rows={3}
          className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
        />
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5"
      >
        {disabled ? 'Submitting…' : 'Request early access'}
      </button>

      {status.state === 'success' && (
        <p className="text-sm text-emerald-400" role="status">{status.message}</p>
      )}
      {status.state === 'error' && (
        <p className="text-sm text-red-400" role="alert">{status.message}</p>
      )}
    </form>
  );
}
