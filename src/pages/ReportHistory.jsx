import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Send, Loader2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import EditReportModal from "@/components/EditReportModal";
import { buildCraigslistURL, buildFacebookMarketplaceURL } from "@/lib/marketplaceUtils";

const MARKETPLACE_UPLOADERS = [
  "manny@rentalworld.com", "mannyph2003@hotmail.com", "awolf@rentalworld.com", "bwolf@rentalworld.com", "brucewolf@rentalworld.com",
  "dcarranza@rentalworld.com", "ealfaro@rentalworld.com", "ggomez@rentalworld.com",
  "jgomez@rentalworld.com", "jjacobson@rentalworld.com", "margog@rentalworld.com",
  "rmelchor@rentalworld.com", "rwolf@rentalworld.com"
];

const actionColor = {
  Sell: "bg-orange-100 text-orange-700",
  Repair: "bg-blue-100 text-blue-700",
  Discard: "bg-red-100 text-red-700",
  "Need Quote for Customer": "bg-purple-100 text-purple-700",
};

export default function ReportHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | sent | pending
  const [canPostToMarketplace, setCanPostToMarketplace] = useState(null); // null = loading

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) {
        const emailLower = user.email.toLowerCase().trim();
        const allowed = MARKETPLACE_UPLOADERS.some(e => e.toLowerCase().trim() === emailLower);
        console.log("History auth check:", emailLower, "allowed:", allowed);
        setCanPostToMarketplace(allowed);
      } else {
        setCanPostToMarketplace(false);
      }
    });
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["all-reports"],
    queryFn: () => base44.entities.Report.list("-created_date", 100),
  });

  const filtered = reports.filter(r => {
    if (filter === "sent") return r.isSent;
    if (filter === "pending") return !r.isSent;
    return true;
  });

  const sendReport = async (report) => {
    const allEmails = [...(report.sendToEmails || []), ...(report.customEmail ? [report.customEmail] : [])];
    const formData = new FormData();
    formData.append("itemName", report.itemName);
    formData.append("itemType", report.itemType || "");
    formData.append("model", report.model || "");
    formData.append("serialNumber", report.serialNumber || "");
    formData.append("assetNumber", report.assetNumber || "");
    formData.append("action", report.action);
    formData.append("branch", report.branch);
    formData.append("comments", report.comments || "");
    formData.append("sendTo", allEmails.join(","));
    formData.append("sentBy", report.sentBy || "");
    formData.append("photoUrls", (report.photoPaths || []).join(","));

    const response = await fetch("https://asset-wolf-backend.onrender.com/send-asset-report", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Send failed");
    await base44.entities.Report.update(report.id, { isSent: true });
  };

  const handleResend = async (report) => {
    setSendingId(report.id);
    try {
      await sendReport(report);
      queryClient.invalidateQueries({ queryKey: ["all-reports"] });
      toast({ title: "Report sent successfully", className: "bg-green-600 text-white" });
    } catch {
      toast({ title: "Send failed – check connection", className: "bg-orange-500 text-white" });
    }
    setSendingId(null);
  };

  const handleSaveEdit = async (updatedReport) => {
    await base44.entities.Report.update(updatedReport.id, updatedReport);
    queryClient.invalidateQueries({ queryKey: ["all-reports"] });
    setEditingReport(null);
    toast({ title: "Report updated", className: "bg-green-600 text-white" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* AppBar */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-xl font-bold">Report History</span>
        </div>
        <span className="text-sm opacity-80">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Filter tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex gap-2">
        {["all", "sent", "pending"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-20 text-gray-500">
            <p className="text-lg">No reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => {
              const isExpanded = expandedId === report.id;
              return (
                <div key={report.id} className={`rounded-xl border shadow-sm overflow-hidden ${
                  report.action === "Sell" && !report.isPosted ? "bg-orange-50 border-orange-200" :
                  report.action === "Sell" && report.isPosted ? "bg-green-50 border-green-200" :
                  "bg-white"
                }`}>
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{report.itemName}</p>
                        <Badge className={`text-xs ${actionColor[report.action] || "bg-gray-100 text-gray-700"}`}>
                          {report.action}
                        </Badge>
                        <Badge className={`text-xs ${report.isSent ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {report.isSent ? "Sent" : "Pending"}
                        </Badge>
                        {report.action === "Sell" && (
                          <Badge className={`text-xs ${report.isPosted ? "bg-green-200 text-green-800" : "bg-orange-200 text-orange-800"}`}>
                            {report.isPosted ? "✓ Posted" : "Not Posted"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {report.branch}{report.assetNumber ? ` • Asset #${report.assetNumber}` : ""} • {report.created_date ? new Date(report.created_date).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setEditingReport(report); }}>
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleResend(report); }} disabled={sendingId === report.id}>
                        {sendingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-blue-600" />}
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-gray-50 space-y-2 text-sm text-gray-700">
                      {report.itemType && <p><span className="font-medium">Type:</span> {report.itemType}</p>}
                      {report.model && <p><span className="font-medium">Model:</span> {report.model}</p>}
                      {report.serialNumber && <p><span className="font-medium">Serial:</span> {report.serialNumber}</p>}
                      {report.assetNumber && <p><span className="font-medium">Asset #:</span> {report.assetNumber}</p>}
                      {report.comments && <p><span className="font-medium">Notes:</span> {report.comments}</p>}
                      {report.sentBy && <p><span className="font-medium">Sent by:</span> {report.sentBy}</p>}
                      {report.sendToEmails?.length > 0 && (
                        <div>
                          <span className="font-medium">Recipients:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {report.sendToEmails.map(e => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}
                            {report.customEmail && <Badge variant="secondary" className="text-xs">{report.customEmail}</Badge>}
                          </div>
                        </div>
                      )}
                      {report.action === "Sell" && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {canPostToMarketplace === true && (
                            <>
                              <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => window.open(buildCraigslistURL(report), "_blank")}
                              >
                                📋 Post to Craigslist
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => window.open(buildFacebookMarketplaceURL(report), "_blank")}
                              >
                                📘 Post to Facebook
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className={report.isPosted ? "border-gray-400 text-gray-600" : "border-green-600 text-green-700 hover:bg-green-50"}
                            onClick={async () => {
                              await base44.entities.Report.update(report.id, { isPosted: !report.isPosted });
                              queryClient.invalidateQueries({ queryKey: ["all-reports"] });
                            }}
                          >
                            {report.isPosted ? "Unmark as Posted" : "✓ Mark as Posted"}
                          </Button>
                        </div>
                      )}
                      {report.photoPaths?.length > 0 && (
                        <div>
                          <span className="font-medium">Photos:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {report.photoPaths.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(url, "_blank")}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingReport && (
        <EditReportModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSave={handleSaveEdit}
          onResend={handleResend}
        />
      )}
    </div>
  );
}