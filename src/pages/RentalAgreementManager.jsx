import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Copy, AlertCircle, Wand2, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

// ARA-based standard equipment rental agreement
const ARA_AGREEMENT = `EQUIPMENT RENTAL AGREEMENT

This Equipment Rental Agreement ("Agreement") is entered into between the Company identified on the rental invoice ("Lessor") and the Customer named on the rental invoice ("Lessee").

1. RENTAL PERIOD
Equipment is rented for the period stated on the invoice. Rental charges begin upon delivery or pickup and continue until equipment is returned and accepted by Lessor. Lessee shall return equipment on or before the return date stated on the invoice.

2. RATES AND CHARGES
Lessee agrees to pay the rental rate stated on the invoice. Minimum rental charges apply. Time rates are based on time out, not time used. Rental charges continue until equipment is returned to Lessor. Lessee is responsible for all delivery and pickup charges.

3. CONDITION OF EQUIPMENT
Lessee acknowledges receipt of the equipment in good working order and agrees to return it in the same condition, normal wear and tear excepted. Lessee shall inspect the equipment before use and report any defects to Lessor immediately.

4. USE OF EQUIPMENT
Lessee shall use equipment only for its intended purpose and in a safe and lawful manner. Lessee shall not:
- Permit unlicensed or unqualified operators to use the equipment
- Use equipment for any illegal purpose
- Remove, alter, or deface any labels or safety markings
- Sublet or transfer equipment to any third party

5. LESSEE'S RESPONSIBILITY FOR LOSS AND DAMAGE
Lessee assumes full risk of loss, theft, or damage to the equipment from any cause whatsoever, including but not limited to: collision, overturn, fire, theft, vandalism, flood, and acts of God. Lessee shall pay Lessor for all costs to repair or replace equipment, including loss of rental revenue during repair or replacement.

6. FUEL AND MAINTENANCE
Equipment shall be returned with the same fuel level as when rented. Lessee is responsible for checking and maintaining fluid levels during the rental period. Fuel will be charged at current market rate plus a service charge if not returned full.

7. OPERATOR RESPONSIBILITY
Lessee is solely responsible for the safe and proper operation of the equipment. Lessor is not responsible for any damage, injury, or loss caused by Lessee's operation of the equipment. Lessee shall comply with all applicable federal, state, and local laws and regulations.

8. INDEMNIFICATION
Lessee agrees to indemnify, defend, and hold harmless Lessor and its officers, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including attorney's fees) arising out of or related to Lessee's use or possession of the equipment.

9. INSURANCE
Lessee shall maintain adequate insurance coverage for the equipment during the rental period. Lessee shall provide proof of insurance upon request. If Lessee fails to maintain insurance, Lessee remains fully liable for all loss or damage.

10. DEFAULT AND REPOSSESSION
If Lessee fails to pay any rental charges when due, returns equipment damaged beyond normal wear and tear, or breaches any provision of this Agreement, Lessor may immediately retake possession of the equipment. Lessee grants Lessor the right to enter Lessee's premises for this purpose.

11. LIMITATION OF LIABILITY
Lessor's liability to Lessee for any claim arising from this Agreement shall not exceed the total rental charges paid for the specific equipment giving rise to the claim. Lessor shall not be liable for any indirect, incidental, or consequential damages.

12. GOVERNING LAW
This Agreement shall be governed by the laws of the state where the Lessor is located. Any disputes shall be resolved in the courts of that jurisdiction.

13. ENTIRE AGREEMENT
This Agreement, together with the rental invoice, constitutes the entire agreement between the parties. No modification shall be valid unless in writing and signed by both parties.

14. ACKNOWLEDGMENT
By signing this Agreement, Lessee acknowledges reading and understanding all terms and conditions and agrees to be bound by them.`;

export default function RentalAgreementManager() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState('01 McAllen');
  const [agreements, setAgreements] = useState({});
  const [title, setTitle] = useState('Equipment Rental Agreement');
  const [content, setContent] = useState(ARA_AGREEMENT);
  const [pages, setPages] = useState(1);
  const [requiresInitials, setRequiresInitials] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [agreementId, setAgreementId] = useState(null);

  useEffect(() => {
    base44.entities.RentalAgreement.list().then(data => {
      const map = {};
      data.forEach(a => { map[a.branch] = a; });
      setAgreements(map);
      if (map[branch]) {
        setTitle(map[branch].title || 'Equipment Rental Agreement');
        setContent(map[branch].content || ARA_AGREEMENT);
        setPages(map[branch].pages || 1);
        setRequiresInitials(map[branch].requiresInitials !== false);
      } else {
        setTitle('Equipment Rental Agreement');
        setContent(ARA_AGREEMENT);
        setPages(1);
        setRequiresInitials(true);
      }
      setLoading(false);
    });
  }, []);

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const settings = await base44.entities.CompanySettings.list();
      const co = settings[0] || {};
      const branchSettings = await base44.entities.BranchSettings.filter({ branch });
      const bs = branchSettings[0] || {};

      const companyName = co.companyName || 'the Company';
      const state = bs.address ? bs.address.split(',').slice(-2).join(',').trim() : 'Texas';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a legal document specialist. Generate a complete, professional Equipment Rental Agreement for the following company:

Company Name: ${companyName}
Branch: ${branch}
Address: ${bs.address || co.address || ''}
Phone: ${bs.phone || co.phone || ''}
Email: ${bs.email || co.email || ''}
State: ${state}

Requirements:
- Use the company's actual name throughout (not placeholders)
- Reference the correct state for governing law
- Include all standard ARA (American Rental Association) recommended sections
- Professional legal language appropriate for an equipment rental company
- Sections: Rental Period, Rates & Charges, Equipment Condition, Permitted Use, Loss & Damage Responsibility, Fuel & Maintenance, Operator Responsibility, Indemnification, Insurance, Default & Repossession, Limitation of Liability, Governing Law, Entire Agreement, Acknowledgment
- Return ONLY the agreement text, no preamble or explanation`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' }
          }
        }
      });

      if (result.content) setContent(result.content);
      if (result.title) setTitle(result.title);
    } catch (err) {
      alert('AI generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadAgreement = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title or heading of the agreement document' },
            content: { type: 'string', description: 'The full text content of the rental agreement, preserving section headings and numbering' }
          }
        }
      });
      if (result.status === 'success' && result.output?.content) {
        setContent(result.output.content);
        if (result.output.title) setTitle(result.output.title);
      } else {
        alert('Could not extract text from the document. Please try a different file or paste the text manually.');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const handleBranchChange = (newBranch) => {
    setBranch(newBranch);
    if (agreements[newBranch]) {
      setTitle(agreements[newBranch].title || 'Equipment Rental Agreement');
      setContent(agreements[newBranch].content || ARA_AGREEMENT);
      setPages(agreements[newBranch].pages || 1);
      setRequiresInitials(agreements[newBranch].requiresInitials !== false);
    } else {
      setTitle('Equipment Rental Agreement');
      setContent(ARA_AGREEMENT);
      setPages(1);
      setRequiresInitials(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = agreements[branch];
      if (existing) {
        await base44.entities.RentalAgreement.update(existing.id, {
          title,
          content,
          pages,
          requiresInitials,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: (await base44.auth.me())?.email || 'unknown',
        });
        setAgreementId(existing.id);
      } else {
        const created = await base44.entities.RentalAgreement.create({
          branch,
          title,
          content,
          pages,
          requiresInitials,
          isActive: true,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: (await base44.auth.me())?.email || 'unknown',
        });
        setAgreements(prev => ({ ...prev, [branch]: created }));
        setAgreementId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEnrichAndSign = async () => {
    if (!agreementId) {
      alert('Please save the agreement first.');
      return;
    }

    setEnriching(true);
    try {
      const settings = await base44.entities.CompanySettings.list();
      const co = settings[0] || {};
      const branchSettings = await base44.entities.BranchSettings.filter({ branch });
      const bs = branchSettings[0] || {};

      const companyName = co.companyName || 'AIR Equipment Rental';
      const companyAddress = bs.address || co.address || '';
      const companyPhone = bs.phone || co.phone || '';
      const companyEmail = bs.email || co.email || '';

      const result = await base44.functions.invoke('enrichAgreementWithSignatures', {
        content,
        branch,
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
      });

      if (result.enriched_content) {
        setContent(result.enriched_content);
        window.open(`/agreement-signing?id=${agreementId}&branch=${branch}`, '_blank');
      }
    } catch (err) {
      alert('Enrichment failed: ' + err.message);
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const pageCount = pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/')} className="text-white p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Rental Agreement Manager</div>
            <div className="text-indigo-300 text-xs">Customize your rental terms by branch</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
            ✓ Agreement saved successfully!
          </div>
        )}

        {/* Branch selector */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Branch</label>
          <select
            value={branch}
            onChange={e => handleBranchChange(e.target.value)}
            className="w-full h-10 border border-input rounded-lg px-3 bg-white text-sm"
          >
            {['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Agreement Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Equipment Rental Agreement"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Pages</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={pages}
                onChange={e => setPages(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500 mt-1">Will require initials on pages 1–{pageCount - 1}, signature on page {pageCount}</p>
            </div>

            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresInitials}
                  onChange={e => setRequiresInitials(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm font-semibold text-gray-700">Require Initials</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>During checkout, staff will prompt the customer to initial each page before signing the final page.</span>
          </div>
        </div>

        {/* Agreement content */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-sm font-semibold text-gray-700">Agreement Text</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setContent(ARA_AGREEMENT); setTitle('Equipment Rental Agreement'); }}
                className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 border border-slate-200 rounded px-2 py-1 bg-white"
              >
                <RotateCcw className="w-3 h-3" /> Load ARA Standard
              </button>
              <label className={`cursor-pointer text-xs flex items-center gap-1 border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 hover:text-slate-800 ${extracting ? 'opacity-50 pointer-events-none' : ''}`}>
                {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {extracting ? 'Extracting...' : 'Upload Existing'}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleUploadAgreement} />
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAIGenerate}
                disabled={generating}
                className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {generating ? 'Generating...' : 'AI Generate for This Branch'}
              </Button>
            </div>
          </div>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="font-mono text-xs h-96 bg-gray-50"
            placeholder="Enter your rental agreement..."
          />
          <p className="text-xs text-gray-500">
            This text will be displayed on the rental form and printed on the invoice. Markdown formatting is supported.
          </p>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview</h3>
          <div className="bg-gray-50 border rounded-lg p-6 max-h-64 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs">
            {content.slice(0, 500)}...
          </div>
        </div>

        {/* Save & Sign buttons */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Agreement
          </Button>
          {agreementId && (
            <Button
              onClick={handleEnrichAndSign}
              disabled={enriching}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
              {enriching ? 'Preparing...' : 'Sign & Print'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}