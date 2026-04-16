import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PrepareForSaleModal({ report, onClose, onConfirm }) {
  const [askingPrice, setAskingPrice] = useState(report?.askingPrice ?? "");
  const [saleNotes, setSaleNotes] = useState(report?.comments ?? "");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!askingPrice) return;
    setSaving(true);
    await onConfirm({
      askingPrice: parseFloat(askingPrice),
      comments: saleNotes,
      isPosted: true,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prepare for Sale — {report?.itemName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Asking Price (USD) <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                min="0"
                step="100"
                value={askingPrice}
                onChange={e => setAskingPrice(e.target.value)}
                placeholder="e.g. 15000"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Sale Notes</Label>
            <Textarea
              value={saleNotes}
              onChange={e => setSaleNotes(e.target.value)}
              rows={3}
              placeholder="Condition, hours, extras..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleConfirm}
            disabled={!askingPrice || saving}
          >
            {saving ? "Saving..." : "✓ Mark Ready for Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}