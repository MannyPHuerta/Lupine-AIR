import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle2, Trash2 } from 'lucide-react';

const CATEGORIES = [
  'Air Compressor', 'Backhoe', 'Boom Lift', 'Bulldozer', 'Chair', 'Chipper/Shredder',
  'Compactor', 'Concrete Equipment', 'Dance Floor', 'Dump Truck', 'Excavator',
  'Floor Sander', 'Forklift', 'Generator', 'Grader', 'Inflatable', 'Light Tower',
  'Loader', 'Pallet Jack', 'Paving Equipment', 'Plate Compactor', 'Pressure Washer',
  'Sandblaster', 'Scissor Lift', 'Skid Steer', 'Staging', 'Stump Grinder', 'Table',
  'Telehandler', 'Tent', 'Tile Stripper', 'Trailer', 'Trencher', 'Water Pump',
  'Welder', 'Zero Turn Mower', 'Fleet Vehicle', 'Tool', 'Other',
];

export default function CatalogEditModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    description1: item.description1 || '',
    description2: item.description2 || '',
    serialNumber: item.serialNumber || '',
    location: item.location || '',
    branchCode: item.branchCode || '',
    disposition: item.disposition || '',
    cleanName: item.cleanName || '',
    category: item.category || '',
  });

  const handleSave = (status) => {
    onSave({ ...item, ...form, reviewStatus: status });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-indigo-50 rounded-t-xl">
          <div>
            <div className="font-bold text-indigo-900">Edit Record</div>
            <div className="text-xs text-indigo-600 font-mono">Index #{item.recordIndex}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Raw fields preview */}
        {item.rawFields?.length > 0 && (
          <div className="px-6 py-3 bg-gray-900 text-green-300 text-xs font-mono overflow-x-auto">
            <div className="text-gray-500 mb-1">RAW FIELDS FROM INV FILE:</div>
            {item.rawFields.map((f, i) => <div key={i}>[{i}] {f}</div>)}
          </div>
        )}

        <div className="px-6 py-4 space-y-4">
          {/* Clean Name — the most important field */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
            <Label className="text-indigo-800 font-semibold">Clean Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.cleanName}
              onChange={e => setForm(f => ({ ...f, cleanName: e.target.value }))}
              placeholder="Human-readable equipment name (e.g. 'Light Tower 350W LED 63-gal')"
              className="bg-white"
            />
            <p className="text-xs text-indigo-600">This becomes the canonical name in the Lupine catalog.</p>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Description 1 (raw)</Label>
              <Input value={form.description1} onChange={e => setForm(f => ({ ...f, description1: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description 2 (raw)</Label>
              <Input value={form.description2} onChange={e => setForm(f => ({ ...f, description2: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Serial / Model</Label>
              <Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Branch Code</Label>
              <Input value={form.branchCode} onChange={e => setForm(f => ({ ...f, branchCode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Disposition / Notes</Label>
              <Input value={form.disposition} onChange={e => setForm(f => ({ ...f, disposition: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex gap-3 justify-between">
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1" onClick={() => handleSave('junk')}>
            <Trash2 className="w-4 h-4" /> Mark as Junk
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleSave('approved')}>
              <CheckCircle2 className="w-4 h-4" /> Save & Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}