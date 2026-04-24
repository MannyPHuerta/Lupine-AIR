import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

export default function CproRecordExtractor() {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ chunk: 0, total: 0, inserted: 0 });
  const sessionId = useRef(`cpro_${Date.now()}`);

  const handleFile = (f) => {
    setFile(f);
    setFinished(false);
    setError(null);
    setProgress({ chunk: 0, total: 0, inserted: 0 });
  };

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setFinished(false);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setProgress({ chunk: 0, total: totalChunks, inserted: 0 });
    let totalInserted = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const ab = await file.slice(start, end).arrayBuffer();
      const u8 = new Uint8Array(ab);
      let bin = '';
      for (let j = 0; j < u8.length; j++) bin += String.fromCharCode(u8[j]);
      const chunk = btoa(bin);

      let res;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await base44.functions.invoke('extractCproRecords', {
            chunk,
            chunkIndex: i,
            totalChunks,
            sessionId: sessionId.current,
          });
          if (res.data.success) break;
        } catch {
          if (attempt === 2) throw new Error(`Chunk ${i + 1} failed after 3 attempts`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
      }

      if (!res?.data?.success) {
        setError(res?.data?.error || 'Unknown error');
        setLoading(false);
        return;
      }

      totalInserted += res.data.insertedCount;
      setProgress({ chunk: i + 1, total: totalChunks, inserted: totalInserted });
      await new Promise(r => setTimeout(r, 300));
    }

    setFinished(true);
    setLoading(false);
    toast({ title: `✓ Extracted ${totalInserted} contacts`, className: 'bg-green-600 text-white' });
  };

  const pct = progress.total > 0 ? Math.round((progress.chunk / progress.total) * 100) : 0;

  if (finished) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Extraction complete</p>
            <p className="text-sm text-green-700">{progress.inserted} contacts saved from {file.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setFinished(false); sessionId.current = `cpro_${Date.now()}`; setFile(null); }}>
            Extract Another File
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/contact-review')}>
            Review Contacts →
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <Button variant="outline" onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">Chunk {progress.chunk} / {progress.total} ({pct}%)</span>
            <span className="text-gray-500">{progress.inserted} contacts saved</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Scanning for contact patterns...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        {file ? (
          <p className="font-semibold text-gray-900">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <>
            <p className="font-semibold text-gray-900 mb-1">Select CPro binary FILE</p>
            <p className="text-sm text-gray-500">Scans entire FILE for contact patterns across all chunks</p>
          </>
        )}
      </div>

      {file && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <p>{(file.size / 1024 / 1024).toFixed(1)} MB → {Math.ceil(file.size / (2 * 1024 * 1024))} chunks × 2MB</p>
        </div>
      )}

      <Button
        className="bg-blue-600 hover:bg-blue-700 w-full"
        onClick={run}
        disabled={!file}
      >
        Extract Contacts
      </Button>
    </div>
  );
}