import { useState, useEffect } from 'react';
import { useWorkingBranch } from '@/lib/WorkingBranchContext';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function WorkingBranchModal({ user, onClose }) {
  const { updateWorkingBranch } = useWorkingBranch();
  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState(user?.homeBranch || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BranchSettings.list('branch', 100).then(settings => {
      const names = settings.map(s => s.branch).filter(Boolean).sort();
      setBranches(names);

      // If only 1 branch, auto-select and close silently
      if (names.length === 1) {
        updateWorkingBranch(names[0]);
        onClose();
        return;
      }

      // Default selection: home branch if available and in list, else first
      if (user?.homeBranch && names.includes(user.homeBranch)) {
        setSelected(user.homeBranch);
      } else if (names.length > 0) {
        setSelected(names[0]);
      }

      setLoading(false);
    });
  }, []);

  const handleConfirm = () => {
    if (selected) {
      updateWorkingBranch(selected);
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Which branch are you working at today?</h2>
        <p className="text-sm text-gray-600">
          {user?.homeBranch ? `Your home branch is ${user.homeBranch}. Select your working location:` : 'Select your working branch:'}
        </p>
        <div className="space-y-2">
          {branches.map(branch => (
            <button
              key={branch}
              onClick={() => setSelected(branch)}
              className={`w-full p-3 text-left rounded-lg border-2 transition font-medium ${
                selected === branch
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-indigo-300'
              }`}
            >
              {branch}
            </button>
          ))}
        </div>
        <Button onClick={handleConfirm} disabled={!selected} className="w-full bg-indigo-600 hover:bg-indigo-700">
          Confirm
        </Button>
      </div>
    </div>
  );
}