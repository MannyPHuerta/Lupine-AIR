import { useBranches } from '@/hooks/useBranches';

/**
 * Reusable branch filter dropdown for reporting/list pages.
 * Uses LOCAL state (not the global WorkingBranch) — defaults to "All Branches".
 *
 * Props:
 *   value     — current branch filter value ('all' or branch name)
 *   onChange  — callback(branch)
 *   className — extra classes for the <select>
 *   allLabel  — label for the "all" option (default: 'All Branches')
 *   dark      — if true, styles for dark header backgrounds
 */
export default function BranchFilterSelect({ value, onChange, className = '', allLabel = 'All Branches', dark = false }) {
  const { branches } = useBranches();

  const baseClasses = dark
    ? 'border border-white/30 bg-white/10 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/30'
    : 'border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none';

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${baseClasses} ${className}`}
    >
      <option value="all">{allLabel}</option>
      {branches.map(b => <option key={b} value={b}>{b}</option>)}
    </select>
  );
}
