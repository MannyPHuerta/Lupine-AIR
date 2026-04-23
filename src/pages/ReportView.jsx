import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const actionColor = {
  Sell: "bg-orange-100 text-orange-700",
  Repair: "bg-blue-100 text-blue-700",
  "Discard/Part out": "bg-red-100 text-red-700",
  "Need Quote for Customer": "bg-purple-100 text-purple-700",
};

export default function ReportView() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const fetched = await base44.entities.Report.filter({ id });
        const rep = fetched?.[0] || null;

        if (!rep) {
          setError("Report not found.");
          setLoading(false);
          return;
        }

        setReport(rep);

        // Determine viewer identity
        let viewerEmail = "external recipient";
        try {
          const user = await base44.auth.me();
          if (user?.email) viewerEmail = user.email;
        } catch {
          // Not logged in — external recipient
        }

        // Mark as viewed
        await base44.functions.invoke("trackReportView", { reportId: id, viewerEmail });
      } catch (err) {
        setError("Could not load report.");
      }
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{error || "Report not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white shadow-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-4 py-3 flex items-center justify-center gap-2">
          <img
            src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/d9798b5fd_Wolficon.png"
            className="w-8 h-8 rounded-full object-cover"
            alt="wolf"
          />
          <span className="text-xl font-bold">Asset Wolf</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Title + badges */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{report.itemName}</h1>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={actionColor[report.action] || "bg-gray-100 text-gray-700"}>
              {report.action}
            </Badge>
            {report.branch && (
              <Badge variant="secondary">{report.branch}</Badge>
            )}
          </div>

          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {report.itemType && (
                <tr>
                  <td className="py-2 font-medium text-gray-500 w-1/3">Type</td>
                  <td className="py-2 text-gray-800">{report.itemType}</td>
                </tr>
              )}
              {report.model && (
                <tr>
                  <td className="py-2 font-medium text-gray-500">Model</td>
                  <td className="py-2 text-gray-800">{report.model}</td>
                </tr>
              )}
              {report.serialNumber && (
                <tr>
                  <td className="py-2 font-medium text-gray-500">Serial #</td>
                  <td className="py-2 text-gray-800">{report.serialNumber}</td>
                </tr>
              )}
              {report.assetNumber && (
                <tr>
                  <td className="py-2 font-medium text-gray-500">Asset #</td>
                  <td className="py-2 text-gray-800">{report.assetNumber}</td>
                </tr>
              )}
              {report.action === "Sell" && report.askingPrice != null && (
                <tr>
                  <td className="py-2 font-medium text-gray-500">Asking Price</td>
                  <td className="py-2 font-semibold text-orange-700">${report.askingPrice.toLocaleString()}</td>
                </tr>
              )}
              {report.sentBy && (
                <tr>
                  <td className="py-2 font-medium text-gray-500">Submitted By</td>
                  <td className="py-2 text-gray-800">{report.sentBy}</td>
                </tr>
              )}
              {report.created_date && (
                <tr>
                  <td className="py-2 font-medium text-gray-500">Date</td>
                  <td className="py-2 text-gray-800">{new Date(report.created_date).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {report.comments && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Notes / Condition</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{report.comments}</p>
            </div>
          )}
        </div>

        {/* Photos */}
        {report.photoPaths?.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {report.photoPaths.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  className="w-full aspect-square object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, "_blank")}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">Asset Wolf — Rental World</p>
      </div>
    </div>
  );
}