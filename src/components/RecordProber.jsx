import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB — search first chunk only for probe

export default function RecordProber() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('COUNTRY INN MCALLEN');
  const [recordSize, setRecordSize] = useState(552);
  const [alignmentOffset, setAlignmentOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [chunkIndex, setChunkIndex] = useState(0);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
      setChunkIndex(0);
    }
  };

  const probe = async (cIdx = chunkIndex) => {
    if (!file || !searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const start = cIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const arrayBuffer = await file.slice(start, end).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let binaryString = '';
      for (let j = 0; j < uint8Array.length; j++) {
        binaryString += String.fromCharCode(uint8Array[j]);
      }
      const base64Chunk = btoa(binaryString);

      const response = await base44.functions.invoke('probeRecordLayout', {
        chunk: base64Chunk,
        searchTerm: searchTerm.trim(),
        recordSize: Number(recordSize),
        alignmentOffset: Number(alignmentOffset),
      });

      const data = response.data;
      if (!data.found) {
        setError(`Not found in chunk ${cIdx + 1}. Try next chunk or different search term.`);
      } else {
        setResult({ ...data, chunkIndex: cIdx });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalChunks = file ? Math.ceil(file.size / CHUNK_SIZE) : 0;

  return (
    <div className="space-y-4">
      {/* File picker */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-gray-900">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <p className="text-sm text-gray-500">Select CPro binary FILE</p>
        )}
      </div>

      {/* Search controls */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-gray-500 mb-1 block">Known name to search for</label>
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="e.g. COUNTRY INN MCALLEN"
          />
        </div>
        <div className="w-28">
          <label className="text-xs text-gray-500 mb-1 block">Record size (bytes)</label>
          <Input
            type="number"
            value={recordSize}
            onChange={e => setRecordSize(e.target.value)}
          />
        </div>
        <div className="w-28">
          <label className="text-xs text-gray-500 mb-1 block">Alignment offset</label>
          <Input
            type="number"
            value={alignmentOffset}
            onChange={e => setAlignmentOffset(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Chunk navigation */}
      {file && totalChunks > 1 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Chunk:</span>
          {Array.from({ length: Math.min(totalChunks, 8) }, (_, i) => (
            <button
              key={i}
              onClick={() => setChunkIndex(i)}
              className={`px-2 py-0.5 rounded text-xs border ${chunkIndex === i ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
            >
              {i + 1}
            </button>
          ))}
          {totalChunks > 8 && <span className="text-gray-400">...{totalChunks} total</span>}
        </div>
      )}

      <Button
        className="bg-blue-600 hover:bg-blue-700 gap-2 w-full"
        onClick={() => probe(chunkIndex)}
        disabled={!file || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {loading ? 'Scanning...' : 'Probe Record Layout'}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            Found <strong>{result.hits}</strong> hit(s) for "{result.searchTerm}" in chunk {result.chunkIndex + 1}
          </div>

          {result.records.map((rec, ri) => (
            <div key={ri} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 border-b">
                Hit {ri + 1} — Record starts at byte <code className="bg-gray-200 px-1 rounded">{rec.recordStart}</code>, hit at <code className="bg-gray-200 px-1 rounded">{rec.hitOffset}</code>
              </div>

              {/* Extracted text fields */}
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Text fields found in this record</h4>
                <div className="space-y-1">
                  {rec.fields.map((f, fi) => (
                    <div key={fi} className="flex gap-3 text-xs font-mono">
                      <span className="w-16 text-gray-400 flex-shrink-0">+{f.offset}</span>
                      <span className="w-10 text-gray-400 flex-shrink-0">[{f.length}]</span>
                      <span className="text-gray-900 break-all">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hex dump */}
              <details className="border-t">
                <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50">Raw hex dump</summary>
                <div className="p-4 overflow-x-auto bg-gray-950 text-green-400 font-mono text-xs">
                  {rec.dump.map((row, di) => (
                    <div key={di} className="flex gap-4">
                      <span className="text-gray-500 w-10">{row.offset.toString(16).padStart(4, '0')}</span>
                      <span className="flex-1">{row.hex}</span>
                      <span className="text-green-300">{row.ascii}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}