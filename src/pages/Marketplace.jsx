import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MARKETPLACE_UPLOADERS = [
  "awolf@rentalworld.com", "bwolf@rentalworld.com", "brucewolf@rentalworld.com",
  "dcarranza@rentalworld.com", "ealfaro@rentalworld.com", "ggomez@rentalworld.com",
  "jgomez@rentalworld.com", "jjacobson@rentalworld.com", "margog@rentalworld.com",
  "rmelchor@rentalworld.com", "rwolf@rentalworld.com"
];

function buildListing(report) {
  const lines = [];
  lines.push(`🔧 FOR SALE: ${report.itemName}`);
  if (report.itemType) lines.push(`Type: ${report.itemType}`);
  if (report.model) lines.push(`Make/Model: ${report.model}`);
  if (report.serialNumber) lines.push(`Serial #: ${report.serialNumber}`);
  if (report.assetNumber) lines.push(`Asset #: ${report.assetNumber}`);
  if (report.branch) lines.push(`Location: ${report.branch}`);
  if (report.comments) lines.push(`\nCondition / Notes:\n${report.comments}`);
  lines.push("\n📞 Contact us for pricing and availability.");
  return lines.join("\n");
}

function ListingCard({ report }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const listing = buildListing(report);

  const handleCopy = () => {
    navigator.clipboard.writeText(listing);
    setCopied(true);
    toast({ title: "Listing copied to clipboard!", className: "bg-green-600 text-white" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Photos strip */}
      {report.photoPaths?.length > 0 && (
        <div className="flex gap-1 overflow-x-auto p-2 bg-gray-50">
          {report.photoPaths.map((url, i) => (
            <img key={i} src={url} className="h-24 w-24 object-cover rounded flex-shrink-0" />
          ))}
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-base">{report.itemName}</h2>
            <div className="flex flex-wrap gap-1 mt-1">
              {report.itemType && <Badge variant="secondary">{report.itemType}</Badge>}
              {report.branch && <Badge variant="outline">{report.branch}</Badge>}
            </div>
          </div>
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {expanded && (
          <pre className="text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans text-gray-700 border">
            {listing}
          </pre>
        )}

        <Button
          onClick={handleCopy}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {copied ? <><Check className="w-4 h-4 mr-1" /> Copied!</> : <><Copy className="w-4 h-4 mr-1" /> Copy Listing</>}
        </Button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setAuthorized(user && MARKETPLACE_UPLOADERS.includes(user.email));
    });
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports-sell"],
    queryFn: () => base44.entities.Report.filter({ action: "Sell" }, "-created_date"),
    enabled: authorized === true,
  });

  if (authorized === null) return null;

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-gray-600">You don't have access to this page.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="text-white hover:bg-orange-400" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-xl font-bold">🏷️ Marketplace Listings</span>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {isLoading && (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        )}

        {!isLoading && reports.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📦</p>
            <p>No reports marked "Sell" yet.</p>
          </div>
        )}

        {reports.map(report => (
          <ListingCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}