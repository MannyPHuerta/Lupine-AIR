import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Upload, Grid3X3, Trash2, RotateCw, Link } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CanvasToolbar({ scale, onScaleChange, showGrid, onToggleGrid, onUploadPhoto, onClearCanvas, venueDimensions, onDimensionsChange, venueRotation, onVenueRotate }) {
  const [uploading, setUploading] = useState(false);
  const [editingDims, setEditingDims] = useState(false);
  const [w, setW] = useState(venueDimensions.width || '');
  const [l, setL] = useState(venueDimensions.length || '');
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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
    <div className="h-12 bg-white border-b border-gray-200 flex items-center gap-1 px-3 flex-shrink-0">
      {/* Zoom controls */}
      <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
        <button
          onClick={() => onScaleChange(Math.max(4, scale - 2))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 w-12 text-center">{scale}px/ft</span>
        <button
          onClick={() => onScaleChange(Math.min(30, scale + 2))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => onScaleChange(10)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
          title="Reset zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid toggle */}
      <button
        onClick={onToggleGrid}
        className={`p-1.5 rounded transition ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}
        title="Toggle grid"
      >
        <Grid3X3 className="w-4 h-4" />
      </button>

      {/* Venue dimensions */}
      <div className="border-l border-gray-200 pl-3 ml-1">
        {editingDims ? (
          <form onSubmit={handleDimsSubmit} className="flex items-center gap-1">
            <input
              className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 text-center"
              placeholder="Width ft"
              value={w}
              onChange={e => setW(e.target.value)}
              autoFocus
            />
            <span className="text-gray-400 text-xs">×</span>
            <input
              className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 text-center"
              placeholder="Length ft"
              value={l}
              onChange={e => setL(e.target.value)}
            />
            <span className="text-gray-400 text-xs">ft</span>
            <button type="submit" className="text-xs text-blue-600 hover:text-blue-800 px-1">Set</button>
            <button type="button" onClick={() => setEditingDims(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
          </form>
        ) : (
          <button
            onClick={() => setEditingDims(true)}
            className="text-xs text-gray-500 hover:text-gray-800 transition flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {venueDimensions.width && venueDimensions.length
              ? <span>{venueDimensions.width}×{venueDimensions.length} ft</span>
              : <span>Set dimensions</span>}
          </button>
        )}
      </div>

      {/* Photo upload — prominent, first */}
      <div className="border-l border-gray-200 pl-3 ml-1 flex items-center gap-1">
        <label className={`p-1.5 rounded cursor-pointer flex items-center gap-1.5 text-xs font-medium transition
          ${uploading ? 'text-gray-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'}`}>
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : '📷 Venue Photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
        </label>
        {editingUrl ? (
          <form onSubmit={e => { e.preventDefault(); if (urlInput.trim()) { onUploadPhoto(urlInput.trim()); setUrlInput(''); } setEditingUrl(false); }} className="flex items-center gap-1">
            <input
              className="w-48 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800"
              placeholder="Paste image URL…"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="text-xs text-blue-600 hover:text-blue-800 px-1">Set</button>
            <button type="button" onClick={() => setEditingUrl(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
          </form>
        ) : (
          <button
            onClick={() => setEditingUrl(true)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition flex items-center gap-1.5 text-xs"
            title="Paste image URL"
          >
            <Link className="w-4 h-4" /> URL
          </button>
        )}
      </div>

      {/* Venue/canvas rotate */}
      <div className="border-l border-gray-200 pl-3 ml-1">
        <button
          onClick={onVenueRotate}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition flex items-center gap-1.5 text-xs"
          title="Rotate venue 90°"
        >
          <RotateCw className="w-4 h-4" />
          Rotate
        </button>
      </div>

      {/* Clear canvas */}
      <div className="ml-auto">
        <button
          onClick={() => { if (confirm('Clear all items from canvas?')) onClearCanvas(); }}
          className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
          title="Clear canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}