import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function RecipientsModal({ open, onClose, staffEmails, selected, onConfirm }) {
  const [temp, setTemp] = useState([]);

  useEffect(() => { if (open) setTemp([...selected]); }, [open]);

  const toggle = (email) => {
    setTemp(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Recipients</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {staffEmails.map(email => (
            <div key={email} className="flex items-center gap-3 py-1">
              <Checkbox id={email} checked={temp.includes(email)} onCheckedChange={() => toggle(email)} />
              <Label htmlFor={email} className="cursor-pointer text-sm">{email}</Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(temp); onClose(); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}