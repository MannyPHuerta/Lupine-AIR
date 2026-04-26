import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Download } from 'lucide-react';

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

export default function InvOffsetExtractor() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResults([]); setError(null); setProgress(''); }
  };

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults([]);

    // 1. Load all inventory items from DB (they have byteOffset stored)
    setProgress('Loading offsets from database...');
    const allItems = await base44.entities.InventoryItem.list('byteOffset', 10000);
    if (!allItems || allItems.length === 0) {
      setError('No InventoryItem records found in database. Import the index first.');
      setLoading(false);
      return;
    }

    // Sort by byteOffset ascending
    const sorted = [...allItems].sort((a, b) => a.byteOffset - b.byteOffset);
    const offsets = sorted.map(item => ({
      id: item.id,
      recordIndex: item.recordIndex,
      byteOffset: item.byteOffset,
    }));

    setProgress(`Loaded ${offsets.length} offsets. Scanning file...`);

    const allResults = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let ci = 0; ci < totalChunks; ci++) {
      setProgress(`Scanning chunk ${ci + 1} / ${totalChunks}…`);
      const start = ci * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const arrayBuffer = await file.slice(start, end).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let binaryString = '';
      for (let j = 0; j < uint8Array.length; j++) {
        binaryString += String.fromCharCode(uint8Array[j]);
      }
      const base64Chunk = btoa(binaryString);

      const response = await base44.functions.invoke('extractInvByOffsets', {
        chunk: base64Chunk,
        chunkByteOffset: start,
        offsets,
      });

      if (response.data?.results) {
        allResults.push(...response.data.results);
      }
    }

    setResults(allResults);
    setProgress(`Done — ${allResults.length} records with content found.`);
    setLoading(false);
  };

  const updateDatabase = async () => {
    setLoading(true);
    setProgress('Updating database records...');
    let updated = 0;
    for (const rec of results) {
      await base44.entities.InventoryItem.update(rec.id, {
        rawFields: rec.rawFields,
        description1: rec.description1,
        description2: rec.description2,
      });
      updated++;
      if (updated % 20 === 0) setProgress(`Updated ${updated} / ${results.length}...`);
    }
    setProgress(`Done! ${updated} records updated in database.`);
    setLoading(false);
  };

  const exportCSV = () => {
    const maxFields = Math.max(...results.map(r => r.rawFields?.length || 0), 0);
    const headers = ['RecordIndex', 'ByteOffset', 'Description1', 'Description2', ...Array.from({ length: maxFields }, (_, i) => `F${i + 1}`)];
    const rows = results.map(r => [
      r.recordIndex, r.byteOffset, r.description1, r.description2,
      ...Array.from({ length: maxFields }, (_, i) => r.rawFields?.[i] ?? ''),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inv_extracted.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Upload the <code className="bg-gray-100 px-1 rounded">inv</code> binary file. This tool reads each record using the byte offsets already stored in the database, then extracts the equipment text.
      </p>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-gray-900">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <p className="text-sm text-gray-500">Upload the inv binary file</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          className="bg-green-600 hover:bg-green-700 gap-2"
          onClick={run}
          disabled={!file || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Running...' : 'Extract by Stored Offsets'}
        </Button>
        {results.length > 0 && (
          <>
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={updateDatabase}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save to Database ({results.length} records)
            </Button>
          </>
        )}
      </div>

      {progress && <p className="text-sm text-gray-600 font-medium">{progress}</p>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Idx</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Offset</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Fields Preview</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-500">{r.recordIndex}</td>
                  <td className="px-3 py-1.5 text-gray-500">{r.byteOffset}</td>
                  <td className="px-3 py-1.5 text-gray-800 font-mono max-w-xs truncate">
                    {r.rawFields?.slice(0, 5).join(' | ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 50 && (
            <p className="text-xs text-gray-500 px-3 py-2">Showing first 50 of {results.length} records</p>
          )}
        </div>
      )}
    </div>
  );
}