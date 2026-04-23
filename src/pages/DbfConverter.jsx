import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import DbfUploader from '@/components/DbfUploader';
import DbfFieldMapper from '@/components/DbfFieldMapper';

export default function DbfConverter() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (file) => {
    setUploading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setParsing(true);
      const result = await base44.functions.invoke('parseDbf', { fileUrl: file_url });
      
      if (result.success) {
        setParseResult(result);
      } else {
        setError(result.error || 'Failed to parse DBF');
      }
    } catch (err) {
      setError(err.message || 'Upload or parse failed');
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white shadow-md sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-2 py-2 flex items-center gap-3">
          <button 
            className="text-white p-3 rounded-lg hover:bg-blue-600 active:bg-blue-500 flex items-center gap-1"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-xl font-bold">DBF Converter</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Upload Section */}
        {!parseResult && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import CPro Database</h2>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}
            <DbfUploader 
              onSelect={handleFileSelect} 
              loading={uploading || parsing}
            />
            {(uploading || parsing) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploading ? 'Uploading...' : 'Parsing DBF...'}
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {parseResult && (
          <>
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Schema Detected</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setParseResult(null);
                    setError(null);
                  }}
                >
                  Import Another
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{parseResult.recordCount}</div>
                  <div className="text-xs text-gray-600">Records</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{parseResult.fieldCount}</div>
                  <div className="text-xs text-gray-600">Fields</div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Field Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.fields.map((field, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-900">{field.name}</td>
                        <td className="px-3 py-2 text-gray-600">{field.type}</td>
                        <td className="px-3 py-2 text-gray-600">{field.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Field Mapper */}
            <DbfFieldMapper 
              fields={parseResult.fields}
              sampleRecords={parseResult.sampleRecords}
            />
          </>
        )}
      </div>
    </div>
  );
}