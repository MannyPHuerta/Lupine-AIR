import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Printer, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AgreementSigningPad from '@/components/AgreementSigningPad';
import jsPDF from 'jspdf';

function buildSignedPDF(agreement, signatures, rentalMeta) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;

  // ── Header ──
  doc.setFillColor(30, 60, 114);
  doc.rect(0, 0, pageW, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(rentalMeta.companyName || 'Equipment Rental', margin, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(agreement.title || 'Equipment Rental Agreement', margin, 56);
  if (rentalMeta.invoiceNumber) {
    doc.text(`Invoice: ${rentalMeta.invoiceNumber}`, pageW - margin, 38, { align: 'right' });
  }
  doc.text(`Branch: ${agreement.branch || rentalMeta.branch || ''}`, pageW - margin, 56, { align: 'right' });

  // ── Customer info bar ──
  doc.setFillColor(240, 247, 255);
  doc.rect(0, 70, pageW, 36, 'F');
  doc.setTextColor(30, 60, 114);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  if (rentalMeta.customerName) doc.text(`Customer: ${rentalMeta.customerName}`, margin, 90);
  if (rentalMeta.customerEmail) doc.text(`Email: ${rentalMeta.customerEmail}`, pageW / 2, 90);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - margin, 90, { align: 'right' });

  // ── Agreement body ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  let y = 124;
  const lineH = 13;

  const content = agreement.content || '';
  // Split content on signature tokens
  const parts = content.split(/(\[(?:SIGNATURE|INITIALS|DATE)_\d+\])/g);

  for (const part of parts) {
    const tokenMatch = part.match(/\[(SIGNATURE|INITIALS|DATE)_(\d+)\]/);
    if (tokenMatch) {
      const sigDataUrl = signatures[part];
      if (sigDataUrl) {
        if (y + 60 > pageH - margin) { doc.addPage(); y = margin; }
        // Signature line
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, y + 40, margin + 180, y + 40);
        doc.addImage(sigDataUrl, 'PNG', margin, y, 180, 40);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        const label = tokenMatch[1] === 'SIGNATURE' ? 'Customer Signature' : tokenMatch[1] === 'INITIALS' ? 'Initials' : 'Date';
        doc.text(label, margin, y + 50);
        doc.text(new Date().toLocaleString(), margin + 190, y + 50);
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        y += 58;
      } else {
        // Unsigned placeholder
        if (y + 30 > pageH - margin) { doc.addPage(); y = margin; }
        doc.setDrawColor(200, 150, 0);
        doc.setFillColor(255, 248, 220);
        doc.rect(margin, y, 200, 24, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(160, 120, 0);
        doc.text('[Not signed]', margin + 4, y + 15);
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        y += 32;
      }
      continue;
    }

    // Regular text — wrap and paginate
    const lines = doc.splitTextToSize(part, contentW);
    for (const line of lines) {
      if (y + lineH > pageH - margin) { doc.addPage(); y = margin; }
      // Bold section headings (lines that match "1. TITLE" pattern)
      if (/^\d+\.\s+[A-Z\s]{4,}$/.test(line.trim())) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
      } else if (/^[A-Z\s]{6,}$/.test(line.trim()) && line.trim().length < 60) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      doc.text(line, margin, y);
      y += lineH;
    }
  }

  // ── Footer on last page ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 249, 250);
    doc.rect(0, pageH - 28, pageW, 28, 'F');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${rentalMeta.companyName || 'Equipment Rental'} · Signed Agreement · Page ${i} of ${totalPages}`, pageW / 2, pageH - 12, { align: 'center' });
  }

  return doc;
}

export default function AgreementSigningFlow() {
  const params = new URLSearchParams(window.location.search);
  const agreementId = params.get('id');
  const branch = params.get('branch');
  const rentalId = params.get('rentalId');
  const invoiceNumber = params.get('invoice');
  const customerNameParam = params.get('customerName') || '';
  const customerEmailParam = params.get('customerEmail') || '';

  const [agreement, setAgreement] = useState(null);
  const [signatures, setSignatures] = useState({});
  const [activeSignature, setActiveSignature] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [customerEmail, setCustomerEmail] = useState(customerEmailParam);
  const [customerName, setCustomerName] = useState(customerNameParam);
  const [rentalMeta, setRentalMeta] = useState({
    companyName: '',
    invoiceNumber: invoiceNumber || '',
    branch: branch || '',
    customerName: customerNameParam,
    customerEmail: customerEmailParam,
  });

  useEffect(() => {
    const load = async () => {
      const [agreementData, companyData] = await Promise.all([
        agreementId ? base44.entities.RentalAgreement.filter({ id: agreementId }) : Promise.resolve([]),
        base44.entities.CompanySettings.list(),
      ]);
      if (agreementData.length > 0) setAgreement(agreementData[0]);
      const co = companyData[0] || {};
      setRentalMeta(prev => ({
        ...prev,
        companyName: co.companyName || 'AIR Equipment Rental',
      }));

      // If rentalId provided, fetch customer info
      if (rentalId) {
        const rentals = await base44.entities.Rental.filter({ id: rentalId }).catch(() => []);
        if (rentals[0]) {
          const r = rentals[0];
          setCustomerName(prev => prev || r.customerName || '');
          setCustomerEmail(prev => prev || r.customerEmail || '');
          setRentalMeta(prev => ({
            ...prev,
            invoiceNumber: prev.invoiceNumber || r.invoiceNumber || '',
            customerName: r.customerName || prev.customerName,
            customerEmail: r.customerEmail || prev.customerEmail,
          }));
        }
      }
    };
    load();
  }, [agreementId, rentalId]);

  const handleSign = (token, dataUrl) => {
    setSignatures(prev => ({ ...prev, [token]: dataUrl }));
    setActiveSignature(null);
  };

  const getMeta = () => ({
    ...rentalMeta,
    customerName: customerName || rentalMeta.customerName,
    customerEmail: customerEmail || rentalMeta.customerEmail,
  });

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const doc = buildSignedPDF(agreement, signatures, getMeta());
      const filename = rentalMeta.invoiceNumber
        ? `agreement-${rentalMeta.invoiceNumber}.pdf`
        : `rental-agreement-${branch || 'signed'}.pdf`;
      doc.save(filename);
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setPrinting(false);
    }
  };

  const handleEmailCustomer = async () => {
    if (!customerEmail) { setEmailError('Please enter a customer email address.'); return; }
    setEmailing(true);
    setEmailError('');
    try {
      const doc = buildSignedPDF(agreement, signatures, getMeta());
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const res = await base44.functions.invoke('sendSignedAgreement', {
        agreementId,
        customerName: customerName || rentalMeta.customerName,
        customerEmail,
        invoiceNumber: rentalMeta.invoiceNumber,
        branch: agreement?.branch || branch,
        signedPdfBase64: pdfBase64,
      });

      if (res.data?.success) {
        setEmailSent(true);
      } else {
        setEmailError(res.data?.error || 'Email failed — check function logs.');
      }
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailing(false);
    }
  };

  if (!agreement) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const signatureTokens = agreement.content?.match(/\[(SIGNATURE|INITIALS|DATE)_\d+\]/g) || [];
  const uniqueTokens = [...new Set(signatureTokens)];
  const signedCount = Object.keys(signatures).length;
  const allSigned = uniqueTokens.length > 0 && signedCount === uniqueTokens.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between max-w-5xl mx-auto gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-white p-2 rounded-lg hover:bg-indigo-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="font-bold text-lg leading-tight">{agreement.title || 'Rental Agreement'}</div>
              <div className="text-indigo-300 text-xs">
                {branch || agreement.branch}
                {rentalMeta.invoiceNumber ? ` · Invoice ${rentalMeta.invoiceNumber}` : ''}
                {' · '}Signatures: {signedCount}/{uniqueTokens.length}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handlePrint}
              disabled={!allSigned || printing}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 gap-2 disabled:opacity-40"
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print / Download
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Agreement type badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded font-semibold ${
            agreement.agreementType === 'bespoke'
              ? 'bg-purple-100 text-purple-800'
              : agreement.agreementType === 'custom_url'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {agreement.agreementType === 'bespoke' ? '📄 Bespoke Agreement'
              : agreement.agreementType === 'custom_url' ? '🔗 External Agreement'
              : '📋 ARA Standard Agreement'}
          </span>
          {uniqueTokens.length === 0 && (
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded font-semibold">
              ⚠ No signature fields found — agreement may not be enriched
            </span>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agreement text — left 2/3 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border shadow-sm p-8 whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800">
              {agreement.content?.split(/(\[(?:SIGNATURE|INITIALS|DATE)_\d+\])/g).map((segment, idx) => {
                const match = segment.match(/\[(SIGNATURE|INITIALS|DATE)_(\d+)\]/);
                if (!match) return <span key={idx}>{segment}</span>;

                const token = segment;
                const isSigned = signatures[token];
                const type = match[1].toLowerCase();

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSignature({ token, type, label: type === 'signature' ? 'Customer Signature' : type === 'initials' ? 'Customer Initials' : 'Date' })}
                    className={`inline-flex items-center gap-1 mx-1 px-3 py-1.5 rounded border-2 transition text-xs font-semibold ${
                      isSigned
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-yellow-50 border-yellow-400 text-yellow-800 hover:bg-yellow-100 animate-pulse'
                    }`}
                  >
                    {isSigned ? (
                      <><CheckCircle className="w-3 h-3" /> Signed</>
                    ) : (
                      `✎ ${type === 'signature' ? 'Sign here' : type === 'initials' ? 'Initial here' : 'Date'}`
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Signature checklist */}
            <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
              <div className="font-semibold text-gray-800 text-sm">Signature Checklist</div>
              {uniqueTokens.length === 0 ? (
                <div className="text-xs text-gray-400">No signature fields detected.</div>
              ) : (
                uniqueTokens.map(token => {
                  const match = token.match(/\[(SIGNATURE|INITIALS|DATE)_\d+\]/);
                  const type = match ? match[1].toLowerCase() : 'signature';
                  const isSigned = !!signatures[token];
                  return (
                    <div key={token} className={`flex items-center justify-between p-2.5 rounded-lg border ${isSigned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="text-xs font-medium text-gray-700">
                        {type === 'signature' ? '✍ Customer Signature' : type === 'initials' ? '✍ Initials' : '📅 Date'}
                      </div>
                      {isSigned ? (
                        <span className="text-green-600 text-xs font-bold">✓ Done</span>
                      ) : (
                        <button
                          onClick={() => setActiveSignature({ token, type, label: type === 'signature' ? 'Customer Signature' : type === 'initials' ? 'Customer Initials' : 'Date' })}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-semibold transition"
                        >
                          Sign
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Email to customer */}
            <div className={`bg-white rounded-lg border shadow-sm p-4 space-y-3 ${!allSigned ? 'opacity-60' : ''}`}>
              <div className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" /> Email Signed Copy
              </div>
              {!allSigned && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  Complete all signatures first
                </div>
              )}
              <div className="space-y-2">
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  disabled={!allSigned}
                  className="text-sm h-8"
                />
                <Input
                  placeholder="customer@email.com"
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  disabled={!allSigned}
                  className="text-sm h-8"
                />
              </div>
              {emailError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {emailError}
                </div>
              )}
              {emailSent ? (
                <div className="flex items-center gap-2 text-green-700 text-sm font-semibold bg-green-50 border border-green-200 rounded px-3 py-2">
                  <CheckCircle className="w-4 h-4" /> Sent to {customerEmail}
                </div>
              ) : (
                <Button
                  onClick={handleEmailCustomer}
                  disabled={!allSigned || emailing || !customerEmail}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm"
                >
                  {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {emailing ? 'Sending…' : 'Send to Customer'}
                </Button>
              )}
            </div>

            {/* Print button */}
            {allSigned && (
              <Button
                onClick={handlePrint}
                disabled={printing}
                variant="outline"
                className="w-full gap-2 border-gray-300 text-gray-700"
              >
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {activeSignature && (
        <AgreementSigningPad
          token={activeSignature.token}
          label={activeSignature.label}
          type={activeSignature.type}
          onSign={handleSign}
          onCancel={() => setActiveSignature(null)}
        />
      )}
    </div>
  );
}