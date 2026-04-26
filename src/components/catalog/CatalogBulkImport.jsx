import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function CatalogBulkImport({ onComplete }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const importCatalog = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const names = lines.slice(1).map(line => line.replace(/^"|"$/g, '').trim()).filter(n => n);

      await base44.functions.invoke('bulkImportCatalog', { names });
      
      setOpen(false);
      setFile(null);
      onComplete();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Upload className="w-4 h-4" />
          Import Full Catalog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Equipment Catalog</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <p className="text-sm text-gray-600">Upload the CSV file with all equipment names (1,117+ items).</p>

          <div
            className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" accept=".csv" />
            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            {file ? (
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Click to select CSV file</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFile(null); setOpen(false); }} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
              onClick={importCatalog}
              disabled={!file || loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}