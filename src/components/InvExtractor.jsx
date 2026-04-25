import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 4 * 1024 * 1024;

export default function InvExtractor() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [headerSize, setHeaderSize] = useState(984);
  const [startOffset, setStartOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setRecords([]); setError(null); }
  };

  const extract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setRecords([]);

    const allRecords = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let ci = 0; ci < totalChunks; ci++) {
      setProgress(`Processing chunk ${ci + 1} of ${totalChunks}…`);
      const start = ci * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const arrayBuffer = await file.slice(start, end).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let binaryString = '';
      for (let j = 0; j < uint8Array.length; j++) {
        binaryString += String.fromCharCode(uint8Array[j]);
      }
      const base64Chunk = btoa(binaryString);

      const response = await base44.functions.invoke('extractInvRecords', {
        chunk: base64Chunk,
        chunkByteOffset: start,
        headerSize: Number(headerSize),
        startOffset: Number(startOffset),
        maxRecords: 10000,
      });

      if (response.data?.records) {
        allRecords.push(...response.data.records);
      }
    }

    const seen = new Set();
    const deduped = allRecords.filter(r => {
      if (seen.has(r.byteOffset)) return false;
      seen.add(r.byteOffset);
      return true;
    });

    setRecords(deduped);
    setProgress(`Done — ${deduped.length} records extracted.`);
    setLoading(false);
  };

  const exportCSV = () => {
    const maxFields = Math.max(...records.map(r => r.rawFields?.length || 0), 0);
    const headers = ['RecordIndex', 'ByteOffset', ...Array.from({ length: maxFields }, (_, i) => `F${i + 1}_offset`), ...Array.from({ length: maxFields }, (_, i) => `F${i + 1}_value`)];
    const rows = records.map(r => {
      const offsets = Array.from({ length: maxFields }, (_, i) => r.rawFields?.[i]?.offset ?? '');
      const values = Array.from({ length: maxFields }, (_, i) => r.rawFields?.[i]?.value ?? '');
      return [r.recordIndex, r.byteOffset, ...offsets, ...values];
    });
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inv_records.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-gray-900">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <p className="text-sm text-gray-500">Upload the inv file</p>
        )}
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="w-40">
          <label className="text-xs text-gray-500 mb-1 block">Header size (bytes)</label>
          <Input
            type="number"
            value={headerSize}
            onChange={e => setHeaderSize(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="w-48">
          <label className="text-xs text-gray-500 mb-1 block">Start byte offset</label>
          <Input
            type="number"
            value={startOffset}
            onChange={e => setStartOffset(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={extract}
          disabled={!file || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Extracting…' : 'Extract All Records'}
        </Button>
        {records.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={exportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        )}
      </div>

      {progress && (
        <p className="text-sm text-gray-600 font-medium">{progress}</p>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {records.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {records.length} records extracted
          </p>
        </div>
      )}
    </div>
  );
}