import { useState } from "react";
import { CheckCircle2, XCircle, Minus, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import AppPageHeader from "@/components/AppPageHeader";

const araFeatures = [
  { name: "Credit card processing", demand: 60.12, category: "Payments" },
  { name: "Rate Management", demand: 52.3, category: "Pricing" },
  { name: "Quote & contract management", demand: 48.7, category: "Sales" },
  { name: "Invoice management", demand: 45.2, category: "Accounting" },
  { name: "Export to Excel/CSV", demand: 42.8, category: "Reporting" },
  { name: "Inventory management", demand: 41.5, category: "Inventory" },
  { name: "Analytics", demand: 38.9, category: "Reporting" },
  { name: "Accounting", demand: 36.4, category: "Accounting" },
  { name: "Digital signatures", demand: 34.1, category: "Documents" },
  { name: "Recurring rentals", demand: 31.8, category: "Operations" },
  { name: "Multi-location support", demand: 29.5, category: "Operations" },
  { name: "Recommended items", demand: 27.2, category: "Sales" },
  { name: "Maintenance management", demand: 25.6, category: "Shop" },
  { name: "Inventory management-kit ability", demand: 23.9, category: "Inventory" },
  { name: "Hour meter tracking", demand: 22.1, category: "Telematics" },
  { name: "Subrent tracking (re-rent)", demand: 20.8, category: "Operations" },
  { name: "Late fee calculation", demand: 19.4, category: "Accounting" },
  { name: "Hour meter billing", demand: 18.2, category: "Billing" },
  { name: "Parts inventory management", demand: 17.5, category: "Shop" },
  { name: "Scheduling", demand: 16.8, category: "Operations" },
  { name: "Inspection management", demand: 15.9, category: "Shop" },
  { name: "Relationship management", demand: 15.1, category: "CRM" },
  { name: "GPS delivery routing", demand: 14.3, category: "Delivery" },
  { name: "Employee time clock", demand: 13.7, category: "HR" },
  { name: "Online account management", demand: 12.9, category: "Portal" },
  { name: "Extra shift billing", demand: 12.1, category: "Billing" },
  { name: "Telematics", demand: 11.4, category: "Telematics" },
  { name: "Rating E-commerce", demand: 10.8, category: "Portal" },
  { name: "Safety inspection tracking", demand: 10.2, category: "Shop" },
  { name: "RFID", demand: 9.5, category: "Hardware" },
  { name: "QR Codes", demand: 8.7, category: "Hardware" },
  { name: "Job costing", demand: 7.9, category: "Accounting" },
  { name: "Event space CAD renderings", demand: 6.8, category: "Events" },
  { name: "Rent to own", demand: 1.13, category: "Sales" },
];

const airCapabilities = {
  "Credit card processing": { supported: true, note: "Stripe, Square, PayPal, Amazon Pay,AuthorizeNet, QuickBooks" },
  "Rate Management": { supported: true, note: "Daily/weekly/monthly rates, volume discounts, promo codes" },
  "Quote & contract management": { supported: true, note: "Quotes, reservations, contracts, ARA agreements" },
  "Invoice management": { supported: true, note: "Auto-generated invoices with custom prefixes" },
  "Export to Excel/CSV": { supported: true, note: "Data export functionality available" },
  "Inventory management": { supported: true, note: "Full equipment tracking with status management" },
  "Analytics": { supported: true, note: "AIReports with BI dashboards and leaderboards" },
  "Accounting": { supported: true, note: "Accounting dashboard with P&L, expense tracking" },
  "Digital signatures": { supported: true, note: "Signature pads for agreements and deliveries" },
  "Recurring rentals": { supported: true, note: "V1 launched - weekly/monthly/quarterly schedules, auto-confirm option" },
  "Multi-location support": { supported: true, note: "Branch settings, cross-branch transfers" },
  "Recommended items": { supported: true, note: "AI-powered equipment suggestions and bundles" },
  "Maintenance management": { supported: true, note: "Work orders, maintenance logs, AI repair intel" },
  "Inventory management-kit ability": { supported: true, note: "Serialized and bulk inventory support" },
  "Hour meter tracking": { supported: true, note: "Manual entry at checkout/check-in, hourly billing rates" },
  "Subrent tracking (re-rent)": { supported: false, note: "Not yet implemented" },
  "Late fee calculation": { supported: false, note: "Not yet implemented" },
  "Hour meter billing": { supported: true, note: "Usage-based billing: (end - start) × hourly rate" },
  "Subrent tracking (re-rent)": { supported: true, note: "Mark line items as subrent, track vendor, cost, and markup" },
  "Late fee calculation": { supported: true, note: "Daily automation with company toggle, per-rental override, configurable rates" },
  "Parts inventory management": { supported: true, note: "Parts procurement and tracking" },
  "Scheduling": { supported: true, note: "Delivery scheduling, maintenance scheduling" },
  "Inspection management": { supported: true, note: "Inspection queue and safety checks" },
  "Relationship management": { supported: true, note: "Customer profiles, linked contacts, loyalty program" },
  "GPS delivery routing": { supported: true, note: "Route optimization, GPS tracking integration" },
  "Employee time clock": { supported: true, note: "Timesheets with QR code clock-in" },
  "Online account management": { supported: true, note: "Customer portal and online store" },
  "Extra shift billing": { supported: true, note: "Add extra rental days/shifts to active rentals with automatic billing" },
  "Telematics": { supported: true, note: "GPS provider integrations (Samsara, etc.)" },
  "Rating E-commerce": { supported: true, note: "Online store with intent-based shopping" },
  "Safety inspection tracking": { supported: true, note: "Inspection queue and condition tracking" },
  "RFID": { supported: false, note: "Not yet implemented" },
  "QR Codes": { supported: true, note: "QR code clock-in for timesheets" },
  "Job costing": { supported: true, note: "Major job P&L tracking" },
  "Event space CAD renderings": { supported: true, note: "Event planner with canvas/SVG rendering" },
  "Rent to own": { supported: false, note: "Not yet implemented" },
};

export default function FeatureMatrix() {
  const [filter, setFilter] = useState("all");

  const filteredFeatures = araFeatures.filter(f => {
    if (filter === "all") return true;
    if (filter === "supported") return airCapabilities[f.name]?.supported;
    if (filter === "missing") return !airCapabilities[f.name]?.supported;
    return true;
  });

  const supportedCount = araFeatures.filter(f => airCapabilities[f.name]?.supported).length;
  const missingCount = araFeatures.filter(f => !airCapabilities[f.name]?.supported).length;
  const coveragePercent = ((supportedCount / araFeatures.length) * 100).toFixed(1);

  const handleExport = () => {
    const csv = [
      ["Feature", "Demand %", "Category", "AIR Status", "Notes"].join(","),
      ...araFeatures.map(f => {
        const cap = airCapabilities[f.name] || { supported: false, note: "Unknown" };
        return [
          `"${f.name}"`,
          f.demand,
          f.category,
          cap.supported ? "Supported" : "Not Supported",
          `"${cap.note}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "air-feature-matrix.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Feature Matrix"
        subtitle="ARA requirements vs. AIRental capabilities"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{araFeatures.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Supported</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{supportedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Not Implemented</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{missingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{coveragePercent}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({araFeatures.length})
            </Button>
            <Button
              variant={filter === "supported" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("supported")}
            >
              Supported ({supportedCount})
            </Button>
            <Button
              variant={filter === "missing" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("missing")}
            >
              Missing ({missingCount})
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Feature List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ARA Feature Requirements (Ranked by Operator Demand)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredFeatures.map((feature, idx) => {
                const cap = airCapabilities[feature.name] || { supported: false, note: "Unknown" };
                return (
                  <div
                    key={feature.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 text-sm font-bold text-gray-400">#{idx + 1}</div>
                      <div className="flex-1">
                        <div className="font-medium">{feature.name}</div>
                        <div className="text-xs text-gray-500">{feature.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Demand</span>
                          <span className="font-semibold">{feature.demand}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                            style={{ width: `${feature.demand}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-32">
                        {cap.supported ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Supported</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Not Implemented</span>
                          </div>
                        )}
                      </div>
                      {cap.note && (
                        <Badge variant="outline" className="text-xs max-w-xs truncate">
                          {cap.note}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}