import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ACTIONS = ['Sell', 'Repair', 'Discard/Part out', 'Need Quote for Customer'];

export default function FleetCardEditPanel({ report, onSaved }) {
  const [action, setAction] = useState(report.action || '');
  const [askingPrice, setAskingPrice] = useState(report.askingPrice || '');
  const [meetingNote, setMeetingNote] = useState(report.meetingNote || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.Report.update(report.id, {
      action,
      askingPrice: askingPrice ? parseFloat(askingPrice) : null,
      meetingNote,
      lastEditedAt: new Date().toISOString(),
    });
    setSaving(false);
    onSaved({ ...report, action, askingPrice: parseFloat(askingPrice) || null, meetingNote });
  };

  return (
    <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Action</label>
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Asking Price</label>
        <Input
          type="number"
          value={askingPrice}
          onChange={e => setAskingPrice(e.target.value)}
          placeholder="$0"
          className="text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Meeting Note</label>
        <textarea
          value={meetingNote}
          onChange={e => setMeetingNote(e.target.value)}
          placeholder="Notes from today's review..."
          rows={2}
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white resize-none"
        />
      </div>
      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full gap-2">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? 'Saving…' : 'Save & Dispatch'}
      </Button>
    </div>
  );
}