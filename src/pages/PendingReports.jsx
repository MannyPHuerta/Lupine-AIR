import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, RefreshCw, Send, ShoppingCart, Loader2 } from "lucide-react";
import PrepareForSaleModal from "@/components/PrepareForSaleModal";

export default function PendingReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [prepareReport, setPrepareReport] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.filter({ isSent: false }, "-created_date"),
  });

  const sendReport = async (report) => {
    const allEmails = [...(report.sendToEmails || []), ...(report.customEmail ? [report.customEmail] : [])];
    const formData = new FormData();
    formData.append("itemName", report.itemName);
    formData.append("itemType", report.itemType);
    formData.append("model", report.model || "");
    formData.append("serialNumber", report.serialNumber || "");
    formData.append("assetNumber", report.assetNumber || "");
    formData.append("action", report.action);
    formData.append("branch", report.branch);
    formData.append("comments", report.comments || "");
    formData.append("sendTo", allEmails.join(","));
    formData.append("sentBy", report.sentBy || "");

    const response = await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Send failed");
    await base44.entities.Report.update(report.id, { isSent: true });
  };

  const retryAll = async () => {
    setRetrying(true);
    let successCount = 0;
    for (const report of reports) {
      try {
        await sendReport(report);
        successCount++;
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    setRetrying(false);
    toast({
      title: successCount > 0 ? `${successCount} report(s) sent successfully` : "No reports could be sent. Check connection.",
      className: successCount > 0 ? "bg-green-600 text-white" : "bg-orange-500 text-white",
    });
  };

  const retrySingle = async (report) => {
    setSendingId(report.id);
    try {
      await sendReport(report);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report sent successfully", className: "bg-green-600 text-white" });
    } catch {
      toast({ title: "Resend failed – check connection", className: "bg-orange-500 text-white" });
    }
    setSendingId(null);
  };

  const handlePrepareConfirm = async (updates) => {
    await base44.entities.Report.update(prepareReport.id, updates);
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    toast({ title: "Marked ready for sale!", className: "bg-green-600 text-white" });
    setPrepareReport(null);
  };

  const actionColor = { Sell: "bg-orange-100 text-orange-700", Repair: "bg-blue-100 text-blue-700", Discard: "bg-red-100 text-red-700" };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* AppBar */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-xl font-bold">Pending Reports</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600" onClick={retryAll} disabled={retrying}>
          {retrying ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        </Button>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center mt-20 text-gray-500">
            <p className="text-lg">No pending reports</p>
            <p className="text-sm mt-1">All reports have been sent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{report.itemName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {report.branch} • {report.created_date ? new Date(report.created_date).toLocaleString().slice(0, 16) : ""}
                    </p>
                    <Badge className={`mt-1 text-xs ${actionColor[report.action] || "bg-gray-100 text-gray-700"}`}>
                      {report.action}
                    </Badge>
                    {report.action === "Sell" && report.askingPrice != null && (
                      <p className="text-sm text-orange-700 font-semibold mt-0.5">${report.askingPrice.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {report.action?.toLowerCase() === "sell" && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs" onClick={() => setPrepareReport(report)}>
                        <ShoppingCart className="w-3 h-3 mr-1" /> Prepare for Sale
                      </Button>
                    )}
                    <Button size="icon" variant="outline" onClick={() => retrySingle(report)} disabled={sendingId === report.id}>
                      {sendingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {prepareReport && (
        <PrepareForSaleModal
          report={prepareReport}
          onClose={() => setPrepareReport(null)}
          onConfirm={handlePrepareConfirm}
        />
      )}
    </div>
  );
}