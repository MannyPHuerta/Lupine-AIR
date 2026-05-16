import { createContext, useContext, useState, useEffect } from 'react';

const WorkingBranchContext = createContext();

export function WorkingBranchProvider({ children }) {
  const [workingBranch, setWorkingBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('workingBranch');
    setWorkingBranch(stored);
    setLoading(false);
  }, []);

  const updateWorkingBranch = (branch) => {
    localStorage.setItem('workingBranch', branch);
    setWorkingBranch(branch);
  };

  const clearWorkingBranch = () => {
    localStorage.removeItem('workingBranch');
    setWorkingBranch(null);
  };

  return (
    <WorkingBranchContext.Provider value={{ workingBranch, updateWorkingBranch, clearWorkingBranch, loading }}>
      {children}
    </WorkingBranchContext.Provider>
  );
}

export function useWorkingBranch() {
  const context = useContext(WorkingBranchContext);
  if (!context) {
    throw new Error('useWorkingBranch must be used within WorkingBranchProvider');
  }
  return context;
}