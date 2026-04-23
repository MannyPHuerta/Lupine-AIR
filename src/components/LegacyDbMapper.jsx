import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ASSET_WOLF_FIELDS = [
  'itemName', 'itemType', 'model', 'serialNumber', 'assetNumber',
  'action', 'branch', 'askingPrice', 'comments', 'sentBy'
];

export default function LegacyDbMapper({ onMappingComplete }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [detectedFields, setDetectedFields] = useState([]);
  const [samples, setSamples] = useState([]);
  const [mapping, setMapping] = useState({});
  const [expandedLegacy, setExpandedLegacy] = useState(new Set());
  const [base64Data, setBase64Data] = useState(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      // Only analyze first 5MB to avoid memory issues
      const chunkSize = 5 * 1024 * 1024;
      const chunk = await file.slice(0, chunkSize).arrayBuffer();
      const uint8Array = new Uint8Array(chunk);
      const binaryString = String.fromCharCode(...uint8Array);
      const base64Chunk = btoa(binaryString);

      const response = await base44.functions.invoke('analyzeDbfFields', {
        base64Data: base64Chunk,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Analysis failed');
      }

      setDetectedFields(response.data.fields || []);
      setSamples(response.data.samples || []);
      setBase64Data(base64Chunk);
      setMapping({});
      toast({
        title: `Detected ${response.data.fields?.length || 0} fields`,
        className: 'bg-blue-600 text-white',
      });
    } catch (err) {
      toast({
        title: 'Analysis failed: ' + err.message,
        variant: 'destructive',
      });
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

  const toggleField = (fieldName) => {
    const updated = new Set(expandedLegacy);
    if (updated.has(fieldName)) {
      updated.delete(fieldName);
    } else {
      updated.add(fieldName);
    }
    setExpandedLegacy(updated);
  };

  const handleMapping = (legacyField, awField) => {
    setMapping(prev => ({
      ...prev,
      [legacyField]: awField,
    }));
  };

  const handleConfirm = async () => {
    if (Object.keys(mapping).length === 0) {
      toast({
        title: 'Map at least one field',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const sessionId = `session_${Date.now()}`;
      const response = await base44.functions.invoke('transformLegacyData', {
        base64Data,
        mapping,
        sessionId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Transform failed');
      }

      toast({
        title: `✓ Imported ${response.data.insertedCount} records`,
        className: 'bg-green-600 text-white',
      });

      if (onMappingComplete) {
        onMappingComplete({
          detectedFields,
          mapping,
          sessionId,
          result: response.data,
        });
      }

      // Reset UI
      setDetectedFields([]);
      setSamples([]);
      setMapping({});
      setBase64Data(null);
    } catch (err) {
      toast({
        title: 'Import failed: ' + err.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Legacy DB Field Mapper</h2>

      {detectedFields.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            onChange={handleChange}
            disabled={loading}
            className="hidden"
          />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 mb-1">Select Legacy DB File</p>
          <p className="text-sm text-gray-500 mb-3">Supports DBF, CSV, binary exports</p>
          <Button variant="outline" size="sm" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Choose File
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">{detectedFields.length} fields detected</p>
              <p className="text-xs text-blue-700 mt-1">Map legacy columns to Asset Wolf schema</p>
            </div>
          </div>

          {/* Field Mapping List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {detectedFields.map((field, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleField(field.startOffset)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="font-mono text-xs font-semibold text-gray-700">
                      Offset {field.startOffset}–{field.endOffset} ({field.size} bytes)
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 truncate">
                      {field.content || '(empty)'}
                    </div>
                  </div>
                  {expandedLegacy.has(field.startOffset) ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                  )}
                </button>

                {expandedLegacy.has(field.startOffset) && (
                  <div className="border-t bg-gray-50 px-3 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Map to Asset Wolf field:</p>
                    <select
                      value={mapping[field.startOffset] || ''}
                      onChange={(e) => handleMapping(field.startOffset, e.target.value)}
                      className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— Skip this field —</option>
                      {ASSET_WOLF_FIELDS.map((awField) => (
                        <option key={awField} value={awField}>
                          {awField}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-2">Mapping Summary</p>
            <div className="space-y-1">
              {Object.entries(mapping).map(([legacyOffset, awField]) => (
                <div key={legacyOffset} className="text-xs text-gray-600">
                  Offset {legacyOffset} → <span className="font-semibold text-blue-700">{awField}</span>
                </div>
              ))}
            </div>
            {Object.keys(mapping).length === 0 && (
              <p className="text-xs text-gray-500 italic">No fields mapped yet</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDetectedFields([]);
                setSamples([]);
                setMapping({});
                setExpandedLegacy(new Set());
              }}
            >
              Upload Different File
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={Object.keys(mapping).length === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Confirm & Import'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}