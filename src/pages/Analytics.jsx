import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";

const ALLOWED_USERS = [
  "manny@rentalworld.com", "mannyph2003@hotmail.com", "awolf@rentalworld.com",
  "bwolf@rentalworld.com", "brucewolf@rentalworld.com", "dcarranza@rentalworld.com",
  "ealfaro@rentalworld.com", "ggomez@rentalworld.com", "jgomez@rentalworld.com",
  "jjacobson@rentalworld.com", "margog@rentalworld.com", "rmelchor@rentalworld.com",
  "rwolf@rentalworld.com", "dfulcher@rentalworld.com"
];

const ACTION_COLORS = {
  "Sell": "#f97316",
  "Repair": "#3b82f6",
  "Discard/Part out": "#ef4444",
  "Need Quote for Customer": "#a855f7",
};

const CHART_COLORS = ["#3b82f6", "#f97316", "#10b981", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4"];

// Print styles injected once
const printStyle = `
@media print {
  body * { visibility: hidden; }
  #analytics-print-area, #analytics-print-area * { visibility: visible; }
  #analytics-print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

export default function Analytics() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = printStyle;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) {
        const emailLower = user.email.toLowerCase().trim();
        setCurrentUserEmail(user.email);
        setAuthorized(ALLOWED_USERS.some(e => e.toLowerCase().trim() === emailLower) || user.role === "admin");
      } else {
        setAuthorized(false);
      }
    });
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["analytics-reports"],
    queryFn: () => base44.entities.Report.list("-created_date", 500),
    enabled: authorized === true,
  });

  if (authorized === null || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-gray-700">Access Restricted</p>
        <p className="text-sm text-gray-500">You don't have permission to view analytics.</p>
        <button className="text-blue-600 underline text-sm" onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }

  // --- Data computations ---

  // By Action
  const actionCounts = reports.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {});
  const actionData = Object.entries(actionCounts).map(([name, value]) => ({ name, value }));

  // By Branch
  const branchCounts = reports.reduce((acc, r) => {
    if (r.branch) acc[r.branch] = (acc[r.branch] || 0) + 1;
    return acc;
  }, {});
  const branchData = Object.entries(branchCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Sent vs Pending
  const sentCount = reports.filter(r => r.isSent).length;
  const pendingCount = reports.length - sentCount;
  const sentData = [
    { name: "Sent", value: sentCount },
    { name: "Pending", value: pendingCount },
  ];

  // By Month (last 12 months)
  const monthMap = {};
  reports.forEach(r => {
    if (!r.created_date) return;
    const d = new Date(r.created_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const monthData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));

  // Top Submitters
  const submitterCounts = reports.reduce((acc, r) => {
    if (r.sentBy) acc[r.sentBy] = (acc[r.sentBy] || 0) + 1;
    return acc;
  }, {});
  const submitterData = Object.entries(submitterCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // By Item Type
  const typeCounts = reports.reduce((acc, r) => {
    if (r.itemType) acc[r.itemType] = (acc[r.itemType] || 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* AppBar */}
      <div className="no-print bg-blue-700 text-white shadow-md sticky top-0 z-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-2 py-2 flex items-center justify-between">
          <button className="text-white p-3 rounded-lg hover:bg-blue-600 active:bg-blue-500 flex items-center gap-1" onClick={() => navigate("/history")}>
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-xl font-bold flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/d9798b5fd_Wolficon.png" className="w-8 h-8 rounded-full object-cover" alt="wolf" />
            Analytics
          </span>
          <button
            className="text-white p-3 rounded-lg hover:bg-blue-600 active:bg-blue-500 flex items-center gap-1"
            onClick={() => window.print()}
            title="Print Analytics"
          >
            <Printer className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {currentUserEmail && (
        <div className="no-print bg-blue-900 text-blue-200 text-xs text-center py-1 px-4">
          Logged in as: {currentUserEmail}
        </div>
      )}

      <div id="analytics-print-area" className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-2xl font-bold">Asset Wolf — Analytics Report</h1>
          <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total Reports" value={reports.length} color="blue" />
          <SummaryCard label="Sent" value={sentCount} color="green" />
          <SummaryCard label="Pending" value={pendingCount} color="yellow" />
          <SummaryCard label="For Sale" value={actionCounts["Sell"] || 0} color="orange" />
        </div>

        {/* Reports Over Time */}
        <ChartCard title="Reports Over Time (Last 12 Months)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* By Branch */}
        <ChartCard title="Reports by Branch">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* By Action */}
        <ChartCard title="Reports by Recommended Action">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={actionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {actionData.map((entry, i) => (
                  <Cell key={i} fill={ACTION_COLORS[entry.name] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sent vs Pending Pie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChartCard title="Sent vs. Pending">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Submitters */}
          <ChartCard title="Top Submitters">
            <div className="space-y-2 mt-1">
              {submitterData.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{s.name}</div>
                    <div className="h-2 rounded-full bg-blue-100 mt-0.5">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.round((s.value / submitterData[0].value) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 shrink-0">{s.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Top Item Types */}
        <ChartCard title="Top Asset Types Reported">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}