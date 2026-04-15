import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, Images, X, Loader2 } from "lucide-react";

// Compress image to max 1200px wide and ~70% quality
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", 0.7);
    };
    img.src = url;
  });
}

export default function PhotoUploader({ photos, onChange }) {
  const cameraRef = useRef();
  const galleryRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      uploaded.push(file_url);
    }
    onChange([...photos, ...uploaded]);
    setUploading(false);
  };

  const removePhoto = (idx) => onChange(photos.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Camera button — opens native camera on mobile */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files))}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => cameraRef.current.click()}
          className="flex-1"
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </Button>

        {/* Gallery / file picker */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files))}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => galleryRef.current.click()}
          className="flex-1"
        >
          <Images className="w-4 h-4 mr-2" />
          Choose Photos
        </Button>
      </div>

      {/* Upload indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Compressing & uploading...
        </div>
      )}

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} className="w-20 h-20 object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}