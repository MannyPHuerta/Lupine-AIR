import { useState, useEffect } from 'react';
import { QrCode, Copy, X, Printer, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];
const JOB_TYPES = ['delivery', 'event', 'shop', 'laundry', 'general'];
const STAFF_TYPES = ['temp', 'event', 'part_time', 'full_time'];

function buildClockInUrl(params) {
  const base = window.location.origin + '/clockin';
  const q = new URLSearchParams();
  if (params.branch) q.set('branch', params.branch);
  if (params.jobReference) q.set('job', params.jobReference);
  if (params.jobType) q.set('type', params.jobType);
  if (params.staffType) q.set('staffType', params.staffType);
  if (params.hourlyRate) q.set('rate', params.hourlyRate);
  return `${base}?${q.toString()}`;
}

// Simple QR code via Google Charts API (no extra package needed)
function QRImage({ url, size = 200 }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10`;
  return (
    <img
      src={src}
      alt="QR Code"
      className="rounded-lg border shadow"
      width={size}
      height={size}
    />
  );
}

export default function QRCodeGenerator({ onClose }) {
  const [params, setParams] = useState({
    branch: '',
    jobReference: '',
    jobType: 'general',
    staffType: 'temp',
    hourlyRate: '',
  });
  const [copied, setCopied] = useState(false);
  const [openJobs, setOpenJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Fetch open rentals for selected branch
  useEffect(() => {
    if (!params.branch) {
      setOpenJobs([]);
      return;
    }
    // Defensive check for preview mode
    if (!base44 || !base44.entities) {
      console.warn('[QRCodeGenerator] Base44 SDK not available');
      setOpenJobs([]);
      setLoadingJobs(false);
      return;
    }
    
    setLoadingJobs(true);
    base44.entities.Rental.filter({ branch: params.branch }, '-startDate', 100)
      .then(data => {
        const open = data.filter(r => ['out', 'contract', 'reservation'].includes(r.status));
        setOpenJobs(open);
      })
      .finally(() => setLoadingJobs(false));
  }, [params.branch]);

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const url = buildClockInUrl(params);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const encoded = encodeURIComponent(url);
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&margin=10`;
    const win = window.open('', '_blank', 'width=600,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clock-In QR Code</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          p { color: #555; font-size: 14px; margin: 4px 0; }
          img { margin: 20px auto; display: block; }
          .url { font-size: 10px; color: #999; word-break: break-all; margin-top: 16px; }
          .footer { margin-top: 24px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <h1>Staff Clock-In</h1>
        ${params.branch ? `<p><strong>Branch:</strong> ${params.branch}</p>` : ''}
        ${params.jobReference ? `<p><strong>Job:</strong> ${params.jobReference}</p>` : ''}
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <img src="${qrSrc}" width="300" height="300" />
        <div class="footer">Scan QR code or visit the link below to log your hours</div>
        <div class="url">${url}</div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" /> Generate Clock-In QR
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Branch</label>
            <select value={params.branch} onChange={e => set('branch', e.target.value)}
              className="w-full h-9 border rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Any Branch</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              Job / Invoice #
              {loadingJobs && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
            </label>
            {params.branch && openJobs.length > 0 ? (
              <select
                value={params.jobReference}
                onChange={e => set('jobReference', e.target.value)}
                className="w-full h-9 border rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Job --</option>
                {openJobs.map(r => (
                  <option key={r.id} value={r.invoiceNumber || r.id}>
                    {r.invoiceNumber || r.id.slice(0, 8)} — {r.customerName}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={params.jobReference}
                onChange={e => set('jobReference', e.target.value)}
                placeholder={params.branch && !loadingJobs ? 'No open jobs found' : 'e.g. MCL-1042'}
              />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Job Type</label>
            <select value={params.jobType} onChange={e => set('jobType', e.target.value)}
              className="w-full h-9 border rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Staff Type</label>
            <select value={params.staffType} onChange={e => set('staffType', e.target.value)}
              className="w-full h-9 border rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {STAFF_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Hourly Rate ($) — optional, pre-fills pay calc</label>
            <Input type="number" value={params.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} placeholder="e.g. 15.00" />
          </div>
        </div>

        {/* QR Code display */}
        <div className="flex flex-col items-center gap-3 py-2">
          <QRImage url={url} size={200} />
          <p className="text-xs text-gray-400 text-center break-all max-w-xs">{url}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
            <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button onClick={handlePrint} className="flex-1 gap-2 bg-indigo-700 hover:bg-indigo-800">
            <Printer className="w-4 h-4" /> Print QR
          </Button>
          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="icon" title="Test link">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}