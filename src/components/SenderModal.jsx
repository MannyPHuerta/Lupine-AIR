import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";

export default function SenderModal({ open, onClose, staffEmails, onSelect }) {
  const [customEmails, setCustomEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.CustomEmail.filter({ type: "sender" }).then(setCustomEmails);
    }
  }, [open]);

  const allEmails = [...staffEmails, ...customEmails.map(e => e.email).filter(e => !staffEmails.includes(e))];

  const handleAddEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;
    if (allEmails.includes(trimmed)) { setNewEmail(""); return; }
    setAdding(true);
    await base44.entities.CustomEmail.create({ email: trimmed, type: "sender" });
    const updated = await base44.entities.CustomEmail.filter({ type: "sender" });
    setCustomEmails(updated);
    setNewEmail("");
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Sender</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {allEmails.map(email => (
            <button
              key={email}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 text-sm"
              onClick={() => { onSelect(email); onClose(); }}
            >
              {email}
            </button>
          ))}
        </div>
        {/* Add new email */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Add new sender email..."
            className="text-sm"
            onKeyDown={e => e.key === "Enter" && handleAddEmail()}
          />
          <Button size="icon" variant="outline" onClick={handleAddEmail} disabled={adding || !newEmail.trim()}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}