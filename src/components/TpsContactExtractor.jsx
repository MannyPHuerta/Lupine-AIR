import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export default function TpsContactExtractor({ onComplete }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ chunkIndex: 0, totalChunks: 0, totalInserted: 0, totalFound: 0 });
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const { toast } = useToast();
  const sessionIdRef = useRef(`tps_${Date.now()}`);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setFinished(false);
    setProgress({ chunkIndex: 0, totalChunks: 0, totalInserted: 0, totalFound: 0 });

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setProgress(p => ({ ...p, totalChunks }));

    let totalInserted = 0;
    let totalFound = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const arrayBuffer = await file.slice(start, end).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let binaryString = '';
      for (let j = 0; j < uint8Array.length; j++) {
        binaryString += String.fromCharCode(uint8Array[j]);
      }
      const base64Chunk = btoa(binaryString);

      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await base44.functions.invoke('extractTpsContacts', {
            chunk: base64Chunk,
            chunkIndex: i,
            totalChunks,
            sessionId: sessionIdRef.current,
          });
          if (response.data.success) break;
        } catch {
          if (attempt === 2) throw new Error(`Chunk ${i} failed after 3 attempts`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
      }

      if (!response.data.success) {
        setError(response.data.error || 'Unknown error');
        setLoading(false);
        return;
      }

      totalInserted += response.data.insertedCount;
      totalFound += response.data.contactsFound;
      setProgress({ chunkIndex: i + 1, totalChunks, totalInserted, totalFound });

      await new Promise(r => setTimeout(r, 400));
    }

    setFinished(true);
    setLoading(false);
    toast({ title: `✓ Extracted ${totalInserted} contacts`, className: 'bg-green-600 text-white' });
    if (onComplete) onComplete({ sessionId: sessionIdRef.current, totalInserted });
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const pct = progress.totalChunks > 0 ? Math.round((progress.chunkIndex / progress.totalChunks) * 100) : 0;

  if (finished) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Extraction complete</p>
            <p className="text-sm text-green-700">{progress.totalInserted} contacts saved ({progress.totalFound} patterns detected)</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => {
          setFinished(false);
          sessionIdRef.current = `tps_${Date.now()}`;
          setProgress({ chunkIndex: 0, totalChunks: 0, totalInserted: 0, totalFound: 0 });
        }}>
          Extract Another File
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Extraction failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { setError(null); inputRef.current?.click(); }}>Try Again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Chunk {progress.chunkIndex} / {progress.totalChunks} ({pct}%)</p>
            <p className="text-sm text-gray-500">{progress.totalInserted} contacts saved</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress.totalFound} contact patterns detected so far</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Scanning binary for names & phone numbers...
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" onChange={handleChange} className="hidden" />
      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
      <p className="font-semibold text-gray-900 mb-1">Select CPro FILE</p>
      <p className="text-sm text-gray-500 mb-3">Scans binary for names &amp; phone patterns</p>
      <Button variant="outline" size="sm">Choose File</Button>
    </div>
  );
}