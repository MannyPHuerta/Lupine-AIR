import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BANK_PRESETS = {
  chase: {
    name: 'Chase',
    dateCol: 'Transaction Date',
    vendorCol: 'Merchant Name',
    amountCol: 'Amount',
    descCol: 'Description',
  },
  bofa: {
    name: 'Bank of America',
    dateCol: 'Posted Date',
    vendorCol: 'Merchant',
    amountCol: 'Amount',
    descCol: 'Memo',
  },
  wellsfargo: {
    name: 'Wells Fargo',
    dateCol: 'Date',
    vendorCol: 'Description',
    amountCol: 'Amount',
    descCol: 'Memo',
  },
  citi: {
    name: 'Citibank',
    dateCol: 'Transaction Date',
    vendorCol: 'Merchant Name',
    amountCol: 'Debit Amount',
    descCol: 'Description',
  },
  amex: {
    name: 'American Express',
    dateCol: 'Date',
    vendorCol: 'Description',
    amountCol: 'Amount',
    descCol: 'Extended Description',
  },
  frost: {
    name: 'Frost Bank of Texas',
    dateCol: 'Tran Date',
    vendorCol: 'Description',
    amountCol: 'Debit/Credit Amount',
    descCol: 'Description',
  },
};

export default function ExpenseBulkImporter({ branch, onClose, onSuccess }) {
  const [step, setStep] = useState('upload'); // upload, select_bank, preview, confirm, done
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [selectedBank, setSelectedBank] = useState('chase');
  const [columnMap, setColumnMap] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    return {
      headers,
      rows: lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      }),
    };
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const { headers, rows: parsedRows } = parseCSV(evt.target.result);
      setFile(f);
      setRows(parsedRows.slice(0, 100)); // Preview limit
      setColumnMap({});
      setStep('select_bank');
    };
    reader.readAsText(f);
  };

  const handleBankSelect = () => {
    const preset = BANK_PRESETS[selectedBank];
    const autoMap = {
      date: preset.dateCol,
      vendor: preset.vendorCol,
      amount: preset.amountCol,
      description: preset.descCol,
    };
    setColumnMap(autoMap);
    setStep('preview');
  };

  const handleCustomMap = (field, colName) => {
    setColumnMap(m => ({ ...m, [field]: colName }));
  };

  const handlePreview = async () => {
    // Check for duplicates
    const allExpenses = await base44.entities.Expense.list('', 1000);
    const dups = [];
    rows.forEach((row, idx) => {
      const rowDate = row[columnMap.date];
      const rowVendor = row[columnMap.vendor];
      const rowAmount = parseFloat(row[columnMap.amount]);
      const match = allExpenses.find(
        e => e.date === rowDate && e.vendor === rowVendor && e.amount === rowAmount
      );
      if (match) dups.push(idx);
    });
    setDuplicates(dups);
    setStep('confirm');
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const toInsert = rows
        .map((row, idx) => {
          if (duplicates.includes(idx)) return null;
          return {
            date: row[columnMap.date],
            vendor: row[columnMap.vendor],
            amount: parseFloat(row[columnMap.amount]),
            description: row[columnMap.description] || '',
            branch,
            category: 'Other',
            paymentMethod: '',
          };
        })
        .filter(Boolean);

      if (toInsert.length > 0) {
        await base44.entities.Expense.bulkCreate(toInsert);
      }
      setImportedCount(toInsert.length);
      setStep('done');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const preset = BANK_PRESETS[selectedBank];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Upload */}
        {step === 'upload' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Bulk Import Expenses</h2>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:bg-gray-50">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="font-medium text-gray-700">Upload CSV</span>
              <span className="text-xs text-gray-500 mt-1">Chase, Bank of America, Wells Fargo, Citi, Amex, or Frost</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Select Bank */}
        {step === 'select_bank' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Which bank is this from?</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BANK_PRESETS).map(([key, bank]) => (
                <button
                  key={key}
                  onClick={() => setSelectedBank(key)}
                  className={`p-3 border rounded-lg text-sm font-medium transition ${
                    selectedBank === key
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {bank.name}
                </button>
              ))}
              <button
                onClick={() => setSelectedBank('custom')}
                className={`p-3 border rounded-lg text-sm font-medium transition ${
                  selectedBank === 'custom'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Custom / Other
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleBankSelect} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Preview / Map Columns */}
        {step === 'preview' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Map Columns</h2>
            <div className="grid grid-cols-2 gap-3">
              {['date', 'vendor', 'amount', 'description'].map(field => (
                <div key={field}>
                  <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <select
                    value={columnMap[field] || ''}
                    onChange={e => handleCustomMap(field, e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  >
                    <option value="">— Select —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500">Found {rows.length} rows in CSV</div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('select_bank')}>Back</Button>
              <Button onClick={handlePreview} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Preview & Check Duplicates
              </Button>
            </div>
          </div>
        )}

        {/* Confirm */}
        {step === 'confirm' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Review Import</h2>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded-lg">
              {rows.length - duplicates.length} new expenses, {duplicates.length} possible duplicates (will skip)
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('preview')} disabled={importing}>Back</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {importing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Importing...</> : `Import ${rows.length - duplicates.length} Expenses`}
              </Button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="font-bold text-gray-900">Success!</h3>
              <p className="text-xs text-gray-500">{importedCount} expenses imported</p>
            </div>
          </div>
        )}

        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}