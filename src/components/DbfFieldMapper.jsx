import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function DbfFieldMapper({ fields, sampleRecords }) {
  const [expandedFields, setExpandedFields] = useState(new Set());

  const toggleField = (fieldName) => {
    const updated = new Set(expandedFields);
    if (updated.has(fieldName)) {
      updated.delete(fieldName);
    } else {
      updated.add(fieldName);
    }
    setExpandedFields(updated);
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Field Mapping & Samples</h2>
      <div className="space-y-2">
        {fields.map((field) => (
          <div 
            key={field.name}
            className="border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleField(field.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="font-mono text-sm font-semibold text-gray-900">{field.name}</div>
                <div className="text-xs text-gray-500">{field.type} • {field.size} bytes</div>
              </div>
              {expandedFields.has(field.name) ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedFields.has(field.name) && (
              <div className="border-t bg-gray-50 px-4 py-3 space-y-2">
                <p className="text-xs text-gray-600 font-semibold">Sample Values:</p>
                <div className="space-y-1">
                  {sampleRecords.slice(0, 3).map((record, i) => (
                    <div key={i} className="text-xs bg-white rounded p-2 border font-mono text-gray-700 truncate">
                      {record[field.name] || '(empty)'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" disabled>
          ← Review Schema
        </Button>
        <Button disabled className="flex-1">
          Map to Equipment → (Coming Next)
        </Button>
      </div>
    </div>
  );
}