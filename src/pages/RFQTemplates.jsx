import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Wand2, Star, Trash2, Loader2, Plus,
  FileText, Copy, Eye, X, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';

export default function RFQTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);

  // Upload-and-polish state
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [orgType, setOrgType] = useState('municipal');
  const [polishedResult, setPolishedResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.RFQRecord.list('-created_date', 500);
    setTemplates(all.filter(r => r.isTemplate && r.responseNarrative));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Extract text from the file
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The full text content of the RFQ response document' },
            orgName: { type: 'string', description: 'The name of the issuing organization this was responding to' },
            responseType: { type: 'string', description: 'Type of government org (municipal, county, state, federal)' },
          }
        }
      });
      if (extracted.status === 'success' && extracted.output?.text) {
        setPastedText(extracted.output.text);
        if (extracted.output.orgName && !templateName) setTemplateName(extracted.output.orgName + ' — Template');
        if (extracted.output.responseType) setOrgType(extracted.output.responseType);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handlePolish = async () => {
    if (!pastedText.trim()) { alert('Please upload a file or paste text first.'); return; }
    setPolishing(true);
    setPolishedResult(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert government bid writer. I'm going to give you a previous winning RFQ response from a heavy equipment rental company. Your job is to:

1. Generalize the response — remove any specific organization names, dates, RFQ numbers, or dollar amounts that would be specific to this particular bid
2. Replace them with clear placeholders like [ORGANIZATION_NAME], [RFQ_NUMBER], [DATE], [UNIT_PRICE], [TOTAL_PRICE] etc.
3. Preserve and strengthen the structure, tone, and winning language
4. Add clear section headers if not present
5. Make it a professional, reusable template for future ${orgType} bids

ORIGINAL RESPONSE:
${pastedText.slice(0, 8000)}

Return only the polished template text in markdown format.`,
        response_json_schema: {
          type: 'object',
          properties: {
            templateText: { type: 'string', description: 'The polished, generalized template in markdown format' },
            suggestedName: { type: 'string', description: 'A short suggested name for this template' },
            keyStrengths: { type: 'array', items: { type: 'string' }, description: 'Key strengths or winning elements preserved in this template' },
          }
        }
      });
      setPolishedResult(result);
      if (result.suggestedName && !templateName) setTemplateName(result.suggestedName);
    } catch (err) {
      alert('AI polishing failed: ' + err.message);
    }
    setPolishing(false);
  };

  const handleSaveTemplate = async () => {
    if (!polishedResult?.templateText) return;
    setSaving(true);
    const record = await base44.entities.RFQRecord.create({
      issuingOrg: templateName || 'Template',
      orgType,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      isTemplate: true,
      responseNarrative: polishedResult.templateText,
      internalNotes: `Created from uploaded response. Key strengths: ${polishedResult.keyStrengths?.join('; ') || ''}`,
    });
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
    setShowCreatePanel(false);
    setPastedText('');
    setPolishedResult(null);
    setTemplateName('');
    await load();
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete template "${t.issuingOrg}"? This cannot be undone.`)) return;
    await base44.entities.RFQRecord.update(t.id, { isTemplate: false });
    setTemplates(prev => prev.filter(x => x.id !== t.id));
    if (preview?.id === t.id) setPreview(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/rfq')} className="p-2 rounded-lg hover:bg-green-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">RFQ Response Templates</div>
            <div className="text-green-300 text-xs">Save winning responses as reusable templates</div>
          </div>
          <Button
            onClick={() => setShowCreatePanel(true)}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <Plus className="w-4 h-4" /> New Template from Response
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {savedMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Template saved successfully!
          </div>
        )}

        {/* Create from upload panel */}
        {showCreatePanel && (
          <div className="bg-white rounded-xl border-2 border-green-300 shadow-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-green-700" />
                Create Template from Previous Winning Response
              </div>
              <button onClick={() => { setShowCreatePanel(false); setPastedText(''); setPolishedResult(null); }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. City of McAllen — Winning Response" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Organization Type</label>
                <select value={orgType} onChange={e => setOrgType(e.target.value)}
                  className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                  {['municipal','county','state','federal','private','nonprofit','other'].map(o => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Upload Previous Response (PDF, Word, etc.)</label>
                <label className={`flex items-center gap-3 cursor-pointer border-2 border-dashed border-green-300 rounded-lg p-5 hover:border-green-500 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? <Loader2 className="w-5 h-5 text-green-500 animate-spin" /> : <Upload className="w-5 h-5 text-green-500" />}
                  <span className="text-sm text-gray-600">{uploading ? 'Extracting text...' : 'Click to upload your previous response'}</span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">— or paste response text directly</label>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm h-28 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="Paste your previous winning response here..."
                />
              </div>
            </div>

            {pastedText && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 border">
                {pastedText.length.toLocaleString()} characters loaded
              </div>
            )}

            <Button
              onClick={handlePolish}
              disabled={polishing || !pastedText.trim()}
              className="bg-green-700 hover:bg-green-800 text-white gap-2 w-full py-4 text-base"
            >
              {polishing
                ? <><Loader2 className="w-5 h-5 animate-spin" /> AI is polishing & generalizing (~15 seconds)...</>
                : <><Wand2 className="w-5 h-5" /> Polish into Reusable Template with AI</>
              }
            </Button>

            {polishedResult && (
              <div className="space-y-4 border-t pt-4">
                {polishedResult.keyStrengths?.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="font-semibold text-green-900 text-sm mb-2">✅ Winning elements preserved:</div>
                    <ul className="space-y-1">
                      {polishedResult.keyStrengths.map((s, i) => (
                        <li key={i} className="text-xs text-green-800 flex items-start gap-2">
                          <span className="text-green-500 flex-shrink-0">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-gray-500">Polished Template Preview</div>
                    <button onClick={() => handleCopy(polishedResult.templateText)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="prose prose-xs max-w-none text-gray-700 text-xs">
                    <ReactMarkdown>{polishedResult.templateText.slice(0, 1500)}</ReactMarkdown>
                    {polishedResult.templateText.length > 1500 && (
                      <p className="text-gray-400 italic">... (truncated for preview)</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 w-full"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  {saving ? 'Saving...' : `Save as Template — "${templateName || 'New Template'}"`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Template list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-green-700" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-30 text-green-700" />
            <div className="font-semibold text-gray-700 mb-1">No templates yet</div>
            <p className="text-sm text-gray-500 mb-4">
              Upload a previous winning response above, or mark any RFQ's response as a template from the RFQ detail page.
            </p>
            <Button onClick={() => setShowCreatePanel(true)} className="bg-green-700 hover:bg-green-800 gap-2">
              <Upload className="w-4 h-4" /> Upload Winning Response
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 font-medium">{templates.length} template{templates.length !== 1 ? 's' : ''}</div>
            {templates.map(t => (
              <div key={t.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-5 flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <Star className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{t.issuingOrg}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.orgType}</span>
                      {t.rfqNumber && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.rfqNumber}</span>}
                    </div>
                    {t.internalNotes && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{t.internalNotes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {(t.responseNarrative || '').slice(0, 120)}…
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                      onClick={() => setPreview(preview?.id === t.id ? null : t)}>
                      <Eye className="w-3.5 h-3.5" /> {preview?.id === t.id ? 'Close' : 'Preview'}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => navigate(`/rfq/${t.id}`)}>
                      <FileText className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(t)}>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                </div>

                {preview?.id === t.id && (
                  <div className="border-t bg-gray-50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-gray-700">Template Preview</div>
                      <button onClick={() => handleCopy(t.responseNarrative)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Copy All
                      </button>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-800 text-sm max-h-96 overflow-y-auto">
                      <ReactMarkdown>{t.responseNarrative}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}