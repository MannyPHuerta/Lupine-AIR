import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Wand2, Save, Printer, Send, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RFQComplianceMatrix from '@/components/rfq/RFQComplianceMatrix';
import RFQLineItems from '@/components/rfq/RFQLineItems';
import RFQPrintExport from '@/components/rfq/RFQPrintExport';

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
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('intake');
  const [showPrint, setShowPrint] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    // Load company settings for use in AI prompt
    base44.entities.CompanySettings.list().then(results => {
      if (results[0]) setCompanySettings(results[0]);
    });
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      base44.entities.RFQRecord.filter({ id }).then(results => {
        if (results[0]) setRfq(results[0]);
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

  const handleAnalyze = async () => {
    if (!rfq.rawRfqText && !rfq.uploadedFileUrl) { alert('Please upload a file or paste RFQ text first.'); return; }

    // Ensure company settings are loaded before analyzing
    let settings = companySettings;
    if (!settings) {
      const results = await base44.entities.CompanySettings.list();
      settings = results[0] || null;
      if (settings) setCompanySettings(settings);
    }

    setAnalyzing(true);
    update('status', 'analyzing');
    try {
      const res = await base44.functions.invoke('analyzeRFQ', {
        rfqText: rfq.rawRfqText || null,
        fileUrl: rfq.uploadedFileUrl || null,
        issuingOrg: rfq.issuingOrg || null,
        rfqId: isNew ? null : id,
        companyInfo: settings ? {
          name: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          licenseNumber: settings.licenseNumber,
          insuranceInfo: settings.insuranceInfo,
        } : null,
      });

      const a = res.data.analysis;
      const updatedRfq = {
        ...rfq,
        issuingOrg: a.issuingOrg || rfq.issuingOrg,
        rfqNumber: a.rfqNumber || rfq.rfqNumber,
        title: a.title || rfq.title,
        orgType: a.orgType || rfq.orgType,
        dueDate: a.dueDate || rfq.dueDate,
        dueTime: a.dueTime || rfq.dueTime,
        submissionMethod: a.submissionMethod || rfq.submissionMethod,
        submissionAddress: a.submissionAddress || rfq.submissionAddress,
        contactName: a.contactName || rfq.contactName,
        contactEmail: a.contactEmail || rfq.contactEmail,
        contactPhone: a.contactPhone || rfq.contactPhone,
        suggestedFileName: a.suggestedFileName || rfq.suggestedFileName,
        aiAnalysisSummary: a.aiAnalysisSummary || '',
        orgHistorySummary: a.orgHistorySummary || '',
        suggestedResponseFormat: a.suggestedResponseFormat || '',
        extractedRequirements: a.extractedRequirements || [],
        complianceMatrix: a.complianceMatrix || [],
        proposedLineItems: a.proposedLineItems || [],
        estimatedTotalValue: a.estimatedTotalValue || 0,
        responseNarrative: a.responseNarrative || '',
        status: 'draft',
      };

      // Update state and auto-save
      setRfq(updatedRfq);
      if (isNew) {
        const created = await base44.entities.RFQRecord.create(updatedRfq);
        // Set rfq with the created id so useEffect reload doesn't wipe data
        setRfq({ ...updatedRfq, id: created.id });
        navigate(`/rfq/${created.id}`, { replace: true });
      } else {
        await base44.entities.RFQRecord.update(id, updatedRfq);
      }
      setActiveTab('compliance');
    } catch (err) {
      alert('Analysis failed: ' + err.message);
      update('status', 'received');
    }
    setAnalyzing(false);
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
    if (!isNew) await base44.entities.RFQRecord.delete(id);
    navigate('/rfq', { replace: true });
  };

  const handleClearAnalysis = () => {
    if (!window.confirm('Clear all AI analysis, requirements, compliance matrix, and line items?')) return;
    setRfq(prev => ({
      ...prev,
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
    }));
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

  const tabs = [
    { id: 'intake', label: 'Intake' },
    { id: 'analysis', label: 'AI Analysis', badge: rfq.aiAnalysisSummary ? '✓' : null },
    { id: 'compliance', label: 'Compliance Matrix', badge: rfq.complianceMatrix?.length || null },
    { id: 'lineitems', label: 'Line Items', badge: rfq.proposedLineItems?.length || null },
    { id: 'response', label: 'Response Draft' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-900 text-white sticky top-0 z-10 shadow-lg">
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
              onClick={() => setActiveTab(t.id)}
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

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* INTAKE TAB */}
        {activeTab === 'intake' && (
          <div className="space-y-6">

            {/* STEP 1: Upload / Paste */}
            <div className="bg-white rounded-lg border-2 border-green-200 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <span className="bg-green-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">1</span>
                <span className="font-semibold text-gray-900">Upload or Paste RFQ Document</span>
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
                    <div className="flex items-center gap-3 mt-1">
                      <a href={rfq.uploadedFileUrl} target="_blank" rel="noreferrer" className="text-xs text-green-700 underline">
                        ✓ File uploaded — view it
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

              <Button
                onClick={handleAnalyze}
                disabled={analyzing || (!rfq.rawRfqText && !rfq.uploadedFileUrl)}
                className="w-full bg-green-700 hover:bg-green-800 text-white text-base py-5"
              >
                {analyzing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing RFQ — extracting all fields, building compliance matrix...</>
                ) : (
                  <><Wand2 className="w-5 h-5 mr-2" /> Analyze with AI &amp; Auto-Fill All Fields</>
                )}
              </Button>
              {analyzing && (
                <p className="text-xs text-gray-500 text-center">
                  Extracting org name, RFQ number, due dates, contacts, requirements, compliance matrix, line items, and drafting response...
                </p>
              )}
            </div>

            {/* STEP 2: Review / Edit extracted fields — always visible for corrections */}
            <div className={`space-y-4 transition-opacity ${analyzing ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="bg-gray-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">2</span>
                <span className="font-semibold text-gray-700 text-sm">Review &amp; Correct Extracted Fields</span>
                {rfq.aiAnalysisSummary && (
                  <>
                    <span className="text-xs text-green-600 font-medium">✓ AI-filled</span>
                    <button onClick={handleClearAnalysis} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5 ml-1">
                      <X className="w-3 h-3" /> Clear analysis
                    </button>
                  </>
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
            {!rfq.aiAnalysisSummary ? (
              <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
                <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div>Run AI analysis on the Intake tab first</div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* COMPLIANCE MATRIX TAB */}
        {activeTab === 'compliance' && (
          <RFQComplianceMatrix
            matrix={rfq.complianceMatrix}
            onChange={m => update('complianceMatrix', m)}
          />
        )}

        {/* LINE ITEMS TAB */}
        {activeTab === 'lineitems' && (
          <RFQLineItems
            items={rfq.proposedLineItems}
            onChange={items => {
              const total = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
              update('proposedLineItems', items);
              update('estimatedTotalValue', total);
            }}
            totalValue={rfq.estimatedTotalValue}
          />
        )}

        {/* RESPONSE DRAFT TAB */}
        {activeTab === 'response' && (
          <div className="space-y-4">
            <Section title="Response Narrative / Cover Letter">
              <textarea
                value={rfq.responseNarrative}
                onChange={e => update('responseNarrative', e.target.value)}
                className="w-full border rounded-md p-3 text-sm min-h-96 resize-y font-mono focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="AI-generated response will appear here after analysis. You can edit freely."
              />
            </Section>
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