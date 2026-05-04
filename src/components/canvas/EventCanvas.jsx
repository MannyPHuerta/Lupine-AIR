import { useRef, useEffect, useState, useCallback } from 'react';

const CATEGORY_COLORS = {
  Tent: '#6366f1',
  Chair: '#f59e0b',
  Table: '#10b981',
  Generator: '#ef4444',
  Inflatable: '#ec4899',
  Staging: '#8b5cf6',
  'Dance Floor': '#06b6d4',
  'Light Tower': '#f97316',
  default: '#64748b',
};

const GRID_COLOR = 'rgba(255,255,255,0.06)';
const GRID_MAJOR_COLOR = 'rgba(255,255,255,0.12)';

export default function EventCanvas({
  items,
  scale,
  showGrid,
  venueWidth,
  venueLength,
  venuePhotoUrl,
  venueRotation,
  selectedId,
  onSelect,
  onMove,
  onDrop,
  onRotate,
  onDelete,
}) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const bgImage = useRef(null);

  // Load background image
  useEffect(() => {
    if (!venuePhotoUrl) { bgImage.current = null; return; }
    const img = new Image();
    img.src = venuePhotoUrl;
    img.onload = () => { bgImage.current = img; draw(); };
  }, [venuePhotoUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);

    // Venue boundary
    if (venueWidth && venueLength) {
      const vw = venueWidth * scale;
      const vl = venueLength * scale;

      // Venue photo or fill
      if (bgImage.current) {
        const rot = ((venueRotation || 0) * Math.PI) / 180;
        ctx.save();
        ctx.translate(vw / 2, vl / 2);
        ctx.rotate(rot);
        ctx.drawImage(bgImage.current, -vw / 2, -vl / 2, vw, vl);
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, vw, vl);
      } else {
        ctx.fillStyle = 'rgba(34,197,94,0.06)';
        ctx.fillRect(0, 0, vw, vl);
      }

      // Grid
      if (showGrid) {
        for (let x = 0; x <= vw; x += scale) {
          ctx.strokeStyle = x % (scale * 10) === 0 ? GRID_MAJOR_COLOR : GRID_COLOR;
          ctx.lineWidth = x % (scale * 10) === 0 ? 1 : 0.5;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, vl); ctx.stroke();
        }
        for (let y = 0; y <= vl; y += scale) {
          ctx.strokeStyle = y % (scale * 10) === 0 ? GRID_MAJOR_COLOR : GRID_COLOR;
          ctx.lineWidth = y % (scale * 10) === 0 ? 1 : 0.5;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(vw, y); ctx.stroke();
        }
        // Dimension labels
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`${venueWidth} ft`, vw / 2 - 15, vl + 16);
        ctx.save();
        ctx.translate(-14, vl / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${venueLength} ft`, -15, 0);
        ctx.restore();
      }

      // Venue border
      ctx.strokeStyle = 'rgba(34,197,94,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, vw, vl);
    } else if (showGrid) {
      // Infinite grid when no venue
      const gridSize = scale;
      const startX = -pan.x % gridSize;
      const startY = -pan.y % gridSize;
      for (let x = startX - gridSize; x < W - pan.x + gridSize; x += gridSize) {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x, -pan.y); ctx.lineTo(x, H - pan.y); ctx.stroke();
      }
      for (let y = startY - gridSize; y < H - pan.y + gridSize; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(-pan.x, y); ctx.lineTo(W - pan.x, y); ctx.stroke();
      }
    }

    // Draw items
    items.forEach(item => {
      const iw = (item.widthFt || 10) * scale;
      const il = (item.lengthFt || 10) * scale;
      const x = item.x || 0;
      const y = item.y || 0;
      const color = item.color || CATEGORY_COLORS[item.category] || CATEGORY_COLORS.default;
      const isSelected = item.id === selectedId;

      ctx.save();
      ctx.translate(x + iw / 2, y + il / 2);
      if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.translate(-iw / 2, -il / 2);

      // Shadow for selected
      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }

      // Fill
      ctx.fillStyle = color + '33';
      ctx.fillRect(0, 0, iw, il);

      // Border
      ctx.strokeStyle = isSelected ? '#fff' : color;
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.strokeRect(0, 0, iw, il);

      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, Math.min(13, scale * 1.2))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = item.label || item.equipmentName || '';
      const maxChars = Math.floor(iw / (scale * 0.7));
      const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
      ctx.fillText(displayLabel, iw / 2, il / 2);

      // Dimension hint
      if (isSelected && item.widthFt && item.lengthFt) {
        ctx.font = `10px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(`${item.widthFt}×${item.lengthFt}ft`, iw / 2, il / 2 + 14);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [items, scale, showGrid, venueWidth, venueLength, pan, selectedId]);

  useEffect(() => { draw(); }, [draw]);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const getCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - pan.x,
      y: e.clientY - rect.top - pan.y,
    };
  };

  const hitTest = (pt) => {
    // Reverse order so top items are picked first
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const iw = (item.widthFt || 10) * scale;
      const il = (item.lengthFt || 10) * scale;
      if (pt.x >= item.x && pt.x <= item.x + iw && pt.y >= item.y && pt.y <= item.y + il) {
        return item;
      }
    }
    return null;
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || e.altKey) {
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    const pt = getCanvasPoint(e);
    const hit = hitTest(pt);
    if (hit) {
      onSelect(hit.id);
      setDragging({ id: hit.id, offsetX: pt.x - hit.x, offsetY: pt.y - hit.y });
    } else {
      onSelect(null);
    }
  };

  const handleMouseMove = (e) => {
    if (panning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (!dragging) return;
    const pt = getCanvasPoint(e);
    onMove(dragging.id, pt.x - dragging.offsetX, pt.y - dragging.offsetY);
  };

  const handleMouseUp = () => {
    setDragging(null);
    setPanning(false);
    setPanStart(null);
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const eq = JSON.parse(data);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - pan.x;
    const y = e.clientY - rect.top - pan.y;
    onDrop(eq, x, y);
  };

  const handleKeyDown = (e) => {
    if (!selectedId) return;
    if (e.key === 'Delete' || e.key === 'Backspace') onDelete(selectedId);
    if (e.key === 'r' || e.key === 'R') onRotate(selectedId, 90);
  };

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 w-full h-full cursor-crosshair outline-none"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
    />
  );
}