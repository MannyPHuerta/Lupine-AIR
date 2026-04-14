import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SenderModal({ open, onClose, staffEmails, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Sender</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {staffEmails.map(email => (
            <button
              key={email}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 text-sm"
              onClick={() => { onSelect(email); onClose(); }}
            >
              {email}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}