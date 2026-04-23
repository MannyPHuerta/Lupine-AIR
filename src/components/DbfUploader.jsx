import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function DbfUploader({ onSelect, loading }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelect(file);
    }
  };

  return (
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
      <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-4"
        disabled={loading}
      >
        Choose File
      </Button>
    </div>
  );
}