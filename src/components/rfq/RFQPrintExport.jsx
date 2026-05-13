import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

const COMPLIANCE_LABELS = {
  compliant: 'COMPLIANT',
  compliant_with_exception: 'COMPLIANT W/ EXCEPTION',
  non_compliant: 'NON-COMPLIANT',
  not_applicable: 'N/A',
  pending_review: 'PENDING REVIEW',
};

export default function RFQPrintExport({ rfq, onClose }) {
  const handlePrintPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const margin = 20;
    const pageW = 216;
    const contentW = pageW - margin * 2;
    let y = margin;

    const addPage = () => { doc.addPage(); y = margin; };
    const checkY = (needed = 10) => { if (y + needed > 270) addPage(); };

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text('REQUEST FOR QUOTATION — RESPONSE', margin, y);
    y += 8;
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`Submitted to: ${rfq.issuingOrg}`, margin, y); y += 5;
    if (rfq.rfqNumber) { doc.text(`RFQ Number: ${rfq.rfqNumber}`, margin, y); y += 5; }
    if (rfq.title) { doc.text(`Title: ${rfq.title}`, margin, y); y += 5; }
    if (rfq.dueDate) { doc.text(`Due Date: ${rfq.dueDate}${rfq.dueTime ? ' ' + rfq.dueTime : ''}`, margin, y); y += 5; }
    doc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, margin, y); y += 5;
    if (rfq.branch) { doc.text(`Responding Branch: ${rfq.branch}`, margin, y); y += 5; }
    if (rfq.suggestedFileName) { doc.setFontSize(8).setTextColor(100); doc.text(`File: ${rfq.suggestedFileName}`, margin, y); doc.setFontSize(10).setTextColor(0); y += 5; }

    y += 4;
    doc.setDrawColor(0); doc.line(margin, y, pageW - margin, y); y += 8;

    // Response Narrative
    if (rfq.responseNarrative) {
      doc.setFont('helvetica', 'bold').setFontSize(12);
      doc.text('RESPONSE NARRATIVE', margin, y); y += 6;
      doc.setFont('helvetica', 'normal').setFontSize(9);
      const lines = doc.splitTextToSize(rfq.responseNarrative, contentW);
      lines.forEach(line => { checkY(5); doc.text(line, margin, y); y += 4.5; });
      y += 6;
    }

    // Compliance Matrix
    if (rfq.complianceMatrix?.length > 0) {
      checkY(20);
      doc.setFont('helvetica', 'bold').setFontSize(12);
      doc.text('COMPLIANCE MATRIX', margin, y); y += 7;

      // Column headers
      doc.setFontSize(8).setFont('helvetica', 'bold');
      doc.text('Section', margin, y);
      doc.text('Requirement', margin + 18, y);
      doc.text('Status', margin + 80, y);
      doc.text('Response', margin + 120, y);
      y += 4;
      doc.line(margin, y, pageW - margin, y); y += 4;

      doc.setFont('helvetica', 'normal').setFontSize(7.5);
      rfq.complianceMatrix.forEach(row => {
        checkY(12);
        const reqLines = doc.splitTextToSize(row.requirementSummary || '', 58);
        const respLines = doc.splitTextToSize(row.responseText || '', 54);
        const rowH = Math.max(reqLines.length, respLines.length) * 4 + 4;
        checkY(rowH);
        doc.text(row.sectionNumber || '', margin, y);
        doc.text(reqLines, margin + 18, y);
        doc.text(COMPLIANCE_LABELS[row.complianceStatus] || '', margin + 80, y);
        doc.text(respLines, margin + 120, y);
        if (row.exceptionNote) {
          doc.setTextColor(180, 80, 0);
          doc.text(`Note: ${row.exceptionNote}`, margin + 80, y + 4.5);
          doc.setTextColor(0);
        }
        y += rowH;
        doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); doc.setDrawColor(0);
        y += 2;
      });
      y += 6;
    }

    // Line Items
    if (rfq.proposedLineItems?.length > 0) {
      checkY(20);
      doc.setFont('helvetica', 'bold').setFontSize(12);
      doc.text('PROPOSED PRICING — LINE ITEMS', margin, y); y += 7;

      doc.setFontSize(8).setFont('helvetica', 'bold');
      doc.text('Line', margin, y);
      doc.text('Description', margin + 12, y);
      doc.text('Qty', margin + 95, y);
      doc.text('Unit', margin + 110, y);
      doc.text('Unit Price', margin + 130, y);
      doc.text('Total', margin + 160, y);
      y += 4;
      doc.line(margin, y, pageW - margin, y); y += 4;

      doc.setFont('helvetica', 'normal').setFontSize(8);
      rfq.proposedLineItems.forEach(item => {
        checkY(8);
        const descLines = doc.splitTextToSize(item.description || '', 80);
        doc.text(item.lineNumber || '', margin, y);
        doc.text(descLines, margin + 12, y);
        doc.text(String(item.quantity || ''), margin + 95, y);
        doc.text(item.unit || '', margin + 110, y);
        doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, margin + 130, y);
        doc.text(`$${(item.totalPrice || 0).toFixed(2)}`, margin + 160, y);
        y += descLines.length * 4.5 + 2;
        doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); doc.setDrawColor(0); y += 2;
      });

      y += 4;
      doc.setFont('helvetica', 'bold').setFontSize(11);
      doc.text(`ESTIMATED TOTAL: $${(rfq.estimatedTotalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: 'right' });
    }

    const fileName = rfq.suggestedFileName || `RFQ-Response-${rfq.issuingOrg?.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-gray-900 text-lg">Export / Print Response</div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
        </div>

        <div className="space-y-3 mb-6 text-sm text-gray-600">
          <div><strong>Document:</strong> {rfq.rfqNumber || 'RFQ Response'}</div>
          <div><strong>Org:</strong> {rfq.issuingOrg}</div>
          <div><strong>File name:</strong> <span className="font-mono text-xs">{rfq.suggestedFileName || 'RFQ-Response.pdf'}</span></div>
          <div><strong>Includes:</strong> Response narrative, compliance matrix ({rfq.complianceMatrix?.length || 0} items), line items ({rfq.proposedLineItems?.length || 0} items)</div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handlePrintPDF} className="flex-1 bg-green-700 hover:bg-green-800">
            <Printer className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="flex-1">
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}