import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

export default function InvImporter({ onComplete }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(null); }
  };

  const importCSV = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress('Uploading CSV...');

    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const csvFileUrl = uploadRes.file_url;
      
      setProgress('Importing records...');
      const sessionId = `inv_import_${Date.now()}`;
      
      const importRes = await base44.functions.invoke('importInvRecords', {
        csvFileUrl,
        sessionId
      });

      if (importRes.data.success) {
        setProgress(`Done — ${importRes.data.imported} records imported.`);
        onComplete?.({
          imported: importRes.data.imported,
          errors: importRes.data.errors,
          sessionId
        });
      } else {
        setError('Import failed');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-500">Upload the exported inv_records.csv file</p>
        )}
      </div>

      <Button
        className="bg-green-600 hover:bg-green-700 w-full gap-2"
        onClick={importCSV}
        disabled={!file || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Importing...' : 'Import Records'}
      </Button>

      {progress && <p className="text-sm text-gray-600 font-medium">{progress}</p>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
    </div>
  );
}