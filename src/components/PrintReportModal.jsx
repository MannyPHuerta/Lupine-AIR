import { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function PrintReportModal({ report, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Asset Report - ${report.itemName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            td { padding: 8px 12px; border: 1px solid #ddd; font-size: 14px; vertical-align: top; }
            td:first-child { font-weight: bold; width: 35%; background: #f5f5f5; }
            .photos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
            .photos img { width: 120px; height: 120px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin: 2px; }
            .badge-sell { background: #fff3e0; color: #e65100; }
            .badge-repair { background: #e3f2fd; color: #1565c0; }
            .badge-discard { background: #ffebee; color: #c62828; }
            .badge-quote { background: #f3e5f5; color: #6a1b9a; }
            .badge-sent { background: #e8f5e9; color: #2e7d32; }
            .badge-pending { background: #fffde7; color: #f57f17; }
            img { max-width: 120px; height: 120px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: inline-block; }
            @media print { button { display: none; } img { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    // Wait for all images to load before printing
    const images = win.document.querySelectorAll("img");
    if (images.length === 0) {
      win.print();
      win.close();
    } else {
      let loaded = 0;
      const tryPrint = () => {
        loaded++;
        if (loaded >= images.length) {
          win.print();
          win.close();
        }
      };
      images.forEach(img => {
        if (img.complete) {
          tryPrint();
        } else {
          img.onload = tryPrint;
          img.onerror = tryPrint;
        }
      });
    }
  };

  const actionBadgeClass = {
    Sell: "badge-sell",
    Repair: "badge-repair",
    "Discard/Part out": "badge-discard",
    "Need Quote for Customer": "badge-quote",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Print Preview</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Print content */}
        <div ref={printRef} className="text-sm">
          <h1 className="text-xl font-bold mb-1">{report.itemName}</h1>
          <p className="meta text-gray-500 text-xs mb-4">
            {report.created_date ? new Date(report.created_date).toLocaleString() : ""}
            {" · "}{report.branch}
          </p>

          <table className="w-full border-collapse text-sm mb-4">
            <tbody>
              {report.itemType && <tr><td className="font-medium bg-gray-50 border p-2 w-1/3">Type</td><td className="border p-2">{report.itemType}</td></tr>}
              {report.model && <tr><td className="font-medium bg-gray-50 border p-2">Model</td><td className="border p-2">{report.model}</td></tr>}
              {report.serialNumber && <tr><td className="font-medium bg-gray-50 border p-2">Serial #</td><td className="border p-2">{report.serialNumber}</td></tr>}
              {report.assetNumber && <tr><td className="font-medium bg-gray-50 border p-2">Asset #</td><td className="border p-2">{report.assetNumber}</td></tr>}
              <tr>
                <td className="font-medium bg-gray-50 border p-2">Action</td>
                <td className="border p-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    report.action === "Sell" ? "bg-orange-100 text-orange-700" :
                    report.action === "Repair" ? "bg-blue-100 text-blue-700" :
                    report.action === "Discard/Part out" ? "bg-red-100 text-red-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>{report.action}</span>
                </td>
              </tr>
              {report.action === "Sell" && report.askingPrice != null && (
                <tr><td className="font-medium bg-gray-50 border p-2">Asking Price</td><td className="border p-2 font-semibold text-orange-700">${report.askingPrice.toLocaleString()}</td></tr>
              )}
              {report.comments && <tr><td className="font-medium bg-gray-50 border p-2">Notes</td><td className="border p-2 whitespace-pre-wrap">{report.comments}</td></tr>}
              {report.sentBy && <tr><td className="font-medium bg-gray-50 border p-2">Sent By</td><td className="border p-2">{report.sentBy}</td></tr>}
              {report.sendToEmails?.length > 0 && (
                <tr><td className="font-medium bg-gray-50 border p-2">Recipients</td><td className="border p-2">{report.sendToEmails.join(", ")}{report.customEmail ? `, ${report.customEmail}` : ""}</td></tr>
              )}
              <tr>
                <td className="font-medium bg-gray-50 border p-2">Status</td>
                <td className="border p-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${report.isSent ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {report.isSent ? "Sent" : "Pending"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {report.photoPaths?.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Photos</p>
              <div className="flex flex-wrap gap-2">
                {report.photoPaths.map((url, i) => (
                  <img key={i} src={url} className="w-20 h-20 object-cover rounded border" />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}