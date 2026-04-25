import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Send, Loader2, Pencil, ChevronDown, ChevronUp, Download, Printer, Trash2, BarChart2, RotateCcw, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import EditReportModal from "@/components/EditReportModal";
import PrintReportModal from "@/components/PrintReportModal";
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
  "Discard/Part out": "bg-red-100 text-red-700",
  "Need Quote for Customer": "bg-purple-100 text-purple-700",
};

export default function ReportHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [printingReport, setPrintingReport] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | sent | pending
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest
  const [yearFilter, setYearFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [canPostToMarketplace, setCanPostToMarketplace] = useState(null); // null = loading
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const BRANCHES = ["01 McAllen", "02 Weslaco", "03 Harlingen", "05 Brownsville", "06 Corpus", "98 Shop", "99 Warehouse"];
  const ACTIONS = ["Sell", "Repair", "Discard/Part out", "Need Quote for Customer"];

  const exportCSV = () => {
    const rows = filtered.map(r => [
      r.created_date ? new Date(r.created_date).toLocaleString() : "",
      r.assetNumber, r.itemName, r.itemType, r.model, r.serialNumber,
      r.action, r.branch, r.askingPrice ?? "", r.comments,
      r.sentBy, (r.sendToEmails || []).join("; "),
      r.isSent ? "Sent" : "Pending",
    ]);
    const header = ["Date","Asset #","Item Name","Type","Model","Serial #","Action","Branch","Asking Price","Comments","Sent By","Recipients","Status"];
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const branchSuffix = branchFilter !== "all" ? `_${branchFilter.replace(/\s+/g, "-")}` : "";
    const filename = `reports_${dateStr}${branchSuffix}.csv`;
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) {
        const emailLower = user.email.toLowerCase().trim();
        const allowed = MARKETPLACE_UPLOADERS.some(e => e.toLowerCase().trim() === emailLower);
        console.log("History auth check:", emailLower, "allowed:", allowed);
        setCanPostToMarketplace(allowed);
        setCurrentUserEmail(user.email);
        setIsAdmin(user.role === "admin");
      } else {
        setCanPostToMarketplace(false);
      }
    });
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["all-reports"],
    queryFn: async () => {
      return await base44.entities.Report.list("-created_date", 500);
    },
  });

  // Derive available years from loaded reports
  const availableYears = [...new Set(
    reports.map(r => r.created_date ? new Date(r.created_date).getFullYear() : null).filter(Boolean)
  )].sort((a, b) => b - a);

  const handleRestore = async (report) => {
    setRestoringId(report.id);
    const now = new Date().toISOString();
    const logEntry = `${now} | Restored by ${currentUserEmail || "admin"}`;
    const activityLog = [...(report.activityLog || []), logEntry];
    await base44.entities.Report.update(report.id, { isDeleted: false, activityLog });
    queryClient.invalidateQueries({ queryKey: ["all-reports"] });
    toast({ title: "Report restored", className: "bg-green-600 text-white" });
    setRestoringId(null);
  };

  const filtered = reports
    .filter(r => {
      // Always exclude the hardcoded bad record
      if (r.id === "69e6a3a24ab7b520024541fe") return false;
      // Hidden filter
      if (showHidden) {
        if (!r.isDeleted) return false;
      } else {
        if (r.isDeleted) return false;
      }
      if (filter === "sent" && !r.isSent) return false;
      if (filter === "pending" && r.isSent) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (yearFilter !== "all") {
        const year = r.created_date ? new Date(r.created_date).getFullYear() : null;
        if (year !== parseInt(yearFilter)) return false;
      }
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (!r.created_date || new Date(r.created_date) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (!r.created_date || new Date(r.created_date) > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (r.itemName || "").toLowerCase().includes(q) ||
          (r.assetNumber || "").toLowerCase().includes(q) ||
          (r.serialNumber || "").toLowerCase().includes(q) ||
          (r.model || "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.created_date || 0).getTime();
      const db = new Date(b.created_date || 0).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

  const sendReport = async (report) => {
    const allEmails = [...(report.sendToEmails || []), ...(report.customEmail ? [report.customEmail] : [])];
    const reportLink = `${window.location.origin}/report/${report.id}`;
    await base44.functions.invoke("sendAssetReport", {
      reportId: report.id,
      itemName: report.itemName,
      itemType: report.itemType || "",
      model: report.model || "",
      serialNumber: report.serialNumber || "",
      assetNumber: report.assetNumber || "",
      action: report.action,
      branch: report.branch,
      comments: report.comments || "",
      sendTo: allEmails.join(","),
      sentBy: report.sentBy || "",
      photoUrls: (report.photoPaths || []).join(","),
      reportLink,
    });
  };

  const handleResend = async (report) => {
    setSendingId(report.id);
    try {
      await sendReport(report);
      // Optimistically mark as sent in UI immediately
      queryClient.setQueryData(["all-reports"], (old) =>
        (old || []).map(r => r.id === report.id ? { ...r, isSent: true } : r)
      );
      toast({ title: "Report sent successfully", className: "bg-green-600 text-white" });
    } catch {
      toast({ title: "Send failed – check connection", className: "bg-orange-500 text-white" });
    }
    setSendingId(null);
  };

  const handleDelete = async (report) => {
    if (!window.confirm(`Delete "${report.itemName}"? This cannot be undone.`)) return;
    setDeletingId(report.id);
    queryClient.setQueryData(["all-reports"], (old) => (old || []).filter(r => r.id !== report.id));
    try {
      await base44.functions.invoke("adminDeleteReport", { reportId: report.id, deletedBy: currentUserEmail });
      queryClient.invalidateQueries({ queryKey: ["all-reports"] });
    } catch {
      // Already removed from UI
    }
    setDeletingId(null);
  };

  const handleSaveEdit = async (updatedReport) => {
    const now = new Date().toISOString();
    const logEntry = `${now} | Edited by ${currentUserEmail || "unknown"}`;
    const activityLog = [...(updatedReport.activityLog || []), logEntry];
    await base44.entities.Report.update(updatedReport.id, { ...updatedReport, lastEditedAt: now, activityLog });
    queryClient.invalidateQueries({ queryKey: ["all-reports"] });
    setEditingReport(null);
    toast({ title: "Report updated", className: "bg-green-600 text-white" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* AppBar */}
      <div className="bg-blue-700 text-white shadow-md sticky top-0 z-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-2 py-2 flex items-center justify-between relative">
          <button className="text-white p-3 rounded-lg hover:bg-blue-600 active:bg-blue-500 flex items-center gap-1" onClick={() => navigate("/")}>
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-xl font-bold flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/7bc9512a2_wolf_silhouette.png" className="w-8 h-8 rounded-md object-cover" alt="wolf" />
            Asset Wolf
          </span>
          <div className="flex items-center gap-1 p-1">
            <span className="text-xs opacity-75">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
            <button className="text-white p-2 rounded-lg hover:bg-blue-600 active:bg-blue-500" onClick={exportCSV} title="Export CSV">
              <Download className="w-5 h-5" />
            </button>
            {isAdmin && (
              <button
                className={`p-2 rounded-lg active:bg-blue-500 flex items-center gap-1 text-xs font-medium ${showHidden ? "bg-red-500 text-white hover:bg-red-600" : "text-white hover:bg-blue-600"}`}
                onClick={() => setShowHidden(v => !v)}
                title={showHidden ? "Hide deleted reports" : "Show deleted reports"}
              >
                <EyeOff className="w-4 h-4" />
                <span className="hidden sm:inline">{showHidden ? "Hidden" : "Deleted"}</span>
              </button>
            )}
            {canPostToMarketplace && (
              <button className="text-white p-2 rounded-lg hover:bg-blue-600 active:bg-blue-500" onClick={() => navigate("/analytics")} title="Analytics">
                <BarChart2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logged-in user banner */}
      {currentUserEmail && (
        <div className="bg-blue-900 text-blue-200 text-xs text-center py-1 px-4">
          Logged in as: {currentUserEmail}
        </div>
      )}

      {/* Search + Filters */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
        <Input
          placeholder="Search by name, asset #, serial, model..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white"
        />
        <div className="flex flex-wrap gap-2">
          {["all", "sent", "pending"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="px-3 py-1 rounded-full text-sm border bg-white text-gray-600"
          >
            <option value="all">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-1 rounded-full text-sm border bg-white text-gray-600"
          >
            <option value="all">All Actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="px-3 py-1 rounded-full text-sm border bg-white text-gray-600"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <select
            value={yearFilter}
            onChange={e => { setYearFilter(e.target.value); setDateFrom(""); setDateTo(""); }}
            className="px-3 py-1 rounded-full text-sm border bg-white text-gray-600"
          >
            <option value="all">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium">Date range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setYearFilter("all"); }}
            className="px-2 py-1 rounded-lg text-sm border bg-white text-gray-600"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setYearFilter("all"); }}
            className="px-2 py-1 rounded-lg text-sm border bg-white text-gray-600"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </div>
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
                        {report.viewedAt && (
                          <Badge className="text-xs bg-teal-100 text-teal-700">
                            👁 Viewed {new Date(report.viewedAt).toLocaleDateString()}
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
                      {showHidden && isAdmin ? (
                        <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleRestore(report); }} disabled={restoringId === report.id} title="Restore report">
                          {restoringId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 text-green-600" />}
                        </Button>
                      ) : (
                        (isAdmin || canPostToMarketplace || report.created_by === currentUserEmail) && (
                          <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(report); }} disabled={deletingId === report.id}>
                            {deletingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                          </Button>
                        )
                      )}
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setPrintingReport(report); }}>
                        <Printer className="w-4 h-4 text-gray-500" />
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
                      {report.action === "Sell" && report.askingPrice != null && (
                        <p><span className="font-medium">Asking Price:</span> <span className="text-orange-700 font-semibold">${report.askingPrice.toLocaleString()}</span></p>
                      )}
                      {report.comments && <p><span className="font-medium">Notes:</span> {report.comments}</p>}
                      {report.sentAt && <p><span className="font-medium">First Sent:</span> {new Date(report.sentAt).toLocaleString()}</p>}
                      {report.lastSentAt && report.lastSentAt !== report.sentAt && <p><span className="font-medium">Last Resent:</span> {new Date(report.lastSentAt).toLocaleString()}</p>}
                      {report.lastEditedAt && <p><span className="font-medium">Last Edited:</span> {new Date(report.lastEditedAt).toLocaleString()}</p>}
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
                      {report.viewedAt && (
                        <p><span className="font-medium">Viewed By:</span> {report.viewedBy} on {new Date(report.viewedAt).toLocaleString()}</p>
                      )}
                      {report.activityLog?.length > 0 && (
                        <div>
                          <span className="font-medium">Activity Log:</span>
                          <ul className="mt-1 space-y-0.5">
                            {report.activityLog.map((entry, i) => (
                              <li key={i} className="text-xs text-gray-500 font-mono bg-gray-100 rounded px-2 py-0.5">{entry}</li>
                            ))}
                          </ul>
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
      {printingReport && (
        <PrintReportModal
          report={printingReport}
          onClose={() => setPrintingReport(null)}
        />
      )}
    </div>
  );
}