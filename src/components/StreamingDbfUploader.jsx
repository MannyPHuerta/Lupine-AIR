import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks to stay within CPU limits

export default function StreamingDbfUploader({ onComplete }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ chunkIndex: 0, totalChunks: 0, totalInserted: 0 });
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const { toast } = useToast();
  const sessionIdRef = useRef(`session_${Date.now()}`);

  const handleFileSelect = async (file) => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setFinished(false);
    setProgress({ chunkIndex: 0, totalChunks: 0, totalInserted: 0 });

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      setProgress(p => ({ ...p, totalChunks }));

      let fields = null;
      let totalInserted = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const arrayBuffer = await chunkBlob.arrayBuffer();

        // Convert to base64 for transmission
         const uint8Array = new Uint8Array(arrayBuffer);
         let binaryString = '';
         for (let j = 0; j < uint8Array.length; j++) {
           binaryString += String.fromCharCode(uint8Array[j]);
         }
         const base64Chunk = btoa(binaryString);

        // Retry up to 3 times on failure (e.g. rate limit)
        let response;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await base44.functions.invoke('streamParseDbf', {
              chunk: base64Chunk,
              chunkIndex: i,
              totalChunks,
              sessionId: sessionIdRef.current,
              fields,
            });
            if (response.data.success) break;
          } catch {
            if (attempt === 2) throw new Error(`Chunk ${i} failed after 3 attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        }

        if (!response.data.success) {
          throw new Error(`Chunk ${i} failed: ${response.data.error}`);
        }

        // Capture fields from first chunk
        if (i === 0 && response.data.fields) {
          fields = response.data.fields;
        }

        totalInserted += response.data.insertedCount;
        setProgress({
          chunkIndex: i + 1,
          totalChunks,
          totalInserted,
        });

        // Delay between chunks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      setFinished(true);
      toast({
        title: `✓ Import complete: ${totalInserted} records`,
        className: 'bg-green-600 text-white',
      });

      if (onComplete) {
        onComplete({
          sessionId: sessionIdRef.current,
          totalRecords: totalInserted,
          fields,
        });
      }
    } catch (err) {
      const errorMsg = err.message || 'Upload failed';
      setError(errorMsg);
      toast({ title: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Import DBF File (Streaming)</h2>

      {finished ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Import successful</p>
              <p className="text-sm text-green-700">{progress.totalInserted} records imported</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setFinished(false);
              setProgress({ chunkIndex: 0, totalChunks: 0, totalInserted: 0 });
              sessionIdRef.current = `session_${Date.now()}`;
              inputRef.current?.click();
            }}
          >
            Import Another File
          </Button>
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Import failed</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              inputRef.current?.click();
            }}
          >
            Try Again
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Chunk {progress.chunkIndex} of {progress.totalChunks}
              </p>
              <p className="text-sm text-gray-500">{progress.totalInserted} records inserted</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${progress.totalChunks > 0 ? (progress.chunkIndex / progress.totalChunks) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".dbf"
            onChange={handleChange}
            disabled={loading}
            className="hidden"
          />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 mb-1">Select DBF File</p>
          <p className="text-sm text-gray-500 mb-3">Streams large files in 50MB chunks</p>
          <Button variant="outline" size="sm" disabled={loading}>
            Choose File
          </Button>
        </div>
      )}
    </div>
  );
}