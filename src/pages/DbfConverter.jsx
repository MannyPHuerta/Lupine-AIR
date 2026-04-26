import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreamingDbfUploader from '@/components/StreamingDbfUploader';
import TpsContactExtractor from '@/components/TpsContactExtractor';
import RecordProber from '@/components/RecordProber';
import CproRecordExtractor from '@/components/CproRecordExtractor';
import InvExtractor from '@/components/InvExtractor';
import InvImporter from '@/components/InvImporter';
import InvOffsetExtractor from '@/components/InvOffsetExtractor';
import CuauxExtractor from '@/components/CuauxExtractor';
import CatalogBulkLoader from '@/components/CatalogBulkLoader';

export default function DbfConverter() {
  const navigate = useNavigate();
  const [importComplete, setImportComplete] = useState(null);
  const [activeTab, setActiveTab] = useState('tps');

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
          <span className="text-xl font-bold">Legacy Data Converter</span>
          <button
            className="ml-auto text-white text-sm underline pr-2"
            onClick={() => navigate('/contact-review')}
          >
            Review Contacts →
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Tab selector */}
        <div className="flex gap-2 bg-white border rounded-lg p-1 shadow-sm flex-wrap">
          <button
            onClick={() => setActiveTab('tps')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'tps' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            CPro / TPS
          </button>
          <button
            onClick={() => setActiveTab('dbf')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'dbf' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            DBF Importer
          </button>
          <button
            onClick={() => setActiveTab('probe')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'probe' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Prober
          </button>
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'extract' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            CPro
          </button>
          <button
            onClick={() => setActiveTab('inv')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'inv' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            inv Extract
          </button>
          <button
            onClick={() => setActiveTab('inv-import')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'inv-import' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            inv Import
          </button>
          <button
            onClick={() => setActiveTab('inv-offset')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'inv-offset' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            inv Offset
          </button>
          <button
            onClick={() => setActiveTab('cuaux')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'cuaux' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            cuaux
          </button>
          <button
            onClick={() => setActiveTab('bulk-import')}
            className={`flex-1 min-w-max py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'bulk-import' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Bulk Load
          </button>
        </div>

        {activeTab === 'tps' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">CPro Contact Extractor</h2>
            <p className="text-sm text-gray-500 mb-4">Scans the binary FILE for ALL-CAPS names and phone number patterns and saves them as contacts.</p>
            <TpsContactExtractor onComplete={handleImportComplete} />
          </div>
        ) : activeTab === 'dbf' ? (
          <StreamingDbfUploader onComplete={handleImportComplete} />
        ) : activeTab === 'probe' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Record Layout Prober</h2>
            <p className="text-sm text-gray-500 mb-4">Upload the binary FILE, search for a known name, and see the exact byte offsets of every field in that record.</p>
            <RecordProber />
          </div>
        ) : activeTab === 'extract' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">CPro Record Extractor</h2>
            <p className="text-sm text-gray-500 mb-4">Extracts contacts using the mapped 552-byte record layout (name, phone, address, city/state/zip, account#).</p>
            <CproRecordExtractor />
          </div>
        ) : activeTab === 'inv' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Inventory (inv) Extractor</h2>
            <p className="text-sm text-gray-500 mb-4">Reads all 1356-byte records from the <code className="bg-gray-100 px-1 rounded">inv</code> file and extracts equipment descriptions, codes, and notes. Export as CSV to review.</p>
            <InvExtractor />
          </div>
        ) : activeTab === 'inv-import' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Inventory (inv) Importer</h2>
            <p className="text-sm text-gray-500 mb-4">Upload the exported <code className="bg-gray-100 px-1 rounded">inv_records.csv</code> to import equipment records into the database with smart field detection.</p>
            <InvImporter onComplete={handleImportComplete} />
          </div>
        ) : activeTab === 'inv-offset' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">inv Extractor by Stored Offsets</h2>
            <p className="text-sm text-gray-500 mb-4">Uses the byte offsets already in the database to extract the exact content of each record — no fixed record size guessing.</p>
            <InvOffsetExtractor />
          </div>
        ) : activeTab === 'bulk-import' ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Bulk Load Catalog</h2>
            <p className="text-sm text-gray-500 mb-4">Upload the cleaned CSV file to populate the entire equipment catalog (1,117+ items).</p>
            <CatalogBulkLoader onComplete={handleImportComplete} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">cuaux Equipment Catalog Extractor</h2>
            <p className="text-sm text-gray-500 mb-4">Scans the cuaux file to extract every unique equipment name for a complete, lossless catalog export.</p>
            <CuauxExtractor />
          </div>
        )}

        {/* Results Section */}
        {importComplete && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Summary</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{importComplete.totalRecords || importComplete.imported || 0}</div>
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