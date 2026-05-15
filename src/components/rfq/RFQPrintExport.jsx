import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

const COMPLIANCE_LABELS = {
  compliant: 'COMPLIANT',
  compliant_with_exception: 'COMPLIANT W/ EXCEPTION',
  non_compliant: 'NON-COMPLIANT',
  not_applicable: 'N/A',
  pending_review: 'PENDING REVIEW',
};

function buildResponseHTML(rfq) {
  const complianceRows = (rfq.complianceMatrix || [])
    .map(row => `
      <tr>
        <td style="border: 1px solid #e5e7eb; padding: 6px; font-weight: 600;">${row.sectionNumber || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px;">${row.requirementSummary || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; background: #f0fdf4; font-weight: 600;">${COMPLIANCE_LABELS[row.complianceStatus] || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px;">${row.responseText || ''}</td>
      </tr>
    `).join('');

  const lineItemsRows = (rfq.proposedLineItems || [])
    .map(item => `
      <tr>
        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${item.lineNumber || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px;">${item.description || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.quantity || ''}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">$${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right; font-weight: 600;">$${(item.totalPrice || 0).toFixed(2)}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RFQ Response</title>
  <style>
    * { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; color: #111; }
    h1 { font-size: 18px; margin-bottom: 4px; border-bottom: 2px solid #000; padding-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; font-weight: bold; }
    p { margin: 4px 0; font-size: 11px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; font-size: 10px; }
    th { border: 1px solid #e5e7eb; padding: 6px; text-align: left; background: #f3f4f6; font-weight: bold; }
    td { border: 1px solid #e5e7eb; padding: 6px; vertical-align: top; }
    .total { font-size: 12px; font-weight: bold; text-align: right; margin-top: 8px; }
    @page { size: letter; margin: 1cm; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <h1>REQUEST FOR QUOTATION — RESPONSE</h1>
  
  <div style="margin-bottom: 12px; font-size: 11px;">
    <p><strong>Submitted to:</strong> ${rfq.issuingOrg || ''}</p>
    ${rfq.rfqNumber ? `<p><strong>RFQ Number:</strong> ${rfq.rfqNumber}</p>` : ''}
    ${rfq.title ? `<p><strong>Title:</strong> ${rfq.title}</p>` : ''}
    ${rfq.dueDate ? `<p><strong>Due Date:</strong> ${rfq.dueDate}${rfq.dueTime ? ' ' + rfq.dueTime : ''}</p>` : ''}
    <p><strong>Date Prepared:</strong> ${new Date().toLocaleDateString()}</p>
    ${rfq.branch ? `<p><strong>Responding Branch:</strong> ${rfq.branch}</p>` : ''}
  </div>

  ${rfq.responseNarrative ? `
    <h2>RESPONSE NARRATIVE</h2>
    <div style="font-size: 10px; line-height: 1.5; white-space: pre-wrap;">${rfq.responseNarrative}</div>
  ` : ''}

  ${rfq.complianceMatrix?.length > 0 ? `
    <h2>COMPLIANCE MATRIX</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 60px;">Section</th>
          <th>Requirement</th>
          <th style="width: 100px;">Status</th>
          <th>Response</th>
        </tr>
      </thead>
      <tbody>
        ${complianceRows}
      </tbody>
    </table>
  ` : ''}

  ${rfq.proposedLineItems?.length > 0 ? `
    <h2>PROPOSED PRICING — LINE ITEMS</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">Line</th>
          <th>Description</th>
          <th style="width: 50px; text-align: right;">Qty</th>
          <th style="width: 80px; text-align: right;">Unit Price</th>
          <th style="width: 80px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsRows}
      </tbody>
    </table>
    <div class="total">ESTIMATED TOTAL: $${(rfq.estimatedTotalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
  ` : ''}
</body>
</html>`;
}

export default function RFQPrintExport({ rfq, onClose }) {
  const handlePrintBrowser = () => {
    const html = buildResponseHTML(rfq);
    const win = window.open('', '_blank', 'width=1000,height=800');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => { win.close(); }, 500);
    }, 400);
  };

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
          <Button onClick={handlePrintBrowser} variant="outline" className="flex-1">
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </div>
  );
}