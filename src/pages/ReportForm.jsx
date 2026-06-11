import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { History, Info, X, Loader2, Phone } from "lucide-react";
import RecipientsModal from "@/components/RecipientsModal";
import SenderModal from "@/components/SenderModal";
import PhotoUploader from "@/components/PhotoUploader";
import OfflineBanner from "@/components/OfflineBanner.jsx";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

const ACTIONS = ["Sell", "Repair", "Discard/Part out", "Need Quote for Customer"];
const BRANCHES = [
  "01 McAllen", "02 Weslaco", "03 Harlingen", "05 Brownsville", "06 Corpus", "98 Shop", "99 Warehouse"
];
const ITEM_TYPES = [
  "Air Compressor", "Backhoe", "Boom Lift", "Bulldozer", "Chair",
  "Chipper/Shredder", "Compactor", "Concrete Grinder", "Concrete Mixer",
  "Concrete Saw", "Dance Floor", "Dump Truck", "Excavator", "Floor Sander",
  "Forklift", "Generator", "Grader", "Inflatable", "Light Tower", "Loader",
  "Other", "Pallet Jack", "Paving Equipment", "Plate Compactor",
  "Pressure Washer", "Sandblaster", "Scissor Lift", "Skid Steer", "Staging",
  "Stump Grinder", "Table", "Telehandler", "Tent", "Tile Stripper", "Trailer",
  "Trench Roller", "Trencher", "Truck/Van", "Water Pump", "Welder", "Zero Turn Mower"
];
const STAFF_EMAILS = [
  "manny@rentalworld.com", "awolf@rentalworld.com", "brucewolf@rentalworld.com",
  "bwolf@rentalworld.com", "dcarranza@rentalworld.com", "dfulcher@rentalworld.com",
  "ealfaro@rentalworld.com", "ggomez@rentalworld.com", "jcurran@rentalworld.com",
  "jgomez@rentalworld.com", "jjacobson@rentalworld.com", "joep@rentalworld.com",
  "lisamiller@rentalworld.com", "margog@rentalworld.com", "rmelchor@rentalworld.com",
  "rwolf@rentalworld.com"
];

export default function ReportForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotifTooltip, setShowNotifTooltip] = useState(false);
  const [photos, setPhotos] = useState([]);
  const { user } = useAuth();
  const { queue, syncing, lastSyncResult, enqueue } = useOfflineQueue();
  const currentUserEmail = user?.email || "";

  const [selectedRecipients, setSelectedRecipients] = useState(["bwolf@rentalworld.com"]);
  const [customEmail, setCustomEmail] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [form, setForm] = useState({
    itemName: "", itemType: "", model: "", serialNumber: "",
    assetNumber: "", action: "", branch: "", comments: "", askingPrice: ""
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemName || !form.itemType || !form.action || !form.branch) {
      toast({ title: "Missing required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const allEmails = [...selectedRecipients, ...(customEmail ? [customEmail] : [])];

    const reportData = {
      ...form,
      askingPrice: form.askingPrice ? parseFloat(form.askingPrice) : null,
      sendToEmails: allEmails,
      customEmail,
      sentBy,
      photoPaths: photos,
      isSent: false,
    };

    const emailData = {
      itemName: form.itemName,
      itemType: form.itemType,
      model: form.model || "",
      serialNumber: form.serialNumber || "",
      assetNumber: form.assetNumber || "",
      action: form.action,
      branch: form.branch,
      comments: form.comments || "",
      sendTo: allEmails.join(","),
      sentBy: sentBy || "",
      photoUrls: photos.join(","),
    };

    // If offline, queue for later
    if (!navigator.onLine) {
      enqueue({ reportData, emailData });
      toast({ title: "Saved offline — will sync when connected", className: "bg-yellow-500 text-white" });
      resetForm();
      setIsSubmitting(false);
      return;
    }

    try {
      await base44.entities.Report.create({ ...reportData, isSent: false });
      toast({ title: "Report submitted successfully!", className: "bg-green-600 text-white" });
      resetForm();
    } catch (err) {
      enqueue({ reportData, emailData });
      toast({ title: "Connection lost — report saved, will sync automatically", className: "bg-yellow-500 text-white" });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ itemName: "", itemType: "", model: "", serialNumber: "", assetNumber: "", action: "", branch: "", comments: "" });
    setPhotos([]);
    setSelectedRecipients([]);
    setCustomEmail("");
    setSentBy("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* AppBar */}
      <div className="bg-blue-700 text-white shadow-md sticky top-0 z-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-4 py-2 flex items-center justify-center">
          <span className="text-xl font-bold flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/7bc9512a2_wolf_silhouette.png" className="w-8 h-8 rounded-md object-cover" alt="wolf" />
            Asset Wolf
          </span>
        </div>
      </div>

      <OfflineBanner queueCount={queue.length} syncing={syncing} lastSyncResult={lastSyncResult} />
      {/* Logged-in user banner */}
      {currentUserEmail && (
        <div className="bg-blue-900 text-blue-200 text-xs text-center py-1 px-4">
          Logged in as: {currentUserEmail}
        </div>
      )}

      {/* Nav buttons */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-between">
        <button className="flex items-center gap-1 text-blue-700 font-medium hover:underline" onClick={() => navigate("/history")}>
          <History className="w-5 h-5" />
          <span className="text-sm">History</span>
        </button>
        <div className="relative">
          <button
            className="flex items-center gap-1 text-green-700 font-medium text-xs bg-green-50 border border-green-200 rounded-full px-3 py-1 hover:bg-green-100 transition-colors"
            onClick={() => setShowNotifTooltip(v => !v)}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Notifications On
          </button>
          {showNotifTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 top-8 z-20 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800 mb-1">Active Notifications</p>
              <div className="space-y-1.5">
                <div className="flex gap-2"><span>👁</span><span><b>Report Viewed</b> — submitter gets an email when a recipient opens their report</span></div>
                <div className="flex gap-2"><span>🔔</span><span><b>New Sell Report</b> — management is alerted instantly when a Sell report is submitted</span></div>
                <div className="flex gap-2"><span>📋</span><span><b>Weekly Digest</b> — summary email sent every Monday morning with inventory & pending reports</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 text-blue-700 font-medium hover:underline" onClick={() => navigate("/staff-phones")}>
            <Phone className="w-4 h-4" />
            <span className="text-sm">SMS</span>
          </button>
          <button className="flex items-center gap-1 text-blue-700 font-medium hover:underline" onClick={() => navigate("/about")}>
            <span className="text-sm">Info</span>
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Item Name */}
        <div className="space-y-1">
          <Label className="font-label">Item Name <span className="text-red-500">*</span></Label>
          <Input className="font-body" value={form.itemName} onChange={e => handleChange("itemName", e.target.value)} placeholder="e.g. CAT 320 Excavator" />
        </div>

        {/* Item Type */}
        <div className="space-y-1">
          <Label className="font-label">Item Type <span className="text-red-500">*</span></Label>
          <Select value={form.itemType} onValueChange={v => handleChange("itemType", v)}>
            <SelectTrigger><SelectValue placeholder="Select item type" /></SelectTrigger>
            <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-1">
          <Label className="font-label">Manufacturer and Model</Label>
          <Input className="font-body" value={form.model} onChange={e => handleChange("model", e.target.value)} placeholder="e.g. Caterpillar 320" />
        </div>

        {/* Serial Number */}
        <div className="space-y-1">
          <Label className="font-label">Serial Number / VIN</Label>
          <Input className="font-body" value={form.serialNumber} onChange={e => handleChange("serialNumber", e.target.value)} />
        </div>

        {/* Asset Number */}
        <div className="space-y-1">
          <Label className="font-label">Asset Number</Label>
          <Input className="font-body" value={form.assetNumber} onChange={e => handleChange("assetNumber", e.target.value)} />
          <p className="text-xs text-gray-400 font-body italic">Example: 0030-0090-02-70</p>
        </div>

        {/* Action */}
        <div className="space-y-1">
          <Label className="font-label">Recommended Action <span className="text-red-500">*</span></Label>
          <Select value={form.action} onValueChange={v => handleChange("action", v)}>
            <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
            <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Asking Price — only for Sell */}
        {form.action === "Sell" && (
          <div className="space-y-1">
            <Label className="font-label">Asking Price (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                min="0"
                step="100"
                value={form.askingPrice}
                onChange={e => handleChange("askingPrice", e.target.value)}
                placeholder="e.g. 15000"
                className="pl-7"
              />
            </div>
          </div>
        )}

        {/* Branch */}
        <div className="space-y-1">
          <Label className="font-label">Branch Location <span className="text-red-500">*</span></Label>
          <Select value={form.branch} onValueChange={v => handleChange("branch", v)}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Comments */}
        <div className="space-y-1">
          <Label className="font-label">Asset Description / Condition</Label>
          <Textarea className="font-body" value={form.comments} onChange={e => handleChange("comments", e.target.value)} rows={3} placeholder="Describe the asset condition..." />
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <Label className="font-bold">Send To</Label>
          <Button type="button" variant="outline" onClick={() => setShowRecipientsModal(true)}>
            Select Recipients
          </Button>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedRecipients.map(email => (
              <Badge key={email} variant="secondary" className="flex items-center gap-1">
                {email}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedRecipients(prev => prev.filter(e => e !== email))} />
              </Badge>
            ))}
          </div>
          <Input value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="Custom email (optional)" />
        </div>

        {/* Sent By */}
        <div className="space-y-2">
          <Label className="font-bold">Sent By</Label>
          <Button type="button" variant="outline" onClick={() => setShowSenderModal(true)}>
            Select Sender
          </Button>
          {sentBy && <Badge variant="secondary">{sentBy} <X className="w-3 h-3 ml-1 cursor-pointer inline" onClick={() => setSentBy("")} /></Badge>}
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <Label className="font-bold">Photos</Label>
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 h-14 text-lg" onClick={resetForm}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-700">
            {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</> : "Submit Report"}
          </Button>
        </div>
      </form>

      <RecipientsModal
        open={showRecipientsModal}
        onClose={() => setShowRecipientsModal(false)}
        staffEmails={STAFF_EMAILS}
        selected={selectedRecipients}
        onConfirm={setSelectedRecipients}
      />
      <SenderModal
        open={showSenderModal}
        onClose={() => setShowSenderModal(false)}
        staffEmails={STAFF_EMAILS}
        onSelect={setSentBy}
      />
    </div>
  );
}