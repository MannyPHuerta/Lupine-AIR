import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const DEFAULT_AGREEMENT = `EQUIPMENT RENTAL AGREEMENT

This Equipment Rental Agreement ("Agreement") is entered into between Rental World LLC ("Company") and the Customer named on the invoice ("Renter").

TERMS & CONDITIONS

1. EQUIPMENT CONDITION & INSPECTION
The Renter acknowledges receipt of the equipment listed on the attached invoice in the condition described. The equipment has been inspected and accepted by the Renter. The Renter is responsible for the safekeeping and proper operation of the equipment during the rental period.

2. LIABILITY & DAMAGE
The Renter assumes full responsibility for any damage, loss, or theft of the equipment while in the Renter's possession, including:
- Damage from misuse, negligence, or improper operation
- Damage from weather, fire, or natural disasters
- Mechanical failure due to lack of maintenance
- Normal wear and tear beyond reasonable use

The Renter shall pay for all repairs or replacement costs at the Company's standard rates plus 20% service charge.

3. RENTAL PERIOD & LATE RETURNS
The equipment must be returned by the date and time specified on the invoice. Late returns will be charged:
- First 4 hours: 50% of daily rental rate
- 5–24 hours: Full daily rental rate
- Each additional day: Full daily rental rate plus 20% late fee

4. FUEL & MAINTENANCE
The Renter shall:
- Return equipment with a full fuel tank (or at current market rate + 20% markup)
- Keep equipment clean and free of debris
- Perform routine maintenance per manufacturer guidelines
- Report any mechanical issues to the Company immediately

5. DEPOSIT
A security deposit equal to the equipment's depreciated value has been collected. The deposit will be refunded within 5 business days of equipment return and inspection, less any damage charges or fuel costs.

6. INSURANCE
The Renter is responsible for insuring the equipment. The Company is not liable for any damage to third-party property caused by the Renter's use of the equipment.

7. TERMINATION
The Company reserves the right to terminate this Agreement and retrieve the equipment at any time if:
- Rental payments are not made as agreed
- Equipment is being operated in violation of this Agreement
- Equipment is being transported without authorization

8. ACKNOWLEDGMENT
By signing below, the Renter acknowledges having read, understood, and agreed to all terms and conditions of this Agreement.`;

export default function RentalAgreementManager() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState('01 McAllen');
  const [agreements, setAgreements] = useState({});
  const [title, setTitle] = useState('Equipment Rental Agreement');
  const [content, setContent] = useState(DEFAULT_AGREEMENT);
  const [pages, setPages] = useState(1);
  const [requiresInitials, setRequiresInitials] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.RentalAgreement.list().then(data => {
      const map = {};
      data.forEach(a => { map[a.branch] = a; });
      setAgreements(map);
      if (map[branch]) {
        setTitle(map[branch].title || 'Equipment Rental Agreement');
        setContent(map[branch].content || DEFAULT_AGREEMENT);
        setPages(map[branch].pages || 1);
        setRequiresInitials(map[branch].requiresInitials !== false);
      } else {
        setTitle('Equipment Rental Agreement');
        setContent(DEFAULT_AGREEMENT);
        setPages(1);
        setRequiresInitials(true);
      }
      setLoading(false);
    });
  }, []);

  const handleBranchChange = (newBranch) => {
    setBranch(newBranch);
    if (agreements[newBranch]) {
      setTitle(agreements[newBranch].title || 'Equipment Rental Agreement');
      setContent(agreements[newBranch].content || DEFAULT_AGREEMENT);
      setPages(agreements[newBranch].pages || 1);
      setRequiresInitials(agreements[newBranch].requiresInitials !== false);
    } else {
      setTitle('Equipment Rental Agreement');
      setContent(DEFAULT_AGREEMENT);
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
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Agreement Text</label>
            <button
              onClick={() => setContent(DEFAULT_AGREEMENT)}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Reset to Default
            </button>
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

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Agreement
          </Button>
        </div>
      </div>
    </div>
  );
}