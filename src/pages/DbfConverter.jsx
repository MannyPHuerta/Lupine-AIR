import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreamingDbfUploader from '@/components/StreamingDbfUploader';

export default function DbfConverter() {
  const navigate = useNavigate();
  const [importComplete, setImportComplete] = useState(null);

  const handleImportComplete = (result) => {
    setImportComplete(result);
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
        {/* Streaming Uploader */}
        <StreamingDbfUploader onComplete={handleImportComplete} />

        {/* Results Section */}
        {importComplete && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Summary</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{importComplete.totalRecords}</div>
                <div className="text-sm text-gray-600">Records Imported</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{importComplete.fields?.length || 0}</div>
                <div className="text-sm text-gray-600">Fields Detected</div>
              </div>
            </div>

            {importComplete.fields && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Field Summary</h3>
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
                      {importComplete.fields.map((field, i) => (
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
            )}

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setImportComplete(null)}
              >
                Import Another File
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}