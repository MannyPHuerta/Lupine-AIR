import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Wand2, Save, Printer, Send, Loader2, Trash2, X, Eye, Pencil, Copy, ChevronRight, CheckCircle2, Circle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import RFQComplianceMatrix from '@/components/rfq/RFQComplianceMatrix';
import RFQLineItems from '@/components/rfq/RFQLineItems';
import RFQPrintExport from '@/components/rfq/RFQPrintExport';

// Print stylesheet
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      body { margin: 0; padding: 0; background: white; }
      /* Hide sticky header only */
      [class*="sticky"][class*="top-0"] { display: none !important; }
      /* Hide buttons */
      button, [role="button"], .print-hidden { display: none !important; }
      /* Show content full width with clean spacing */
      .max-w-7xl { max-width: 100%; padding: 0.5in; background: white; }
      .min-h-screen { min-height: auto; }
      .rounded-lg { border-radius: 0; }
      .border { border: none; }
      .bg-gray-50, .bg-green-900 { background: white !important; }
    }
  `;
  document.head.appendChild(style);
}

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

const BLANK_RFQ = {
  issuingOrg: '', rfqNumber: '', title: '', orgType: 'municipal',
  source: 'email', receivedDate: new Date().toISOString().split('T')[0],
  dueDate: '', dueTime: '', submissionMethod: 'email', submissionAddress: '',
  contactName: '', contactEmail: '', contactPhone: '', branch: '',
  status: 'received', rawRfqText: '', uploadedFileUrl: '', uploadedFileName: '',
  extractedRequirements: [], complianceMatrix: [], proposedLineItems: [],
  estimatedTotalValue: 0, aiAnalysisSummary: '', orgHistorySummary: '',
  suggestedResponseFormat: '', responseNarrative: '', internalNotes: '',
  suggestedFileName: '',
};

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [rfq, setRfq] = useState(BLANK_RFQ);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [stepRunning, setStepRunning] = useState(null); // null | 1 | 2 | 3 | 4 | 'all'
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('intake');
  const [showPrint, setShowPrint] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);
  // Track the live record ID separately so steps 2-4 always have it even after ensureSaved navigates
  const [recordId, setRecordId] = useState(isNew ? null : id);

  useEffect(() => {
    // Load company settings for use in AI prompt
    base44.entities.CompanySettings.list().then(results => {
      if (results[0]) setCompanySettings(results[0]);
    });
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      setRecordId(id);
      base44.entities.RFQRecord.list('-created_date', 500).then(all => {
        const found = all.find(r => r.id === id);
        if (found) setRfq(found);
        setLoading(false);
      });
    }
  }, [id]);

  const update = (field, value) => setRfq(prev => ({ ...prev, [field]: value }));

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update('uploadedFileUrl', file_url);
    update('uploadedFileName', file.name);
    setUploading(false);
  };

  const getCompanyInfo = async () => {
    let settings = companySettings;
    if (!settings) {
      const results = await base44.entities.CompanySettings.list();
      settings = results[0] || null;
      if (settings) setCompanySettings(settings);
    }
    return settings ? {
      name: settings.companyName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      licenseNumber: settings.licenseNumber,
      insuranceInfo: settings.insuranceInfo,
    } : null;
  };

  const ensureSaved = async () => {
    if (!recordId) {
      const created = await base44.entities.RFQRecord.create({ ...rfq, status: 'analyzing' });
      setRfq(prev => ({ ...prev, id: created.id, status: 'analyzing' }));
      setRecordId(created.id);
      navigate(`/rfq/${created.id}`, { replace: true });
      return created.id;
    }
    return recordId;
  };

  const reloadRfq = async (recordId) => {
    const all = await base44.entities.RFQRecord.list('-created_date', 500);
    const found = all.find(r => r.id === recordId);
    if (found) setRfq(found);
  };

  const handleStep1 = async () => {
    if (!rfq.rawRfqText && !rfq.uploadedFileUrl) { alert('Please upload a file or paste RFQ text first.'); return; }
    const companyInfo = await getCompanyInfo();
    setStepRunning(1);
    try {
      const recordId = await ensureSaved();
      const result = await base44.functions.invoke('rfqStep1Analyze', {
        rfqText: rfq.rawRfqText || null,
        fileUrl: rfq.uploadedFileUrl || null,
        rfqId: recordId,
        companyInfo,
      });
      if (result.data?.error) throw new Error(result.data.error);
      await reloadRfq(recordId);
      setActiveTab('analysis');
    } catch (err) {
      alert('Step 1 failed: ' + err.message);
    } finally {
      setStepRunning(null);
    }
  };

  const handleStep2 = async () => {
    const rid = await ensureSaved();
    setStepRunning(2);
    try {
      const result = await base44.functions.invoke('rfqStep2Compliance', { rfqId: rid });
      if (result.data?.error) throw new Error(result.data.error);
      await reloadRfq(rid);
      setActiveTab('compliance');
    } catch (err) {
      alert('Step 2 failed: ' + err.message);
    } finally {
      setStepRunning(null);
    }
  };

  const handleStep3 = async () => {
    const rid = await ensureSaved();
    setStepRunning(3);
    try {
      const result = await base44.functions.invoke('rfqStep3LineItems', { rfqId: rid });
      if (result.data?.error) throw new Error(result.data.error);
      await reloadRfq(rid);
      setActiveTab('lineitems');
    } catch (err) {
      alert('Step 3 failed: ' + err.message);
    } finally {
      setStepRunning(null);
    }
  };

  const handleStep4 = async (manualMode = false) => {
    const companyInfo = await getCompanyInfo();
    const rid = await ensureSaved();
    setStepRunning(4);
    try {
      const result = await base44.functions.invoke('rfqStep4Response', { rfqId: rid, companyInfo, manualMode });
      if (result.data?.error) throw new Error(result.data.error);
      await reloadRfq(rid);
      setActiveTab('response');
    } catch (err) {
      alert('Step 4 failed: ' + err.message);
    } finally {
      setStepRunning(null);
    }
  };

  const handleToggleTemplate = async () => {
    if (!recordId) return;
    const newValue = !rfq.isTemplate;
    setRfq(prev => ({ ...prev, isTemplate: newValue }));
    await base44.entities.RFQRecord.update(recordId, { isTemplate: newValue });
  };

  const handleRunAll = async () => {
    if (!rfq.rawRfqText && !rfq.uploadedFileUrl) { alert('Please upload a file or paste RFQ text first.'); return; }
    const companyInfo = await getCompanyInfo();
    setStepRunning('all');
    try {
      const recordId = await ensureSaved();
      // Step 1
      const r1 = await base44.functions.invoke('rfqStep1Analyze', { rfqText: rfq.rawRfqText || null, fileUrl: rfq.uploadedFileUrl || null, rfqId: recordId, companyInfo });
      if (r1.data?.error) throw new Error('Step 1: ' + r1.data.error);
      await reloadRfq(recordId);
      // Step 2
      const r2 = await base44.functions.invoke('rfqStep2Compliance', { rfqId: recordId });
      if (r2.data?.error) throw new Error('Step 2: ' + r2.data.error);
      await reloadRfq(recordId);
      // Step 3
      const r3 = await base44.functions.invoke('rfqStep3LineItems', { rfqId: recordId });
      if (r3.data?.error) throw new Error('Step 3: ' + r3.data.error);
      await reloadRfq(recordId);
      // Step 4
      const r4 = await base44.functions.invoke('rfqStep4Response', { rfqId: recordId, companyInfo });
      if (r4.data?.error) throw new Error('Step 4: ' + r4.data.error);
      await reloadRfq(recordId);
      setActiveTab('response');
    } catch (err) {
      alert('Auto-run failed: ' + err.message);
    } finally {
      setStepRunning(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (isNew) {
      const created = await base44.entities.RFQRecord.create(rfq);
      navigate(`/rfq/${created.id}`, { replace: true });
    } else {
      await base44.entities.RFQRecord.update(id, rfq);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this RFQ permanently? This cannot be undone.')) return;
    if (!isNew) {
      try { await base44.entities.RFQRecord.delete(id); } catch (_) {}
    }
    navigate('/rfq', { replace: true });
  };

  const handleClearAnalysis = async () => {
    if (!window.confirm('Clear all AI analysis, requirements, compliance matrix, and line items?')) return;
    const cleared = {
      aiAnalysisSummary: '',
      orgHistorySummary: '',
      suggestedResponseFormat: '',
      extractedRequirements: [],
      complianceMatrix: [],
      proposedLineItems: [],
      estimatedTotalValue: 0,
      responseNarrative: '',
      suggestedFileName: '',
      status: 'received',
    };
    setRfq(prev => ({ ...prev, ...cleared }));
    if (recordId) {
      await base44.entities.RFQRecord.update(recordId, cleared);
    }
  };

  const handleClearFile = () => {
    setRfq(prev => ({ ...prev, uploadedFileUrl: '', uploadedFileName: '', rawRfqText: '' }));
  };

  const handleSend = async () => {
    if (!rfq.contactEmail) { alert('No contact email found. Please fill in the contact email.'); return; }
    setSaving(true);
    await base44.integrations.Core.SendEmail({
      to: rfq.contactEmail,
      subject: `RFQ Response — ${rfq.rfqNumber || rfq.title || rfq.issuingOrg}`,
      body: rfq.responseNarrative,
    });
    update('status', 'submitted');
    update('submittedAt', new Date().toISOString());
    await base44.entities.RFQRecord.update(id, { ...rfq, status: 'submitted', submittedAt: new Date().toISOString() });
    setSaving(false);
    alert('Response sent!');
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  const step1Done = !!rfq.aiAnalysisSummary;
  const step2Done = (rfq.complianceMatrix?.length || 0) > 0;
  const step3Done = (rfq.proposedLineItems?.length || 0) > 0;
  const step4Done = !!rfq.responseNarrative;

  const tabs = [
    { id: 'intake', label: '1. Intake' },
    { id: 'analysis', label: '2. Analysis', badge: step1Done ? '✓' : null },
    { id: 'compliance', label: '3. Compliance', badge: step2Done ? rfq.complianceMatrix.length : null },
    { id: 'lineitems', label: '4. Line Items', badge: step3Done ? rfq.proposedLineItems.length : null },
    { id: 'response', label: '5. Response', badge: step4Done ? '✓' : null },
    { id: 'outcome', label: '6. Outcome', badge: rfq.status === 'won' ? '🏆' : rfq.status === 'lost' ? '✗' : null },
  ];

  const handleTabChange = async (tabId) => {
    // Auto-save on tab switch if record exists
    if (!isNew && !saving) {
      base44.entities.RFQRecord.update(id, rfq).catch(() => {});
    }
    setActiveTab(tabId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-900 text-white sticky top-0 z-10 shadow-lg print-hidden">
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button onClick={() => navigate('/rfq')} className="p-2 rounded-lg hover:bg-green-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">
              {rfq.issuingOrg || 'New RFQ'}{rfq.rfqNumber ? ` — ${rfq.rfqNumber}` : ''}
            </div>
            {rfq.suggestedFileName && (
              <div className="text-green-300 text-xs font-mono truncate">{rfq.suggestedFileName}</div>
            )}
          </div>
          <StatusBadge status={rfq.status} onChange={v => update('status', v)} />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" variant="outline" className="border-green-600 text-white hover:bg-green-800">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
            <Button onClick={() => setShowPrint(true)} size="sm" variant="outline" className="border-green-600 text-white hover:bg-green-800">
              <Printer className="w-4 h-4" />
            </Button>
            {!isNew && rfq.contactEmail && (
              <Button onClick={handleSend} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-1" /> Send
              </Button>
            )}
            <Button onClick={handleDelete} size="sm" variant="outline" className="border-red-500 text-red-300 hover:bg-red-900 hover:text-white">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-green-800 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition flex items-center gap-1 ${
                activeTab === t.id ? 'bg-green-800 text-white border-b-2 border-white' : 'text-green-300 hover:text-white'
              }`}
            >
              {t.label}
              {t.badge && <span className="ml-1 text-xs bg-green-700 px-1.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 print-container">

        {/* INTAKE TAB */}
        {activeTab === 'intake' && (
          <div className="space-y-6">

            {/* Section 1: Upload / Paste — always visible */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-5 space-y-4">
              <div className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-500" /> Step 1 — Load RFQ Document
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Upload File (PDF, image, Word)</label>
                  <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-5 hover:border-green-500 transition">
                    <Upload className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">
                      {uploading ? 'Uploading...' : rfq.uploadedFileName || 'Click to upload RFQ document'}
                    </span>
                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileUpload} />
                  </label>
                  {rfq.uploadedFileUrl && (
                    <div className="flex items-center gap-3 mt-2">
                      <a href={rfq.uploadedFileUrl} target="_blank" rel="noreferrer" className="text-xs text-green-700 underline font-medium">
                        ✓ {rfq.uploadedFileName || 'File uploaded'} — view
                      </a>
                      <button onClick={handleClearFile} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5">
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">— or paste RFQ text directly</label>
                  <textarea
                    value={rfq.rawRfqText}
                    onChange={e => update('rawRfqText', e.target.value)}
                    className="w-full border rounded-md p-2 text-sm h-28 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Paste the full RFQ text here..."
                  />
                </div>
              </div>

              {/* Inline text preview if pasted */}
              {rfq.rawRfqText && !rfq.uploadedFileUrl && (
                <div className="border rounded-md bg-gray-50 p-3 max-h-48 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-1">Document preview ({rfq.rawRfqText.length.toLocaleString()} chars)</div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{rfq.rawRfqText.slice(0, 2000)}{rfq.rawRfqText.length > 2000 ? '\n\n[... truncated for preview ...]' : ''}</pre>
                </div>
              )}

              {/* Uploaded file preview */}
              {rfq.uploadedFileUrl && (
                <div className="border rounded-md overflow-hidden" style={{ height: '400px' }}>
                  <iframe
                    src={rfq.uploadedFileUrl}
                    className="w-full h-full"
                    title="RFQ Document Preview"
                  />
                </div>
              )}
            </div>

            {/* Section 2: Run Analysis — separate card */}
            <div className="bg-white rounded-lg border-2 border-green-200 p-5 space-y-4">
              <div className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-green-700" /> Step 2 — Run AI Analysis
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Button
                  onClick={handleStep1}
                  disabled={stepRunning !== null || (!rfq.rawRfqText && !rfq.uploadedFileUrl)}
                  className="w-full bg-green-700 hover:bg-green-800 text-white text-base py-5"
                >
                  {stepRunning === 1 ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Wand2 className="w-5 h-5 mr-2" /> Run Analysis</>
                  )}
                </Button>
                <Button
                  onClick={handleRunAll}
                  disabled={stepRunning !== null || (!rfq.rawRfqText && !rfq.uploadedFileUrl)}
                  className="w-full bg-indigo-700 hover:bg-indigo-800 text-white text-base py-5"
                >
                  {stepRunning === 'all' ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Running all steps — please wait (~2 min)...</>
                  ) : (
                    <><Wand2 className="w-5 h-5 mr-2" /> Run All Steps → Go to Response</>
                  )}
                </Button>
              </div>
              {stepRunning === 1 && (
                <p className="text-xs text-gray-500 text-center">Extracting org name, RFQ number, due dates, contacts, and writing strategic analysis summary (~15–20 seconds)...</p>
              )}
              {stepRunning === 'all' && (
                <p className="text-xs text-indigo-600 text-center">Running all 4 steps sequentially. This takes ~2 minutes. You'll land on the Response tab when done.</p>
              )}
              {step1Done && stepRunning === null && (
                <p className="text-xs text-green-600 text-center font-medium">✓ Analysis complete — review the Analysis tab (Tab 2), then run Compliance from there.</p>
              )}
            </div>

            {/* Review / Edit extracted fields — always visible for corrections */}
            <div className={`space-y-4 transition-opacity ${stepRunning === 1 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="font-semibold text-gray-700 text-sm">Review &amp; Correct Extracted Fields</span>
                {rfq.aiAnalysisSummary && (
                  <span className="text-xs text-green-600 font-medium">✓ AI-filled</span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: RFQ metadata */}
                <div className="bg-white rounded-lg border p-5 space-y-4">
                  <div className="font-semibold text-gray-900 border-b pb-2 text-sm">RFQ Information</div>
                  <Field label="Issuing Organization" value={rfq.issuingOrg} onChange={v => update('issuingOrg', v)} placeholder="e.g. City of McAllen, Texas DOT" />
                  <Field label="RFQ / IFB / ITB Number" value={rfq.rfqNumber} onChange={v => update('rfqNumber', v)} placeholder="e.g. RFQ-2026-COA-4421" />
                  <Field label="Title" value={rfq.title} onChange={v => update('title', v)} placeholder="Official RFQ title" />
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Org Type" value={rfq.orgType} onChange={v => update('orgType', v)}
                      options={['municipal','county','state','federal','private','nonprofit','other']} />
                    <SelectField label="Source" value={rfq.source} onChange={v => update('source', v)}
                      options={['email','mail','web','phone','event_planner','other']} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Received Date" type="date" value={rfq.receivedDate} onChange={v => update('receivedDate', v)} />
                    <Field label="Due Date" type="date" value={rfq.dueDate} onChange={v => update('dueDate', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Due Time" value={rfq.dueTime} onChange={v => update('dueTime', v)} placeholder="e.g. 2:00 PM CST" />
                    <SelectField label="Branch" value={rfq.branch} onChange={v => update('branch', v)} options={BRANCHES} />
                  </div>
                </div>

                {/* Right: Contact & submission */}
                <div className="bg-white rounded-lg border p-5 space-y-4">
                  <div className="font-semibold text-gray-900 border-b pb-2 text-sm">Contact &amp; Submission</div>
                  <Field label="Contact Name" value={rfq.contactName} onChange={v => update('contactName', v)} />
                  <Field label="Contact Email" value={rfq.contactEmail} onChange={v => update('contactEmail', v)} />
                  <Field label="Contact Phone" value={rfq.contactPhone} onChange={v => update('contactPhone', v)} />
                  <SelectField label="Submission Method" value={rfq.submissionMethod} onChange={v => update('submissionMethod', v)}
                    options={['email','mail','portal','hand_delivery','fax']} />
                  <Field label="Submission Address / Portal URL" value={rfq.submissionAddress} onChange={v => update('submissionAddress', v)} />
                  <Field label="Internal Notes" value={rfq.internalNotes} onChange={v => update('internalNotes', v)} multiline />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {!rfq.aiAnalysisSummary && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
                <Wand2 className="w-4 h-4 flex-shrink-0" /> Upload or paste an RFQ on the Intake tab (Tab 1) and click "Analyze &amp; Extract" to populate this.
              </div>
            )}
            <Section title="AI Analysis Summary">
              <EditableText value={rfq.aiAnalysisSummary} onChange={v => update('aiAnalysisSummary', v)} />
            </Section>
            <Section title="Organization History & Intelligence">
              <EditableText value={rfq.orgHistorySummary} onChange={v => update('orgHistorySummary', v)} />
            </Section>
            <Section title="Suggested Response Format & Structure">
              <EditableText value={rfq.suggestedResponseFormat} onChange={v => update('suggestedResponseFormat', v)} />
            </Section>
            {rfq.suggestedFileName && (
              <Section title="Suggested File Name">
                <Input value={rfq.suggestedFileName} onChange={e => update('suggestedFileName', e.target.value)} className="font-mono text-sm" />
              </Section>
            )}
            {step1Done && (
              <div className="flex justify-end">
                <Button onClick={() => handleTabChange('compliance')} className="bg-green-700 hover:bg-green-800 text-white gap-2">
                  Go to Tab 3: Compliance <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* COMPLIANCE MATRIX TAB */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            {!step2Done ? (
              <StepCTA
                label="Build Compliance Matrix"
                description="AI will extract every requirement from the RFQ and map our compliance status."
                done={false}
                running={stepRunning === 2}
                disabled={!step1Done}
                disabledMessage="Run Analysis on Tab 2 first."
                onClick={handleStep2}
              />
            ) : (
              <>
                <RFQComplianceMatrix
                  matrix={rfq.complianceMatrix}
                  onChange={m => update('complianceMatrix', m)}
                />
                <StepCTA
                  label="Generate Pricing / Line Items"
                  description="AI will generate a complete pricing schedule based on the requirements above."
                  done={step3Done}
                  doneLabel={`${rfq.proposedLineItems?.length} line items generated (Est. $${(rfq.estimatedTotalValue||0).toLocaleString()}) — go to Tab 4: Line Items to review.`}
                  running={stepRunning === 3}
                  disabled={false}
                  onClick={handleStep3}
                />
              </>
            )}
          </div>
        )}

        {/* LINE ITEMS TAB */}
        {activeTab === 'lineitems' && (
          <div className="space-y-4">
            {step3Done && (
              <div className="flex justify-end">
                <Button
                  onClick={handleStep3}
                  disabled={stepRunning !== null}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {stepRunning === 3 ? <><Loader2 className="w-4 h-4 animate-spin" /> Re-running...</> : <><Wand2 className="w-4 h-4" /> Re-run Line Items</>}
                </Button>
              </div>
            )}
            {step3Done ? (
              <RFQLineItems
                items={rfq.proposedLineItems}
                onChange={items => {
                  const total = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
                  update('proposedLineItems', items);
                  update('estimatedTotalValue', total);
                }}
                totalValue={rfq.estimatedTotalValue}
              />
            ) : (
              <div className="bg-white rounded-lg border p-6 text-center text-gray-400 text-sm">
                Line items not yet generated. Go to Tab 3 (Compliance) and run "Step 4: Generate Pricing / Line Items".
              </div>
            )}
            <StepCTA
              label="Step 5: Draft Response Narrative"
              description="AI will write the complete formal bid response document using your pricing above. Review and adjust line items first, then click to draft."
              done={step4Done}
              doneLabel="Response draft ready — go to Tab 5: Response to review and edit."
              running={stepRunning === 4}
              disabled={!step3Done}
              onClick={handleStep4}
            />
          </div>
        )}

        {/* RESPONSE DRAFT TAB */}
        {activeTab === 'response' && (
          <div className="space-y-4">
            {/* Mode selector — if no response yet */}
            {!rfq.responseNarrative && !rfq.manualResponseMode && (
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 space-y-4">
                <div className="font-semibold text-gray-900 border-b pb-2">Step 5 — Choose Response Method</div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleStep4(false)}
                    disabled={stepRunning !== null || !step3Done}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white text-base py-5"
                  >
                    {stepRunning === 4 ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> AI Draft...</>
                    ) : (
                      <><Wand2 className="w-5 h-5 mr-2" /> AI-Generated Response</>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleStep4(true)}
                    disabled={stepRunning !== null || !step3Done}
                    variant="outline"
                    className="w-full text-base py-5 border-2"
                  >
                    <Pencil className="w-5 h-5 mr-2" /> Manual / Your Own
                  </Button>
                </div>
                {!step3Done && (
                  <p className="text-xs text-gray-500 text-center">Complete Step 4 (Line Items) first.</p>
                )}
              </div>
            )}

            {/* Response editor + controls */}
            {(rfq.responseNarrative || rfq.manualResponseMode) && (
              <div className="flex justify-end gap-2 print-hidden">
                {!rfq.manualResponseMode && (
                  <Button
                    onClick={() => handleStep4(false)}
                    disabled={stepRunning !== null}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    {stepRunning === 4 ? <><Loader2 className="w-4 h-4 animate-spin" /> Re-running...</> : <><Wand2 className="w-4 h-4" /> Rerun Response</>}
                  </Button>
                )}
                <Button
                  onClick={handleToggleTemplate}
                  disabled={!recordId || !rfq.responseNarrative}
                  variant={rfq.isTemplate ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-2 ${rfq.isTemplate ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                >
                  <Star className="w-4 h-4" /> {rfq.isTemplate ? 'Template ✓' : 'Save as Template'}
                </Button>
              </div>
            )}

            <ResponseDraftTab value={rfq.responseNarrative} onChange={v => update('responseNarrative', v)} manualMode={rfq.manualResponseMode} />
          </div>
        )}

        {/* OUTCOME TAB */}
        {activeTab === 'outcome' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white rounded-lg border p-6 space-y-5">
              <div className="font-semibold text-gray-900 border-b pb-2">Bid Outcome</div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    update('status', 'won');
                    if (!isNew) await base44.entities.RFQRecord.update(id, { ...rfq, status: 'won' });
                  }}
                  className={`py-6 rounded-xl border-2 font-bold text-lg transition flex flex-col items-center gap-2 ${
                    rfq.status === 'won'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300 text-gray-500'
                  }`}
                >
                  🏆 <span>WON</span>
                </button>
                <button
                  onClick={async () => {
                    update('status', 'lost');
                    if (!isNew) await base44.entities.RFQRecord.update(id, { ...rfq, status: 'lost' });
                  }}
                  className={`py-6 rounded-xl border-2 font-bold text-lg transition flex flex-col items-center gap-2 ${
                    rfq.status === 'lost'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-red-300 text-gray-500'
                  }`}
                >
                  ✗ <span>LOST</span>
                </button>
              </div>

              {rfq.status === 'won' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Awarded Contract Value ($)</label>
                  <input
                    type="number"
                    value={rfq.awardedValue || ''}
                    onChange={e => update('awardedValue', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Actual awarded amount"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Outcome Notes (win/loss reason, competitor info)</label>
                <textarea
                  value={rfq.outcome || ''}
                  onChange={e => update('outcome', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="Why did we win or lose? Who was the competitor? What would we do differently?"
                />
              </div>

              <button
                onClick={async () => {
                  setSaving(true);
                  await base44.entities.RFQRecord.update(id, rfq);
                  setSaving(false);
                }}
                disabled={saving || isNew}
                className="w-full bg-green-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Outcome'}
              </button>
            </div>

            {/* Quick stats */}
            {rfq.estimatedTotalValue > 0 && (
              <div className="bg-white rounded-lg border p-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500">Estimated Bid Value</div>
                  <div className="text-xl font-bold text-gray-800">${rfq.estimatedTotalValue?.toLocaleString()}</div>
                </div>
                {rfq.awardedValue > 0 && (
                  <div>
                    <div className="text-xs text-gray-500">Awarded Value</div>
                    <div className="text-xl font-bold text-green-700">${rfq.awardedValue?.toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showPrint && (
        <RFQPrintExport rfq={rfq} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}


// --- Helper subcomponents ---

function Field({ label, value, onChange, placeholder, type = 'text', multiline }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border rounded-md px-3 py-1.5 text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-green-500" />
      ) : (
        <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg border p-5 space-y-3">
      <div className="font-semibold text-gray-900 border-b pb-2">{title}</div>
      {children}
    </div>
  );
}

function EditableText({ value, onChange }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border rounded-md p-3 text-sm min-h-32 resize-y focus:outline-none focus:ring-1 focus:ring-green-500"
    />
  );
}

function ResponseDraftTab({ value, onChange, manualMode }) {
  const [editing, setEditing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value || '');
  };

  if (!value && manualMode) {
    return (
      <div className="bg-white rounded-lg border p-8">
        <div className="text-sm font-semibold text-gray-700 mb-3">Manual Response Entry</div>
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full border rounded-md p-4 text-sm min-h-[600px] resize-y font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="Paste or write your RFQ response here. You have full control of the format and content."
        />
      </div>
    );
  }

  if (!value) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <div className="text-sm">No response draft yet.</div>
        <div className="text-xs mt-1 text-gray-400">Use "Run All Steps" on the Intake tab, or work through Steps 1–4 individually.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border print-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-gray-50 rounded-t-lg print-hidden">
        <span className="text-sm font-semibold text-gray-700">Response Narrative / Cover Letter</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 text-xs">
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button
            size="sm"
            variant={editing ? 'default' : 'outline'}
            onClick={() => setEditing(e => !e)}
            className="gap-1 text-xs"
          >
            {editing ? <><Eye className="w-3.5 h-3.5" /> Preview</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
          </Button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full p-5 text-sm min-h-[600px] resize-y font-mono focus:outline-none rounded-b-lg"
          placeholder="Response narrative will appear here after analysis..."
        />
      ) : (
        <div className="p-6 md:p-10 prose prose-sm max-w-none text-gray-900 min-h-[600px]
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2
          [&_p]:mb-3 [&_p]:leading-relaxed
          [&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc
          [&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal
          [&_strong]:font-semibold
          [&_hr]:my-6 [&_hr]:border-gray-200
          [&_blockquote]:border-l-4 [&_blockquote]:border-green-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600
        ">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function StepCTA({ label, description, done, doneLabel, running, disabled, disabledMessage, onClick }) {
  return (
    <div className={`rounded-xl border-2 p-5 ${done ? 'border-green-300 bg-green-50' : disabled ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {done
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <Circle className={`w-5 h-5 ${disabled ? 'text-gray-300' : 'text-blue-400'}`} />
          }
        </div>
        <div className="flex-1">
          {done ? (
            <div className="text-sm font-semibold text-green-700">{doneLabel}</div>
          ) : (
            <>
              <div className={`text-sm font-semibold mb-1 ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>{label}</div>
              <div className="text-xs text-gray-500 mb-3">{description}</div>
              <Button
                onClick={onClick}
                disabled={running || disabled}
                className={`gap-2 ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}
              >
                {running
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Running AI — please wait...</>
                  : <><Wand2 className="w-4 h-4" /> {label} <ChevronRight className="w-4 h-4" /></>
                }
              </Button>
              {disabled && <p className="text-xs text-gray-400 mt-2">{disabledMessage || 'Complete the previous step first to enable this.'}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, onChange }) {
  const statuses = ['received','analyzing','draft','review','submitted','won','lost','no_bid'];
  return (
    <select
      value={status}
      onChange={e => onChange(e.target.value)}
      className="h-8 border-0 rounded px-2 bg-green-800 text-white text-xs font-medium"
    >
      {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
    </select>
  );
}