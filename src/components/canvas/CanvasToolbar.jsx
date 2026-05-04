import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Upload, Grid3X3, Trash2, RotateCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CanvasToolbar({ scale, onScaleChange, showGrid, onToggleGrid, onUploadPhoto, onClearCanvas, venueDimensions, onDimensionsChange, venueRotation, onVenueRotate }) {
  const [uploading, setUploading] = useState(false);
  const [editingDims, setEditingDims] = useState(false);
  const [w, setW] = useState(venueDimensions.width || '');
  const [l, setL] = useState(venueDimensions.length || '');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUploadPhoto(file_url);
    setUploading(false);
  };

  const handleDimsSubmit = (e) => {
    e.preventDefault();
    onDimensionsChange({ width: parseFloat(w) || 0, length: parseFloat(l) || 0 });
    setEditingDims(false);
  };

  return (
    <div className="h-12 bg-slate-900 border-b border-white/10 flex items-center gap-1 px-3 flex-shrink-0">
      {/* Zoom controls */}
      <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
        <button
          onClick={() => onScaleChange(Math.max(4, scale - 2))}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-white/50 w-12 text-center">{scale}px/ft</span>
        <button
          onClick={() => onScaleChange(Math.min(30, scale + 2))}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => onScaleChange(10)}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
          title="Reset zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid toggle */}
      <button
        onClick={onToggleGrid}
        className={`p-1.5 rounded transition ${showGrid ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
        title="Toggle grid"
      >
        <Grid3X3 className="w-4 h-4" />
      </button>

      {/* Venue dimensions */}
      <div className="border-l border-white/10 pl-3 ml-1">
        {editingDims ? (
          <form onSubmit={handleDimsSubmit} className="flex items-center gap-1">
            <input
              className="w-16 bg-slate-800 border border-white/20 rounded px-2 py-1 text-xs text-white text-center"
              placeholder="Width ft"
              value={w}
              onChange={e => setW(e.target.value)}
              autoFocus
            />
            <span className="text-white/30 text-xs">×</span>
            <input
              className="w-16 bg-slate-800 border border-white/20 rounded px-2 py-1 text-xs text-white text-center"
              placeholder="Length ft"
              value={l}
              onChange={e => setL(e.target.value)}
            />
            <span className="text-white/40 text-xs">ft</span>
            <button type="submit" className="text-xs text-cyan-400 hover:text-cyan-300 px-1">Set</button>
            <button type="button" onClick={() => setEditingDims(false)} className="text-xs text-white/30 hover:text-white/60 px-1">✕</button>
          </form>
        ) : (
          <button
            onClick={() => setEditingDims(true)}
            className="text-xs text-white/50 hover:text-white transition flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {venueDimensions.width && venueDimensions.length
              ? <span>{venueDimensions.width}×{venueDimensions.length} ft</span>
              : <span>Set dimensions</span>}
          </button>
        )}
      </div>

      {/* Photo upload */}
      <div className="border-l border-white/10 pl-3 ml-1">
        <label className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Venue photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
        </label>
      </div>

      {/* Venue/canvas rotate */}
      <div className="border-l border-white/10 pl-3 ml-1">
        <button
          onClick={onVenueRotate}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition flex items-center gap-1.5 text-xs"
          title="Rotate venue 90°"
        >
          <RotateCw className="w-4 h-4" />
          Rotate venue
        </button>
      </div>

      {/* Clear canvas */}
      <div className="ml-auto">
        <button
          onClick={() => { if (confirm('Clear all items from canvas?')) onClearCanvas(); }}
          className="p-1.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition"
          title="Clear canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}