import { AlertCircle } from 'lucide-react';
import { useWorkingBranch } from '@/lib/WorkingBranchContext';

export default function BranchMismatchBadge({ userHomeBranch }) {
  const { workingBranch } = useWorkingBranch();

  if (!userHomeBranch || !workingBranch || userHomeBranch === workingBranch) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg text-xs font-medium text-amber-800">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>Working at <strong>{workingBranch}</strong> (home: {userHomeBranch})</span>
    </div>
  );
}