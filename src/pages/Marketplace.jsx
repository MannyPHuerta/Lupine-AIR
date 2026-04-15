import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { buildCraigslistURL, buildFacebookMarketplaceURL } from "@/lib/marketplaceUtils";
import { BRANCH_DATA } from "@/lib/branchData";

const MARKETPLACE_UPLOADERS = [
  "manny@rentalworld.com", "awolf@rentalworld.com", "bwolf@rentalworld.com", "brucewolf@rentalworld.com",
  "dcarranza@rentalworld.com", "ealfaro@rentalworld.com", "ggomez@rentalworld.com",
  "jgomez@rentalworld.com", "jjacobson@rentalworld.com", "margog@rentalworld.com",
  "rmelchor@rentalworld.com", "rwolf@rentalworld.com"
];

function ListingCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  const branch = BRANCH_DATA[report.branch];

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

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-base">{report.itemName}</h2>
            <div className="flex flex-wrap gap-1 mt-1">
              {report.itemType && <Badge variant="secondary">{report.itemType}</Badge>}
              {report.branch && <Badge variant="outline">{report.branch}</Badge>}
              {report.askingPrice && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  ${Number(report.askingPrice).toLocaleString()}
                </Badge>
              )}
            </div>
            {branch && (
              <p className="text-xs text-gray-500 mt-1">{branch.address} · {branch.phone}</p>
            )}
          </div>
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {expanded && report.comments && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border">{report.comments}</p>
        )}

        {/* List It buttons */}
        <div className="flex gap-2">
          <a
            href={buildCraigslistURL(report)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm">
              <ExternalLink className="w-4 h-4 mr-1" /> Post to Craigslist
            </Button>
          </a>
          <a
            href={buildFacebookMarketplaceURL(report)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
              <ExternalLink className="w-4 h-4 mr-1" /> Post to Facebook
            </Button>
          </a>
        </div>
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