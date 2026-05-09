import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const CHUNK_SIZE = 5 * 1024 * 1024;  // 5MB chunks

export default function CustomerFixedWidthExtractor({ onComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const sessionIdRef = useRef(`cu_${Date.now()}`);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setProgress(0);
    setStatus('Starting extraction...');
    setError('');

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let totalRecords = 0;
      let totalInserted = 0;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const arrayBuffer = await chunkBlob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        let binaryString = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8.length; i += chunkSize) {
          binaryString += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
        }
        const base64Chunk = btoa(binaryString);

        const data = await base44.functions.invoke('extractCustomersByRecordSize', {
          chunk: base64Chunk,
          chunkIndex,
          totalChunks,
          sessionId: sessionIdRef.current,
        });
        totalRecords += data.recordsExtracted || 0;
        totalInserted += data.insertedCount || 0;

        const pct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setProgress(pct);
        setStatus(`Chunk ${chunkIndex + 1}/${totalChunks} — ${totalInserted} customers inserted so far...`);

        if (data.isLastChunk) break;
      }

      setResult({ totalRecords, totalInserted, sessionId: sessionIdRef.current });
      setStatus('✓ Extraction complete!');
      if (onComplete) onComplete({ totalRecords, totalInserted });
    } catch (err) {
      setError(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer"
        onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Drop customer file here or click to select</p>
        <p className="text-sm text-gray-500 mt-1">Fixed-width CPro customer file (cu, cu.dat, etc.)</p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".dat,.tps,.bin,*"
        />
      </div>

      {file && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900 font-medium">📁 {file.name}</p>
          <p className="text-xs text-blue-700 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-sm text-gray-700 font-medium">{status}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-500 text-right">{progress}%</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-800 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Extraction Complete
          </div>
          <p className="text-sm text-green-700">✓ <strong>{result.totalInserted}</strong> customers imported</p>
          <p className="text-xs text-green-600">Session: {result.sessionId}</p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? 'Extracting...' : 'Extract Customers'}
      </Button>
    </div>
  );
}