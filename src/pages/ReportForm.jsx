import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { History, Info, X, Plus, Loader2, Upload } from "lucide-react";
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

const MARKETPLACE_UPLOADERS = [
  "manny@rentalworld.com", "awolf@rentalworld.com", "bwolf@rentalworld.com", "brucewolf@rentalworld.com",
  "dcarranza@rentalworld.com", "ealfaro@rentalworld.com", "ggomez@rentalworld.com",
  "jgomez@rentalworld.com", "jjacobson@rentalworld.com", "margog@rentalworld.com",
  "rmelchor@rentalworld.com", "rwolf@rentalworld.com"
];

export default function ReportForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canUploadToMarketplace, setCanUploadToMarketplace] = useState(false);

  const [debugEmail, setDebugEmail] = useState("");

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) {
        setDebugEmail(user.email);
        if (MARKETPLACE_UPLOADERS.includes(user.email)) {
          setCanUploadToMarketplace(true);
        }
      }
    });
  }, []);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [customEmail, setCustomEmail] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [form, setForm] = useState({
    itemName: "", itemType: "", model: "", serialNumber: "",
    assetNumber: "", action: "", branch: "", comments: ""
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemName || !form.itemType || !form.action || !form.branch) {
      toast({ title: "Missing required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const allEmails = [...selectedRecipients, ...(customEmail ? [customEmail] : [])];

    try {
      const formData = new FormData();
      formData.append("itemName", form.itemName);
      formData.append("itemType", form.itemType);
      formData.append("model", form.model || "");
      formData.append("serialNumber", form.serialNumber || "");
      formData.append("assetNumber", form.assetNumber || "");
      formData.append("action", form.action);
      formData.append("branch", form.branch);
      formData.append("comments", form.comments || "");
      formData.append("sendTo", allEmails.join(","));
      formData.append("sentBy", sentBy || "");
      formData.append("photoUrls", photos.join(","));

      await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
        method: "POST",
        body: formData,
      });

      await base44.entities.Report.create({
        ...form,
        sendToEmails: allEmails,
        customEmail,
        sentBy,
        photoPaths: photos,
        isSent: true,
      });

      toast({ title: "Report sent successfully!", className: "bg-green-600 text-white" });
      resetForm();
    } catch (err) {
      await base44.entities.Report.create({
        ...form,
        sendToEmails: allEmails,
        customEmail,
        sentBy,
        photoPaths: photos,
        isSent: false,
      });
      toast({ title: "Saved offline – will retry from Pending", className: "bg-orange-500 text-white" });
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
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">🐺 Asset Wolf</span>
          <span className="text-sm opacity-80">— New Report</span>
          {debugEmail && <span className="text-xs opacity-60 ml-1">({debugEmail})</span>}
          {canUploadToMarketplace && (
            <span
              className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-orange-400"
              onClick={() => navigate("/marketplace")}
            >
              🏷️ Marketplace
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600" onClick={() => navigate("/history")}>
            <History className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600" onClick={() => navigate("/about")}>
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Item Name */}
        <div className="space-y-1">
          <Label>Item Name <span className="text-red-500">*</span></Label>
          <Input value={form.itemName} onChange={e => handleChange("itemName", e.target.value)} placeholder="e.g. CAT 320 Excavator" />
        </div>

        {/* Item Type */}
        <div className="space-y-1">
          <Label>Item Type <span className="text-red-500">*</span></Label>
          <Select value={form.itemType} onValueChange={v => handleChange("itemType", v)}>
            <SelectTrigger><SelectValue placeholder="Select item type" /></SelectTrigger>
            <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-1">
          <Label>Manufacturer and Model</Label>
          <Input value={form.model} onChange={e => handleChange("model", e.target.value)} placeholder="e.g. Caterpillar 320" />
        </div>

        {/* Serial Number */}
        <div className="space-y-1">
          <Label>Serial Number / VIN</Label>
          <Input value={form.serialNumber} onChange={e => handleChange("serialNumber", e.target.value)} />
        </div>

        {/* Asset Number */}
        <div className="space-y-1">
          <Label>Asset Number</Label>
          <Input value={form.assetNumber} onChange={e => handleChange("assetNumber", e.target.value)} />
        </div>

        {/* Action */}
        <div className="space-y-1">
          <Label>Recommended Action <span className="text-red-500">*</span></Label>
          <Select value={form.action} onValueChange={v => handleChange("action", v)}>
            <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
            <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Branch */}
        <div className="space-y-1">
          <Label>Branch Location <span className="text-red-500">*</span></Label>
          <Select value={form.branch} onValueChange={v => handleChange("branch", v)}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Comments */}
        <div className="space-y-1">
          <Label>Asset Description / Condition</Label>
          <Textarea value={form.comments} onChange={e => handleChange("comments", e.target.value)} rows={3} placeholder="Describe the asset condition..." />
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
          <div>
            <input
              id="photo-upload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button type="button" variant="outline" onClick={() => document.getElementById("photo-upload").click()} disabled={uploadingPhotos}>
              {uploadingPhotos ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              {uploadingPhotos ? "Uploading..." : `Add Photos${photos.length > 0 ? ` (${photos.length})` : ""}`}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative">
                <img src={url} className="w-20 h-20 object-cover rounded border" />
                <button type="button" className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700">
          {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</> : "Submit Report"}
        </Button>
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