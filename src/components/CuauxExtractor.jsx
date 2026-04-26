import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Download } from 'lucide-react';

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

export default function CuauxExtractor() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [names, setNames] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setNames([]); setError(null); setProgress(''); }
  };

  const extract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setNames([]);

    const allNames = new Set();
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

      const response = await base44.functions.invoke('extractCuauxCatalog', {
        chunk: base64Chunk,
        chunkByteOffset: start,
      });

      if (response.data?.names) {
        for (const n of response.data.names) allNames.add(n);
      }
    }

    const sorted = Array.from(allNames).sort();
    setNames(sorted);
    setProgress(`Done — ${sorted.length} unique equipment names extracted.`);
    setLoading(false);
  };

  // Post-process: remove junk entries from the final list
  const cleanFinalList = (rawNames) => {
    const REJECT_STARTS = [
      'X', // truncated prefix entries like XCHAIR, XLOADER, XHAIR
    ];
    const REJECT_PREFIXES = [
      'EWER ', 'PPER ', 'FFICE ', 'WCOMPT', 'NAT CREEK', 'MID WAY WELD', 'DBA HAT',
      'TEX AIR ', 'BORDER AIR ', 'ALTAIR', 'PLEDGER', 'BERCLAIR',
    ];
    const REJECT_CONTAINS = [
      'STOLE', 'GOOD CUSTOMER', 'TRACKING ACCT', 'STORE CREDIT', 'GIVING CUSTOMER',
      'BOUGHT', 'SEEMS SHAKY', 'ON 185 CAUSING', 'INVOLVED IN BACKHOE',
      'CUSTOMER BUSTED', 'CUSTOMER DAMAGED', 'DID SAME THING',
      'FOR DEPOSIT', 'REF LIGHT TOWER CONTRACT', 'TRACKING ACCT',
      'QONEED', 'HE DID USE', 'ALL LIGHT TOWERS 50',
      'COMPTROLLER', 'CONTROLLER', 'ACCOUNTANT', 'THEY BUY OUR',
      'DEPOSIT TO HOLD', 'SERVICE, GENERATOR', 'BOUGHT 8-ROLLER',
    ];
    // Reject entries that are clearly truncated (no closing paren when opened, or end mid-word)
    const hasUnclosedParen = (s) => {
      const opens = (s.match(/\(/g) || []).length;
      const closes = (s.match(/\)/g) || []).length;
      return opens > closes;
    };

    return rawNames.filter(name => {
      // Single-letter prefix junk (XCHAIR etc.)
      if (/^X[A-Z]/.test(name) && name.length > 2 && !'XCAVATOR'.includes(name.slice(0, 5))) return false;

      // Reject by known junk prefixes
      if (REJECT_PREFIXES.some(p => name.startsWith(p))) return false;

      // Reject by contained phrases
      if (REJECT_CONTAINS.some(p => name.includes(p))) return false;

      // Reject truncated (unclosed parens only for short entries)
      if (hasUnclosedParen(name) && name.length < 30) return false;

      // Reject obviously truncated — ends in a space then a single char other than valid abbreviations
      if (/\s[A-Z]$/.test(name) && !/(HP|HP|CF|KW|KV|LB|FT|IN)$/.test(name)) return false;

      return true;
    });
  };

  const exportCSV = () => {
    const cleanedNames = cleanFinalList(names);
    const csv = ['EquipmentName', ...cleanedNames]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cuaux_equipment_catalog.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Scans the entire <code className="bg-gray-100 px-1 rounded">cuaux</code> binary file and extracts all unique equipment names for a complete catalog export.
      </p>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-gray-900">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <p className="text-sm text-gray-500">Upload the cuaux binary file</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          className="bg-orange-600 hover:bg-orange-700 gap-2"
          onClick={extract}
          disabled={!file || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Extracting…' : 'Extract Equipment Catalog'}
        </Button>
        {names.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={exportCSV}>
            <Download className="w-4 h-4" /> Export CSV ({cleanFinalList(names).length} names)
          </Button>
        )}
      </div>

      {progress && <p className="text-sm text-gray-600 font-medium">{progress}</p>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {names.length > 0 && (() => {
        const cleaned = cleanFinalList(names);
        return (
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-gray-50 border-b px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Preview — first 100 of {cleaned.length} names
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {cleaned.slice(0, 100).map((name, i) => (
                <div key={i} className="px-3 py-1.5 text-sm font-mono text-gray-800">{name}</div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}