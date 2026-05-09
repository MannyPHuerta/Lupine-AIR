import { useState, useRef } from 'react';
import { Trash2, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg', 0.7
      );
    };
    img.src = url;
  });
}

export default function PhotoCapture({ photos, onAddPhoto, onRemovePhoto }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const compressed = await compressImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    const photo = {
      url: file_url,
      timestamp: new Date().toISOString(),
      gps: null,
    };
    onAddPhoto(photo);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Equipment Photos</h3>
        <span className="text-xs text-gray-600">{photos.length} photo(s)</span>
      </div>

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Take Photo
          </>
        )}
      </Button>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img
                src={typeof photo.url === 'string' && photo.url.startsWith('data:') ? photo.url : photo.url}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemovePhoto(idx)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                {new Date(photo.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center text-gray-400 py-8 text-sm">
          At least 1 photo required to proceed
        </div>
      )}
    </div>
  );
}