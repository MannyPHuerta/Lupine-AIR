import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgreementSigningPad from '@/components/AgreementSigningPad';
import jsPDF from 'jspdf';

export default function AgreementSigningFlow() {
  const [agreement, setAgreement] = useState(null);
  const [signatures, setSignatures] = useState({});
  const [activeSignature, setActiveSignature] = useState(null);
  const [printing, setPrinting] = useState(false);
  const agreementId = new URLSearchParams(window.location.search).get('id');
  const branch = new URLSearchParams(window.location.search).get('branch');

  useEffect(() => {
    if (agreementId) {
      base44.entities.RentalAgreement.filter({ id: agreementId }).then(data => {
        if (data.length > 0) setAgreement(data[0]);
      });
    }
  }, [agreementId]);

  const handleSign = (token, dataUrl) => {
    setSignatures(prev => ({ ...prev, [token]: dataUrl }));
    setActiveSignature(null);
  };

  const embedSignatures = async () => {
    setPrinting(true);
    try {
      // Replace signature tokens with placeholder text (actual embedding happens in PDF)
      let finalContent = agreement.content;
      Object.entries(signatures).forEach(([token, dataUrl]) => {
        finalContent = finalContent.replace(token, `[SIGNATURE EMBEDDED: ${token}]`);
      });

      // Create PDF with embedded signatures
      const doc = new jsPDF.jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');

      const lines = doc.splitTextToSize(finalContent, maxWidth);
      let y = margin;

      lines.forEach(line => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        // Check if this line contains a signature token
        const signatureMatch = line.match(/\[SIGNATURE EMBEDDED: (\w+)\]/);
        if (signatureMatch && signatures[signatureMatch[1]]) {
          y += 10;
          doc.addImage(signatures[signatureMatch[1]], 'PNG', margin, y, 60, 20);
          y += 25;
        } else {
          doc.text(line, margin, y);
          y += 5;
        }
      });

      doc.save(`rental-agreement-${branch || 'unsigned'}.pdf`);
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setPrinting(false);
    }
  };

  if (!agreement) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Extract signature tokens from content
  const signatureTokens = agreement.content.match(/\[(SIGNATURE|INITIALS|DATE)_\d+\]/g) || [];
  const uniqueTokens = [...new Set(signatureTokens)];
  const signedCount = Object.keys(signatures).length;
  const allSigned = uniqueTokens.length > 0 && signedCount === uniqueTokens.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-white p-2 rounded-lg hover:bg-indigo-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-lg font-bold">Sign Agreement</div>
              <div className="text-indigo-300 text-xs">Signatures: {signedCount}/{uniqueTokens.length}</div>
            </div>
          </div>
          <Button
            onClick={embedSignatures}
            disabled={!allSigned || printing}
            className="bg-white text-indigo-900 hover:bg-indigo-50 gap-2"
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? 'Generating...' : 'Print PDF'}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Agreement content with clickable signature zones */}
        <div className="bg-white rounded-lg border shadow-sm p-8 mb-6 whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800">
          {agreement.content.split(/(\[(?:SIGNATURE|INITIALS|DATE)_\d+\])/g).map((segment, idx) => {
            const match = segment.match(/\[(SIGNATURE|INITIALS|DATE)_(\d+)\]/);
            if (!match) return <span key={idx}>{segment}</span>;

            const token = segment;
            const isSigned = signatures[token];
            const type = match[1].toLowerCase();

            return (
              <button
                key={idx}
                onClick={() => setActiveSignature({ token, type, label: `${type === 'signature' ? 'Customer' : 'Lessor'} ${type}` })}
                className={`inline-block mx-1 px-2 py-1 rounded border-2 transition ${
                  isSigned
                    ? 'bg-green-50 border-green-300 text-green-700 font-semibold'
                    : 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                {isSigned ? '✓ Signed' : `[Sign: ${type}]`}
              </button>
            );
          })}
        </div>

        {/* Signature blocks list */}
        <div className="grid grid-cols-2 gap-4">
          {uniqueTokens.map(token => {
            const match = token.match(/\[(SIGNATURE|INITIALS|DATE)_\d+\]/);
            const type = match ? match[1].toLowerCase() : 'signature';
            const isSigned = signatures[token];

            return (
              <div key={token} className={`p-4 rounded-lg border-2 ${isSigned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-sm font-semibold text-gray-700 mb-2">{type === 'signature' ? 'Customer Signature' : type === 'initials' ? 'Initials' : 'Date'}</p>
                {isSigned ? (
                  <div className="text-green-700 text-xs">✓ Completed</div>
                ) : (
                  <Button
                    onClick={() => setActiveSignature({ token, type, label: `${type === 'signature' ? 'Customer' : 'Lessor'} ${type}` })}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                  >
                    Capture {type}
                  </Button>
                )}
              </div>
            );
          })}
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