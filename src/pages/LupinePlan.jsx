// Project Lupine — Master Development Trajectory v4.0
// This page renders the full living plan document for internal reference.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';

const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 text-left font-semibold text-gray-800 text-base transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
      </button>
      {open && <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed space-y-3">{children}</div>}
    </div>
  );
};

const Badge = ({ color, children }) => {
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`inline-block border rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

const CheckItem = ({ done, children }) => (
  <div className="flex items-start gap-2 py-0.5">
    <span className={`mt-0.5 text-base ${done ? 'text-green-500' : 'text-gray-400'}`}>{done ? '✅' : '☐'}</span>
    <span className={done ? 'line-through text-gray-400' : ''}>{children}</span>
  </div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded border border-gray-200 my-2">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Code = ({ children }) => (
  <pre className="bg-gray-900 text-green-300 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre leading-relaxed my-2">
    {children}
  </pre>
);

const WarningBox = ({ children }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs my-2">{children}</div>
);

const InfoBox = ({ children }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs my-2">{children}</div>
);

export default function LupinePlan() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/')} className="text-white p-2 rounded-lg hover:bg-indigo-800 flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold tracking-tight">Project Lupine</div>
            <div className="text-indigo-300 text-xs">Master Development Trajectory — v5.0 | April 2026 | Confidential</div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap justify-end items-center">
            <Badge color="green">Phase 0 Active</Badge>
            <Badge color="blue">1,117 Items Extracted</Badge>
            <button
              onClick={() => navigate('/catalog-review')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Review Catalog →
            </button>
            <button
              onClick={() => navigate('/inventory-health')}
              className="bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              📊 Inventory Health →
            </button>
            <button
              onClick={() => navigate('/demand-patterns')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              📈 Demand Patterns →
            </button>
            <button
              onClick={() => navigate('/equipment-status')}
              className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              🔧 Equipment Status →
            </button>
            <button
              onClick={() => navigate('/categories')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              📂 Categories →
            </button>
            <button
              onClick={() => navigate('/availability-config')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              ⚙️ Availability Rules →
            </button>
            <button
              onClick={() => navigate('/customers')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              👥 Customers →
            </button>
            <button
              onClick={() => navigate('/roles')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              🔐 Roles →
            </button>
            <button
              onClick={() => navigate('/audit-logs')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Audit Logs →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-2">

        {/* Foundational Principle */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-5 py-4 mb-6">
          <div className="font-bold text-indigo-900 text-base mb-1">Foundational Principle</div>
          <div className="text-indigo-800 text-sm">
            <strong>Multi-tenant from day one.</strong> Every table, feature, and security decision assumes multiple subscriber businesses sharing infrastructure but fully isolated from each other. Retrofitting multi-tenancy later is the #1 SaaS killer.
          </div>
          <div className="mt-2 text-indigo-700 text-xs font-mono italic">"The floor plan is the order."</div>
        </div>

        {/* Phase 0 */}
        <Section title="⚙️ Phase 0 — Data Migration Wizard  |  Now → Q3 2026" defaultOpen={true}>
          <InfoBox>Goal: Revenue now, clean data for later. This becomes the sales tool — "We migrate you in a day."</InfoBox>

          {/* Migration Philosophy */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-3">
            <div className="font-bold text-green-900 text-sm mb-2">📋 Migration Philosophy — Tiered Archive Model</div>
            <div className="text-green-800 text-xs space-y-2">
              <p>Proven in high-stakes data migrations (including medical EMR transitions): attempting to digitize and migrate every historical record is expensive, error-prone, and almost never necessary. The tiered approach:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div className="bg-white border border-green-200 rounded p-2">
                  <div className="font-semibold text-green-800 mb-1">🗄️ Tier 1 — Archive</div>
                  <div className="text-green-700">Records 2+ years old. Stay in CPro. Never touched. Frozen read-only. Pulled only if legally required.</div>
                </div>
                <div className="bg-white border border-green-200 rounded p-2">
                  <div className="font-semibold text-green-800 mb-1">📁 Tier 2 — Retain In-House</div>
                  <div className="text-green-700">Records under 2 years, not currently active. Kept accessible in CPro. Archived at the 2-year mark naturally.</div>
                </div>
                <div className="bg-white border border-green-200 rounded p-2">
                  <div className="font-semibold text-green-800 mb-1">✅ Tier 3 — Active / New</div>
                  <div className="text-green-700">Active contracts digitized as needed at cutover. All new business created in Lupine from day one.</div>
                </div>
              </div>
              <p className="mt-2 font-medium">CPro remains live (read-only) for 12 months post-cutover. Frozen and archived after that. Never deleted.</p>
            </div>
          </div>

          {/* What to migrate */}
          <div className="font-semibold text-gray-800 mb-2 mt-3">Migration Scope — Intentional Decisions</div>
          <Table
            headers={['Data Type', 'Action', 'Rationale']}
            rows={[
              ['Equipment catalog', '✅ Full extraction → Lupine', 'Core operational data — already done'],
              ['Customer records (active)', '✅ Extract → Lupine', 'Needed for day-one operations'],
              ['Customer records (inactive <2yr)', '📁 Retain in CPro', 'Available on request; archive at 2yr mark'],
              ['Customer records (2yr+)', '🗄️ Archive in CPro', 'Frozen; never migrated'],
              ['Vendor records', '✅ Extract → Lupine + QB', 'Needed for parts/purchasing workflow'],
              ['Open/active contracts', '✅ Manual transfer at cutover', 'Small number; faster to enter than migrate'],
              ['Rental rate tables', '✅ Extract if readable, else re-enter', 'TBD on APro format'],
              ['AR history / invoices', '❌ Stay in CPro', 'Historical reference only; not operational'],
              ['Payment / ledger history', '❌ Stay in CPro', 'CPro is the archive — do not duplicate'],
              ['Payroll history', '❌ Stay in CPro', 'Legal retention in original system'],
              ['Tax records', '❌ Stay in CPro', 'Never migrated — original system is the record'],
            ]}
          />

          {/* QuickBooks */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-3 text-xs text-blue-800">
            <div className="font-bold mb-1">💼 QuickBooks Integration at Cutover</div>
            <p>If subscriber already has QuickBooks: customer list and vendor list import via CSV in minutes. Opening AR balances entered as a single journal entry by their bookkeeper (1–2 hours of work, not a migration). Historical invoices stay in CPro — importing them into QB creates reconciliation nightmares and is never worth the effort.</p>
            <p className="mt-1">If subscriber is NOT on QuickBooks yet: one-time QB setup (chart of accounts, opening balances) with a bookkeeper. A few hours, not a software project. Subscriber's chart of accounts can be seeded from APro extraction if the data is readable.</p>
            <p className="mt-1 font-medium">Rate tables live in Lupine entirely — QB doesn't do rental rate management.</p>
          </div>

          {/* Cutover Strategy */}
          <div className="font-semibold text-gray-800 mb-2 mt-3">Cutover Strategy</div>
          <Code>{`Pre-Cutover (CPro still primary)
  · All new quotes still go into CPro
  · Lupine running parallel — catalog live, staff training
  · Migration team extracting and validating data

Cutover Day
  · Customer records (active) loaded into Lupine ✅
  · Equipment catalog live in Lupine ✅
  · Open contracts transferred manually (small number) ✅
  · Opening AR balances recorded in QB as lump entry ✅
  · CPro switched to read-only for staff reference

Post-Cutover
  · All new business → Lupine only
  · CPro read-only for 12 months (staff can look up old records)
  · Old contracts close naturally in CPro
  · CPro frozen and archived after 12 months
  · Never deleted — legal and tax record preserved`}</Code>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 my-2 text-xs text-indigo-800">
            <strong>The subscriber pitch:</strong> "Historical financial records remain in CPro, which stays live in read-only mode for 12 months. Your bookkeeper records opening balances in QuickBooks in an afternoon. All new business from cutover forward runs through Lupine + QuickBooks. This is cleaner, faster, and eliminates the reconciliation risk of migrating years of transaction history into a new system. This is a feature, not a limitation."
          </div>

          <div className="font-semibold text-gray-800 mt-4 mb-2">CPro Extraction Track</div>
          <CheckItem done>Binary file extractors (cuaux, inv, TPS/DBF)</CheckItem>
          <CheckItem done>Equipment catalog extracted (1,117 items)</CheckItem>
          <CheckItem>Field mapping UI with AI-assisted suggestions</CheckItem>
          <CheckItem>Deduplication and conflict resolution</CheckItem>
          <CheckItem>Staged import with preview/approval before commit</CheckItem>
          <CheckItem>Active customer records extraction</CheckItem>

          <div className="font-semibold text-gray-800 mt-4 mb-2">APro Extraction Track <span className="text-gray-400 font-normal text-xs">(narrowed scope — accounting history stays in APro)</span></div>
          <CheckItem>APro binary format analysis and schema mapping</CheckItem>
          <CheckItem>Vendor records extraction → Lupine + QB import</CheckItem>
          <CheckItem>Rental rate table extraction (if format permits)</CheckItem>
          <CheckItem>Cross-reference CPro ↔ APro account numbers for customer matching</CheckItem>
          <CheckItem>Chart of accounts extraction → seeds QB setup (if subscriber needs it)</CheckItem>

          <div className="font-semibold text-gray-800 mt-4 mb-2">Migration Infrastructure</div>
          <CheckItem>Export to standard formats (CSV, JSON)</CheckItem>
          <CheckItem>Migration session history and rollback</CheckItem>
          <CheckItem>Data validation report before commit</CheckItem>
          <CheckItem>Cutover checklist tool — tracks readiness across all migration tasks</CheckItem>
        </Section>

        {/* Phase 1 */}
        <Section title="🏗️ Phase 1 — Core Data Model & Back-End  |  Q3 → Q4 2026">
          <InfoBox>Goal: The foundation everything else sits on. Get this wrong and you're rebuilding forever.</InfoBox>

          <div className="font-semibold text-gray-800 mb-2">Equipment Catalog</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Master item catalog seeded from CPro extraction</li>
            <li>Category hierarchy (Equipment → Power → Generators → Portable)</li>
            <li>Attributes engine — each category has different specs (voltage, CFM, tonnage)</li>
            <li>Unit inventory — serialized assets vs. bulk items (chairs, tables)</li>
            <li>Condition tracking: New, Good, Fair, Needs Repair, Retired</li>
            <li>Location/branch assignment, initial cost, purchase date, depreciation schedule</li>
            <li>Per-category anchoring requirements and surface specs (tent-specific)</li>
            <li>Maintenance log per unit</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-4 mb-2">Availability Engine <span className="text-red-600 font-normal text-xs">(the hardest problem in rental)</span></div>
          <Code>{`✅ Available
📋 Reserved
🚚 Out on Rental
🔧 In Shop — Mechanical (ETA: Thursday)
⏳ Awaiting Parts (ETA: Unknown / Est. Monday)
🧺 In Laundry/Cleaning (ETA: Today 3pm)
🔍 Under Inspection
❌ Retired`}</Code>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Real-time availability by branch and date range</li>
            <li>Configurable buffer time per equipment category</li>
            <li>Cross-branch availability visibility</li>
            <li>Overbooking rules configurable per subscriber</li>
            <li><strong>"Available" only flips when a human marks it Ready — never automatic on return</strong></li>
          </ul>

          <div className="font-semibold text-gray-800 mt-4 mb-2">Contract & Order Management</div>
          <Code>{`Quote → Reservation → Contract → Out → Return`}</Code>
          <div className="font-semibold text-gray-700 text-xs mt-2 mb-1">Dynamic Discounting Engine</div>
          <Table
            headers={['Type', 'Example', 'Applied By']}
            rows={[
              ['Duration discount', '7+ days = 15% off', 'Automatic'],
              ['Volume discount', '50+ chairs = 10% off', 'Automatic'],
              ['Loyalty discount', 'Top customers = 5% always', 'Account-level'],
              ['Manual override', 'Counter staff enters % or $', 'Staff (configurable ceiling)'],
              ['Manager override', 'Any amount', 'Manager PIN'],
              ['Promo code', 'SUMMER10 = 10% off', 'Customer self-service'],
              ['Package deal', 'Tent + chairs + tables = bundle', 'Catalog-defined'],
              ['Negotiated rate', 'Specific customer contract price', 'Account-level'],
            ]}
          />
          <div className="text-xs text-gray-600">Every discount logged: who, when, reason code. Discount report available to management.</div>

          <div className="font-semibold text-gray-700 text-xs mt-3 mb-1">Return Method Flag (all item types)</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>🚚 Company Pickup — Field Ops schedules recovery</li>
            <li>🙋 Customer Return — applies to heavy equipment, chairs, tables, linens, small tools</li>
            <li>📦 Customer Ships — remote customers</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-4 mb-2">Customer Records</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Contact info, ID verification, rental history, credit holds, blacklist flags</li>
            <li>Company vs. individual accounts; linked contacts (one company, multiple authorized renters)</li>
            <li>Payment terms per account (Net 30/60 for municipal/corporate)</li>
            <li>Tax exemption certificates stored per customer</li>
          </ul>
        </Section>

        {/* Phase 2 */}
        <Section title="🔒 Phase 2 — Security Architecture  |  Q3 2026 (parallel with Phase 1)">
          <InfoBox>Goal: Designed in from the start — never bolted on later.</InfoBox>
          <Code>{`Platform (Lupine)
  └── Subscriber (e.g. Rental World LLC)
        ├── Branch (McAllen, Weslaco, Harlingen...)
        │     ├── Branch Manager
        │     ├── Counter Staff
        │     ├── Event Planner
        │     ├── Driver / Field Crew
        │     ├── Shop Mechanic
        │     └── Laundry / Cleaning Staff
        └── Customer
              ├── Individual
              └── Business / Municipal Account`}</Code>
          <Table
            headers={['Role', 'Access Scope']}
            rows={[
              ['Platform Admin', 'Full access across all subscribers'],
              ['Subscriber Admin', 'Full access within their tenant'],
              ['Branch Manager', 'Full access within their branch(es)'],
              ['Counter Staff', 'Create/edit orders, view inventory'],
              ['Event Planner', 'Full event module + planner sandbox + bid tools'],
              ['Shop Mechanic', 'Work orders, parts, shop queue'],
              ['Laundry Staff', 'Cleaning queue, status updates'],
              ['Driver', 'Assigned deliveries, status updates, photo capture'],
              ['Customer (Portal)', 'Own contracts, reservations, floor plans, invoices'],
            ]}
          />
          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
            <li>SSO option (Google Workspace, Microsoft 365) for staff</li>
            <li>Customer identity verification (driver's license scan + liveness check)</li>
            <li>Audit log — every record change tracked with who/when</li>
            <li>Section initials captured with timestamp, IP, device fingerprint (bid workflow)</li>
            <li>Subscriber branding isolation (white-label domains)</li>
          </ul>
        </Section>

        {/* Phase 3 */}
        <Section title="🖥️ Phase 3 — Staff & Counter Application  |  Q4 2026 → Q1 2027">
          <InfoBox>Goal: A good counter person should complete a contract in under 3 minutes.</InfoBox>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Full keyboard navigation (Tab order, hotkeys, barcode scanner input)</li>
            <li>Quick search — any part of item name, customer name, contract number</li>
            <li>Split-screen: customer info left, order building right</li>
            <li>Signature capture — Topaz SigWeb at counter, touch on tablet, remote e-signature for portal</li>
            <li>All signatures: timestamp, IP/device metadata, contract reference</li>
          </ul>
          <div className="font-semibold text-gray-800 mt-3 mb-1">Manager Dashboard</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Branch availability at a glance; today's outs and expected returns</li>
            <li>Overdue contracts flagged; revenue vs. prior period</li>
            <li>Equipment utilization rates</li>
            <li>Shop queue and laundry queue backlog visible side-by-side</li>
          </ul>
        </Section>

        {/* Phase 4 */}
        <Section title="🚚 Phase 4 — Field Ops Module  |  Q1 → Q2 2027">
          <InfoBox>Goal: Turn drivers into a professional last-mile logistics operation. Eliminate "he said/she said" damage disputes forever.</InfoBox>

          <div className="font-semibold text-gray-800 mb-1">Delivery Workflow</div>
          <Code>{`Dispatched → Departed → [Driver-triggered SMS] → Arrived →
Setup/Install → Condition Photos → Customer Signature →
Complete → Returning to Branch`}</Code>

          <div className="font-semibold text-gray-800 mb-1">Recovery Workflow</div>
          <Code>{`Recovery Scheduled → Departed → Arrived →
Condition Photos → Loaded → Returning to Branch →
Returned to Branch → Inspection Queue`}</Code>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Driver Mobile App</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Delivery/pickup manifest; multi-stop route optimization</li>
            <li>Pre-departure checklist — confirm item count before leaving branch</li>
            <li>SMS notifications — <strong>driver-triggered only</strong> (never automatic)</li>
            <li>Live GPS share — <strong>toggleable by driver</strong>, one tap to kill; manager always has full visibility</li>
            <li>Customer not-home workflow — photo + notification + hold protocol</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Photo & Signature Capture</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Required step — app blocks "Complete" without minimum 1 photo</li>
            <li>Auto-tagged with GPS + timestamp + contract number</li>
            <li>Required angle system per equipment category (defined in catalog)</li>
            <li><strong>Side-by-side comparison at recovery:</strong> delivery photo shown while driver frames recovery shot</li>
            <li>Both photos stored together, timestamped, GPS-tagged, tamper-evident</li>
            <li>Damage flagged → auto-generates damage note on contract</li>
            <li>One-tap Claim Package: PDF with side-by-side photos, timestamps, GPS, signature — insurance-ready</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">GPS & Fleet Tracking</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Integrate with fleet APIs (Samsara, Verizon Connect, Geotab) — do not build hardware</li>
            <li>Driver phone as fallback; manager dispatch map with real-time status</li>
            <li>Geofencing — arrival at job site auto-prompts status update</li>
            <li>Driver tracking active only during open deliveries (configurable)</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-4 mb-1">Return to Inventory — Two-Track System</div>

          <div className="font-semibold text-gray-700 text-xs mt-2 mb-1">Track A — Mechanical / Shop</div>
          <Code>{`Flagged for Repair → Work Order Created → Parts Research →
Parts Ordered [Awaiting Parts] → Parts Received →
Repair Scheduled → In Repair → QC Check → Ready to Rent`}</Code>

          <div className="font-semibold text-gray-700 text-xs mt-2 mb-1">Track B — Cleaning / Laundry</div>
          <Code>{`Returned → Laundry Intake → Cleaning Queue →
In Progress → Inspection → Folded/Stored → Ready to Rent`}</Code>

          <WarningBox>"Available" only flips when a human marks it Ready — never automatic on return. Both tracks feed the same availability calendar with distinct ETAs.</WarningBox>
        </Section>

        {/* Phase 5 */}
        <Section title="🎪 Phase 5 — Event Planning Module  |  Q2 → Q3 2027">
          <InfoBox>Goal: The PartyCad replacement — live-inventory-linked floor plan tool that no competitor has built. The moat.</InfoBox>

          <div className="font-semibold text-gray-800 mb-2">Three Event Modes</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
              <div className="font-semibold text-blue-800 text-xs mb-1">🎂 Quick Events</div>
              <div className="text-xs text-blue-700">Birthdays, simple parties. Package-based, self-service. Wind monitoring for inflatables. Smart suggestions.</div>
            </div>
            <div className="border border-purple-200 bg-purple-50 rounded-lg p-3">
              <div className="font-semibold text-purple-800 text-xs mb-1">💍 Full Event Design</div>
              <div className="text-xs text-purple-700">Weddings, quinceañeras, corporate. Full canvas, multi-stakeholder access, living quotes, customer approval workflow.</div>
            </div>
            <div className="border border-red-200 bg-red-50 rounded-lg p-3">
              <div className="font-semibold text-red-800 text-xs mb-1">🏛️ Municipal / Large Scale</div>
              <div className="text-xs text-red-700">AI Bid Intelligence, multi-zone canvas, permit tracker, ADA engine, crowd flow, Net 30/60 billing.</div>
            </div>
          </div>

          <div className="font-semibold text-gray-800 mt-3 mb-1">The Canvas</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>HTML5 Canvas / SVG drag-and-drop (Fabric.js or Konva.js)</li>
            <li>Pre-built shape library: tents, tables, chairs, staging, dance floor, barriers, restrooms</li>
            <li>Upload venue photo/floor plan as background → design on top</li>
            <li>Measurement tools, scale to actual venue dimensions</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Live Inventory Link — The Magic Thread</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Every canvas object IS a rental item — not a symbol</li>
            <li>Drag item onto canvas → availability checked → soft reservation held → added to quote</li>
            <li>Remove from canvas → off quote, reservation released</li>
            <li><strong>The floor plan IS the order — no separate data entry</strong></li>
          </ul>
          <Code>{`🟢 Green    — Available
🟡 Yellow   — Partial (some units unavailable)
🔴 Red      — Unavailable
🔵 Blue     — In laundry, ETA before event
⚠️ Orange   — In shop, pending repair`}</Code>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Smart Equipment Suggestion Engine</div>
          <Table
            headers={['Trigger', 'Suggestion']}
            rows={[
              ['No power source + outdoor', 'Generator (sized by equipment on order)'],
              ['Summer + outdoor + RGV', 'Evaporative coolers / portable AC'],
              ['Winter + outdoor', 'Propane patio heaters'],
              ['Event past sunset', 'Flood lamps / string light packages'],
              ['500+ guests + public', 'Road barriers, entry gates, stanchions'],
              ['Inflatable on order, no generator', 'Generator auto-suggested'],
              ['Concrete surface + tent', 'Water barrels (qty auto-calculated by wind load)'],
              ['Bar zone on floor plan', 'Bar tables, stools, ice chests, wristband station'],
            ]}
          />
          <div className="text-xs text-gray-600">All suggestions one-tap to add — lands on canvas and quote simultaneously.</div>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Surface & Anchoring System</div>
          <Table
            headers={['Surface', 'Method', 'Auto-Added Equipment']}
            rows={[
              ['Grass / soft soil', 'Stake & rebar', 'Rebar stakes'],
              ['Hard clay / caliche', 'Long rebar + water', 'Extended rebar'],
              ['Asphalt (drillable)', 'Core drill + epoxy', 'Drill service fee'],
              ['Asphalt / Concrete (no drill)', 'Water barrel ballast', 'Barrels (calculated qty)'],
              ['Pavers / decorative', 'Ballast + rubber mats', 'Barrels + mats'],
              ['Rooftop / elevated', '🚫 Blocked — engineer cert required', 'Upload field unlocked'],
              ['Beach / sand', 'Screw anchors + guy wires', 'Screw anchor set'],
            ]}
          />

          <div className="font-semibold text-gray-800 mt-3 mb-1">ADA Compliance Engine</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Live pathway width — turns red if &lt; 60"</li>
            <li>Accessible route highlighted from entry to every zone</li>
            <li>Required accessible seating calculated from guest count</li>
            <li>Stage ramp/lift flag if height &gt; 6"</li>
            <li>ADA Audit Report: ✅ Pass / ❌ Fail / ⚠️ Warning, linked to canvas elements</li>
            <li>Planner sign-off with name and date; report attached to permits and bid packages</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Permit Tracker (per event)</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Status: Not Started / Applied / Pending / Approved / Denied / Not Required</li>
            <li>Deadline alerts at 2 weeks, 1 week, 3 days if still pending</li>
            <li>Permit contacts directory — reused across events</li>
            <li>Jurisdiction library grows over time (McAllen requires X, Edinburg requires Y)</li>
            <li>Types: Fire Marshal, Temporary Structure, Health Dept, Electrical, Noise Variance, Alcohol/TABC, Parking/Traffic</li>
          </ul>
        </Section>

        {/* Phase 5 - AI Bid Intelligence */}
        <Section title="🏆 Phase 5 — AI Bid Intelligence  |  Premium Feature  |  Q2 → Q3 2027">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-indigo-800 text-sm mb-3">
            <strong>The pitch:</strong> "Upload the RFQ. Lupine reads it, builds the bid, and walks you through it for approval. What used to take a day takes an hour — and you never miss a requirement again."
          </div>

          <div className="font-semibold text-gray-800 mb-1">Step 1 — Upload & Parse</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Accepts PDF, Word, Excel — whatever the issuing authority sends</li>
            <li>AI extracts: authority name, RFQ number, submission deadline, event details, equipment line items, technical specs, insurance requirements, certifications required, submission format, evaluation criteria</li>
            <li>Submission deadline auto-added to Permit Tracker</li>
            <li>Parsed summary presented to planner for confirmation before draft is generated</li>
            <li>AI flags gaps immediately: missing certifications, unmatched specs, unknown requirements</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Step 2 — AI Drafts Full Bid Response</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Subscriber profile: company info, certifications, insurance docs</li>
            <li>Equipment catalog: AI matches RFQ line items to actual inventory with availability check</li>
            <li>Pricing engine: rate tables applied, totals calculated</li>
            <li>Pre-approved cover letter and T&C boilerplate</li>
            <li>ADA compliance report and site plan from canvas (if already built)</li>
          </ul>
          <WarningBox>AI flags what it cannot fill: "⚠️ Fire-rated tent certification required — attach manufacturer cert for Tent #T-004" | "⚠️ 3 municipal references required — only 1 on file"</WarningBox>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Step 3 — Section-by-Section Review & Initialing</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Progress tracker (Section 3 of 7)</li>
            <li>Each section fully editable: adjust pricing, override AI matches, add/remove line items</li>
            <li>Planner initials each section upon review</li>
            <li><strong>Initials captured with: planner name, timestamp, IP address, device fingerprint</strong></li>
            <li>Same legal standing as initialing a paper document — more auditable</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Step 4 — Submission Requirements Checklist</div>
          <Code>{`✅ Cover letter                  — Generated
✅ Itemized bid response         — Reviewed & initialed
✅ Certificate of insurance      — Generated (named insured filled)
⚠️ Fire-rated tent cert         — [UPLOAD REQUIRED]
⚠️ Municipal references (3)     — Only 1 on file [ADD MORE]
✅ Site plan                     — From Event Planner canvas
✅ ADA compliance report         — Attached
✅ Project timeline              — Generated

Cannot submit until ⚠️ items resolved.`}</Code>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Step 5 — Final Approval & Submission Package</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Planner certifies with full name, title, date, and final signature</li>
            <li>Complete bid package PDF generated (all sections + all attachments)</li>
            <li>Submission copy stored permanently in Lupine (win or lose, it's on record)</li>
            <li>Calendar reminder set for award announcement date (if in RFQ)</li>
            <li>Win/loss tracked over time</li>
          </ul>

          <div className="font-semibold text-gray-800 mt-3 mb-1">Bid Intelligence — Grows Smarter Over Time</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>"You've won 8 of 9 bids at this price range for this item category"</li>
            <li>"McAllen typically awards to 2nd-lowest bid — your pricing is currently highest" (from public records)</li>
            <li>"This authority always requires fire marshal pre-approval — added to permit tracker"</li>
            <li>"Your Edinburg Livestock Show contract is your strongest reference for this bid type"</li>
          </ul>
        </Section>

        {/* Phase 5 - Planner Command Center */}
        <Section title="📌 Phase 5 — Planner's Command Center  |  Q2 → Q3 2027">
          <InfoBox>Personal to each planner — their own workspace, not a shared dashboard.</InfoBox>
          <Code>{`┌─────────────────────────────────────────────────────┐
│ 🔴 ACTION REQUIRED                                  │
│  · Balance unpaid / overdue                         │
│  · Permit deadline approaching (4 days)             │
│  · Customer change request pending                  │
│  · Bid checklist item unresolved                    │
│  · RFQ submission deadline approaching              │
├─────────────────────────────────────────────────────┤
│ 🟡 THIS WEEK — Events + Active Bids                 │
│  · Events with status and flags                     │
│  · Active bids with days-to-deadline                │
├─────────────────────────────────────────────────────┤
│ 📋 PIPELINE                                         │
│  Events: Leads · Quoted · Confirmed · Active        │
│  Bids:   Drafting · In Review · Submitted · Awarded │
├─────────────────────────────────────────────────────┤
│ 📌 MY NOTES & ACTION ITEMS                          │
│  Linked to events, permits, or bids                 │
│  Private — not visible to customers or staff        │
│  Due dates with alerts; "Flag for manager" option   │
├─────────────────────────────────────────────────────┤
│ 💬 RECENT MESSAGES                                  │
│  Customer messages + one-tap canvas actions         │
└─────────────────────────────────────────────────────┘`}</Code>
        </Section>

        {/* Phase 5.5 */}
        <Section title="🌐 Phase 5.5 — Customer-Facing Website & Online Ordering  |  Q3 → Q4 2027">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Real-time availability calendar per item; branch selector by zip code</li>
            <li>Rich item pages — photos, specs, inclusions</li>
            <li>Online reservation flow: browse → dates → ID verification → e-signature → payment → confirmation</li>
            <li>Customer account portal: rentals, invoices, payment method, extension requests</li>
            <li>View delivery photos and condition records</li>
            <li>Event floor plan access and customer approval workflow</li>
          </ul>
        </Section>

        {/* Phase 6 */}
        <Section title="💰 Phase 6 — Accounting & Financial Integration  |  Q4 2027">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Daily/weekly/monthly revenue by branch, category, item</li>
            <li>Outstanding invoices, aging report, damage claims tracking</li>
            <li>Progress billing for large/municipal events; bid win/loss financial tracking</li>
            <li>ROI per asset (revenue vs. purchase + parts + maintenance)</li>
            <li>Utilization rate, depreciation schedules, replacement trigger alerts</li>
            <li>QuickBooks / Xero sync: invoices, payments, customers</li>
            <li>Chart of accounts mapping seeded from APro extraction</li>
            <li>Time & attendance per department; overtime flagging; export to ADP/Gusto</li>
          </ul>
          <WarningBox><strong>Don't build accounting.</strong> Integration wins over replacement every time. Rental companies already live in QuickBooks.</WarningBox>
        </Section>

        {/* Phase 7 */}
        <Section title="🧠 Phase 7 — Intelligence & Reporting  |  Q4 2027 → 2028">
          <div className="font-semibold text-gray-800 mb-1">Operational Reports</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Equipment utilization by branch, category, season</li>
            <li>Customer lifetime value; reservation funnel analysis</li>
            <li>Damage frequency by item category; discount usage (where is margin going?)</li>
            <li>Permit compliance history; setup crew performance</li>
            <li>Bid win/loss by authority, category, price range</li>
          </ul>
          <div className="font-semibold text-gray-800 mt-3 mb-1">Demand Forecasting</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Seasonal inventory recommendations; cross-branch rebalancing suggestions</li>
            <li>"You'll likely need 40 extra chairs the week of Cinco de Mayo"</li>
          </ul>
          <div className="font-semibold text-gray-800 mt-3 mb-1">AI Opportunities (future)</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Natural language equipment search; damage assessment from photos</li>
            <li>Predictive maintenance from rental hours</li>
            <li>Floor plan auto-suggest from event type + guest count</li>
            <li>Bid pricing optimization from historical win/loss data</li>
          </ul>
        </Section>

        {/* Master Timeline */}
        <Section title="📅 Master Timeline" defaultOpen={true}>
          <Code>{`2026
├── Q2 (Now)     ✅ Phase 0 in progress
│                   CPro extraction complete (1,117 items)
│                   APro analysis beginning
├── Q3           Phase 0 complete (CPro + APro migrated)
│                Phase 1 & 2 begin (Data Model + Security)
└── Q4           Phase 1 & 2 complete
                 Phase 3 begins (Counter App + Manager Dashboard)

2027
├── Q1           Phase 3 complete
│                Phase 4 begins (Field Ops)
├── Q2           Phase 4 complete (Delivery, Recovery, Two-Track Maintenance)
│                Phase 5 begins (Event Planning Module)
├── Q3           Phase 5 complete
│                  — Event Planner + Canvas + Live Inventory Link
│                  — AI Bid Intelligence (premium)
│                  — Planner Command Center
│                Phase 5.5 begins (Customer Website + Online Ordering)
└── Q4           Phase 5.5 complete
                 Phase 6 begins (Accounting Integration)
                 Phase 7 begins (Intelligence — parallel)

2028
├── Q1-Q2        Phase 6 & 7 mature
│                Additional modules: Claims, Vendor/Parts, Website Builder
└── Q3+          v2.0 — AI pricing optimization, advanced forecasting,
                 potential standalone Event Planner product,
                 marketplace expansion`}</Code>
        </Section>

        {/* Risk Flags */}
        <Section title="⚠️ Key Risk Flags">
          <Table
            headers={['Risk', 'Mitigation']}
            rows={[
              ['Availability engine complexity', 'Prototype early, stress test with CPro data'],
              ['APro format unknown until analyzed', 'Discovery sprint before committing timeline'],
              ['Multi-tenancy data isolation', 'Enforce at DB level, not just app level'],
              ['Driver mobile app adoption', '3 taps max per action — simplicity non-negotiable'],
              ['QuickBooks API changes', 'Abstract integration layer'],
              ['Photo storage costs at scale', 'Compress on capture, lifecycle policies on old contracts'],
              ['South Texas connectivity gaps', 'Full offline mode for driver app, sync on reconnect'],
              ['Municipal bid compliance requirements', 'Jurisdiction library grows over time'],
              ['Canvas performance at scale', 'Virtualize canvas objects above threshold count'],
              ['Wind load / anchoring liability', 'Manufacturer specs stored; deviations flagged, never overridden'],
              ['AI bid parsing accuracy', 'Human confirmation required before any draft is generated'],
              ['RFQ format variability', 'AI trained on multiple formats; graceful fallback to manual entry'],
            ]}
          />
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-6 border-t border-gray-200 mt-4">
          <div className="font-semibold text-gray-600 mb-1">Project Lupine — v5.0 | April 2026</div>
          <div>Confidential — Rental World LLC</div>
          <div className="mt-1 italic">"The floor plan is the order."</div>
        </div>
      </div>
    </div>
  );
}