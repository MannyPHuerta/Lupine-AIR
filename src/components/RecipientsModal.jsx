import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";

export default function RecipientsModal({ open, onClose, staffEmails, selected, onConfirm }) {
  const [temp, setTemp] = useState([]);
  const [customEmails, setCustomEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setTemp([...selected]);
      base44.entities.CustomEmail.filter({ type: "recipient" }).then(setCustomEmails);
    }
  }, [open]);

  const allEmails = [...staffEmails, ...customEmails.map(e => e.email).filter(e => !staffEmails.includes(e))];

  const toggle = (email) => {
    setTemp(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const handleAddEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;
    if (allEmails.includes(trimmed)) { setNewEmail(""); return; }
    setAdding(true);
    await base44.entities.CustomEmail.create({ email: trimmed, type: "recipient" });
    const updated = await base44.entities.CustomEmail.filter({ type: "recipient" });
    setCustomEmails(updated);
    setTemp(prev => [...prev, trimmed]);
    setNewEmail("");
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Recipients</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {allEmails.map(email => (
            <div key={email} className="flex items-center gap-3 py-1">
              <Checkbox id={`r-${email}`} checked={temp.includes(email)} onCheckedChange={() => toggle(email)} />
              <Label htmlFor={`r-${email}`} className="cursor-pointer text-sm">{email}</Label>
            </div>
          ))}
        </div>
        {/* Add new email */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Add new recipient email..."
            className="text-sm"
            onKeyDown={e => e.key === "Enter" && handleAddEmail()}
          />
          <Button size="icon" variant="outline" onClick={handleAddEmail} disabled={adding || !newEmail.trim()}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(temp); onClose(); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}