import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';

async function loadImageAsDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default function ClaimPackageButton({ recovery, deliveryPhotos = [] }) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const margin = 40;
    const col = (W - margin * 2 - 10) / 2;

    // ── Header ────────────────────────────────────────────────
    doc.setFontSize(18).setFont(undefined, 'bold');
    doc.text('Equipment Condition Report', margin, 50);
    doc.setFontSize(10).setFont(undefined, 'normal').setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 66);
    doc.text(`Customer: ${recovery.customerName}`, margin, 80);
    doc.text(`Recovery ID: ${recovery.id}`, margin, 94);
    doc.text(`Scheduled: ${recovery.scheduledDate}`, margin, 108);
    if (recovery.completedAt) {
      doc.text(`Completed: ${new Date(recovery.completedAt).toLocaleString()}`, margin, 122);
    }

    let y = 145;

    // ── Items ─────────────────────────────────────────────────
    if (recovery.items?.length) {
      doc.setFontSize(12).setFont(undefined, 'bold').setTextColor(30);
      doc.text('Equipment Recovered', margin, y);
      y += 16;
      doc.setFontSize(10).setFont(undefined, 'normal').setTextColor(60);
      recovery.items.forEach(item => {
        doc.text(`• ${item.equipmentName} (qty: ${item.quantity})`, margin + 8, y);
        y += 14;
      });
      y += 10;
    }

    // ── Damage Notes ──────────────────────────────────────────
    if (recovery.detectedDamages?.length) {
      doc.setFontSize(12).setFont(undefined, 'bold').setTextColor(180, 0, 0);
      doc.text('Damage Noted', margin, y);
      y += 16;
      doc.setFontSize(10).setFont(undefined, 'normal').setTextColor(60);
      recovery.detectedDamages.forEach(d => {
        const line = `• ${d.equipmentName}: ${d.damageType} — ${d.severity}${d.description ? ` — ${d.description}` : ''}`;
        doc.text(line, margin + 8, y, { maxWidth: W - margin * 2 - 8 });
        y += 14;
      });
      y += 10;
    }

    // ── Notes ─────────────────────────────────────────────────
    if (recovery.notes) {
      doc.setFontSize(12).setFont(undefined, 'bold').setTextColor(30);
      doc.text('Notes', margin, y);
      y += 16;
      doc.setFontSize(10).setFont(undefined, 'normal').setTextColor(60);
      const lines = doc.splitTextToSize(recovery.notes, W - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 13 + 10;
    }

    // ── Photo Section ─────────────────────────────────────────
    const recoveryPhotos = recovery.photos || [];
    const maxPairs = Math.max(deliveryPhotos.length, recoveryPhotos.length);

    if (maxPairs > 0) {
      // New page for photos
      doc.addPage();
      y = margin;

      doc.setFontSize(14).setFont(undefined, 'bold').setTextColor(30);
      doc.text('Photo Comparison', margin, y);
      y += 12;
      doc.setFontSize(9).setFont(undefined, 'normal').setTextColor(100);
      doc.text('Left: Delivery condition  ·  Right: Recovery condition', margin, y);
      y += 20;

      for (let i = 0; i < maxPairs; i++) {
        const imgH = col; // square
        if (y + imgH + 40 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        // Column headers
        doc.setFontSize(8).setFont(undefined, 'bold').setTextColor(40, 100, 180);
        doc.text(`📦 Delivery Photo ${i + 1}`, margin, y);
        doc.setTextColor(180, 40, 40);
        doc.text(`🔄 Recovery Photo ${i + 1}`, margin + col + 10, y);
        y += 12;

        // Delivery photo
        if (deliveryPhotos[i]) {
          const dp = deliveryPhotos[i];
          const dataUrl = await loadImageAsDataUrl(dp.url);
          doc.addImage(dataUrl, 'JPEG', margin, y, col, col);
          doc.setFontSize(7).setFont(undefined, 'normal').setTextColor(100);
          doc.text(new Date(dp.timestamp).toLocaleString(), margin, y + col + 10);
          if (dp.gps?.latitude) {
            doc.text(`GPS: ${dp.gps.latitude.toFixed(5)}, ${dp.gps.longitude.toFixed(5)}`, margin, y + col + 20);
          }
        } else {
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, y, col, col, 'F');
          doc.setFontSize(9).setTextColor(150);
          doc.text('No delivery photo', margin + col / 2, y + col / 2, { align: 'center' });
        }

        // Recovery photo
        if (recoveryPhotos[i]) {
          const rp = recoveryPhotos[i];
          const dataUrl = await loadImageAsDataUrl(rp.url);
          doc.addImage(dataUrl, 'JPEG', margin + col + 10, y, col, col);
          doc.setFontSize(7).setFont(undefined, 'normal').setTextColor(100);
          doc.text(new Date(rp.timestamp).toLocaleString(), margin + col + 10, y + col + 10);
          if (rp.gps?.latitude) {
            doc.text(`GPS: ${rp.gps.latitude.toFixed(5)}, ${rp.gps.longitude.toFixed(5)}`, margin + col + 10, y + col + 20);
          }
        } else {
          doc.setFillColor(230, 230, 230);
          doc.rect(margin + col + 10, y, col, col, 'F');
          doc.setFontSize(9).setTextColor(150);
          doc.text('No recovery photo', margin + col + 10 + col / 2, y + col / 2, { align: 'center' });
        }

        y += col + 30;
      }
    }

    // ── Footer on each page ───────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8).setTextColor(160);
      doc.text(
        `Rental World Equipment — Confidential — Page ${p} of ${pageCount}`,
        W / 2, doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );
    }

    const filename = `claim-${recovery.customerName.replace(/\s+/g, '_')}-${recovery.scheduledDate}.pdf`;
    doc.save(filename);
    setGenerating(false);
  };

  return (
    <Button
      onClick={generate}
      disabled={generating}
      variant="outline"
      className="w-full border-rose-300 text-rose-700 hover:bg-rose-50 gap-2"
    >
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF…</>
        : <><FileDown className="w-4 h-4" /> Download Claim Package</>
      }
    </Button>
  );
}