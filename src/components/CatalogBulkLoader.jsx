import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';

export default function CatalogBulkLoader({ onComplete }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setProgress(''); }
  };

  const importCatalog = async () => {
    if (!file) return;
    setLoading(true);
    setProgress('Reading CSV...');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const names = lines.slice(1).map(line => line.replace(/^"|"$/g, '').trim()).filter(n => n);

      setProgress(`Importing ${names.length} equipment names...`);
      
      const res = await base44.functions.invoke('bulkImportCatalog', { names });
      
      setResult(res.data);
      setProgress(`✅ Done — ${res.data.imported} records imported`);
      if (onComplete) onComplete(res.data);
    } catch (error) {
      setProgress(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Upload the cleaned cuaux equipment catalog CSV to populate the entire catalog.</p>

      <div
        className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" accept=".csv" />
        <Upload className="w-8 h-8 text-green-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-500">Upload CSV file</p>
        )}
      </div>

      <Button
        className="bg-green-600 hover:bg-green-700 gap-2 w-full"
        onClick={importCatalog}
        disabled={!file || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {loading ? 'Importing…' : 'Import Catalog'}
      </Button>

      {progress && <p className="text-sm text-gray-600 font-medium">{progress}</p>}
      {result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ Successfully imported {result.imported} equipment records.
        </div>
      )}
    </div>
  );
}