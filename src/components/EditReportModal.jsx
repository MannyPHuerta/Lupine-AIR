import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Send, Loader2 } from "lucide-react";
import RecipientsModal from "@/components/RecipientsModal";
import SenderModal from "@/components/SenderModal";

const ACTIONS = ["Sell", "Repair", "Discard", "Need Quote for Customer"];
const BRANCHES = ["Corpus Christi", "Brownsville", "Harlingen", "Harlingen Warehouse", "McAllen", "Weslaco"];
const ITEM_TYPES = [
  "Excavator", "Loader", "Trencher", "Grader", "Paving Equipment", "Compactor", "Crane",
  "Forklift", "Scissor Lift", "Boom Lift", "Dump Truck", "Concrete Mixer", "Skid Steer",
  "Bulldozer", "Backhoe", "Telehandler", "Generator", "Compressor", "Other"
];
const STAFF_EMAILS = [
  "manny@rentalworld.com", "awolf@rentalworld.com", "brucewolf@rentalworld.com",
  "dcarranza@rentalworld.com", "dfulcher@rentalworld.com", "ealfaro@rentalworld.com",
  "ggomez@rentalworld.com", "jcurran@rentalworld.com", "jgomez@rentalworld.com",
  "jjacobson@rentalworld.com", "joep@rentalworld.com", "lisamiller@rentalworld.com",
  "margog@rentalworld.com", "rmelchor@rentalworld.com", "rwolf@rentalworld.com"
];

export default function EditReportModal({ report, onClose, onSave, onResend }) {
  const [form, setForm] = useState({
    itemName: report.itemName || "",
    itemType: report.itemType || "",
    model: report.model || "",
    serialNumber: report.serialNumber || "",
    assetNumber: report.assetNumber || "",
    action: report.action || "",
    branch: report.branch || "",
    comments: report.comments || "",
  });
  const [recipients, setRecipients] = useState(report.sendToEmails || []);
  const [customEmail, setCustomEmail] = useState(report.customEmail || "");
  const [sentBy, setSentBy] = useState(report.sentBy || "");
  const [photos, setPhotos] = useState(report.photoPaths || []);
  const [showRecipients, setShowRecipients] = useState(false);
  const [showSender, setShowSender] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setPhotos(prev => [...prev, ...uploaded]);
    setUploadingPhotos(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...report,
      ...form,
      sendToEmails: recipients,
      customEmail,
      sentBy,
      photoPaths: photos,
    });
    setSaving(false);
  };

  const handleSaveAndSend = async () => {
    setSending(true);
    const updated = { ...report, ...form, sendToEmails: recipients, customEmail, sentBy, photoPaths: photos };
    await onSave(updated);
    await onResend(updated);
    setSending(false);
    onClose();
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Item Name <span className="text-red-500">*</span></Label>
              <Input value={form.itemName} onChange={e => handleChange("itemName", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Item Type</Label>
              <Select value={form.itemType} onValueChange={v => handleChange("itemType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Manufacturer and Model</Label>
              <Input value={form.model} onChange={e => handleChange("model", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Serial Number / VIN</Label>
              <Input value={form.serialNumber} onChange={e => handleChange("serialNumber", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Asset Number</Label>
              <Input value={form.assetNumber} onChange={e => handleChange("assetNumber", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Recommended Action</Label>
              <Select value={form.action} onValueChange={v => handleChange("action", v)}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Branch Location</Label>
              <Select value={form.branch} onValueChange={v => handleChange("branch", v)}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Asset Description / Condition</Label>
              <Textarea value={form.comments} onChange={e => handleChange("comments", e.target.value)} rows={3} />
            </div>

            {/* Recipients */}
            <div className="space-y-1">
              <Label className="font-bold">Send To</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRecipients(true)}>
                Select Recipients
              </Button>
              <div className="flex flex-wrap gap-1 mt-1">
                {recipients.map(email => (
                  <Badge key={email} variant="secondary" className="text-xs flex items-center gap-1">
                    {email}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setRecipients(prev => prev.filter(e => e !== email))} />
                  </Badge>
                ))}
              </div>
              <Input value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="Custom email (optional)" className="mt-1" />
            </div>

            {/* Sent By */}
            <div className="space-y-1">
              <Label className="font-bold">Sent By</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowSender(true)}>
                Select Sender
              </Button>
              {sentBy && (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit mt-1">
                  {sentBy}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSentBy("")} />
                </Badge>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-1">
              <Label className="font-bold">Photos</Label>
              <div>
                <input id="edit-photo-upload" type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("edit-photo-upload").click()} disabled={uploadingPhotos}>
                  {uploadingPhotos ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  {uploadingPhotos ? "Uploading..." : `Add Photos${photos.length > 0 ? ` (${photos.length})` : ""}`}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {photos.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} className="w-16 h-16 object-cover rounded border" />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Save
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveAndSend} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Save & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecipientsModal
        open={showRecipients}
        onClose={() => setShowRecipients(false)}
        staffEmails={STAFF_EMAILS}
        selected={recipients}
        onConfirm={setRecipients}
      />
      <SenderModal
        open={showSender}
        onClose={() => setShowSender(false)}
        staffEmails={STAFF_EMAILS}
        onSelect={setSentBy}
      />
    </>
  );
}