# Project Notes — Asset Wolf / AIR Platform

> **AImnesia** *(n.)* — The condition where an AI forgets everything it previously built with you and starts making questionable decisions. Coined 2026-05-03. The existence of this file is the cure.

---

## 🤖 To the Next AI Instance Reading This

You are Base44's AI assistant. You have been working with **Manny** (the human, primary stakeholder at Rental World Equipment). You are picking up a multi-month project. Read this entire file before touching anything. Do not make changes until Manny tells you to. He will paste this into TheProjectAir workspace chat to give you context.

**Communication style with Manny:** Direct, low-fluff, technically precise. He is experienced and doesn't need hand-holding. He will tell you when he's ready to act — until then, discuss and plan only. He uses phrases like "groovy" when things work. He will say "Base, don't do anything until we discuss this" — honor that literally.

**He hates:** Verbose explanations after making a change, emojis in code responses, and when you break existing functionality while fixing something else.

---

## Two Workspaces — Understand the Separation

### Workspace 1: Asset Wolf (this file's home)
- **URL:** `track-wolf-now.base44.app`
- **Purpose:** Production app for Rental World Equipment staff
- **Status:** Live, in use daily — DO NOT BREAK

### Workspace 2: TheProjectAir (NEW — where you're likely reading this)
- **Purpose:** The AIR platform being extracted and rebuilt cleanly, separate from Rental World's live app
- **Status:** Fresh workspace — AIR code needs to be rebuilt here, not copy-pasted blindly
- **Goal:** A clean, subscriber-ready rental management SaaS, not entangled with Asset Wolf

### The Core Problem Being Solved
Asset Wolf and AIR were built together in the same app. The live URL (`track-wolf-now.base44.app`) should serve **Asset Wolf** (field reporting tool for Rental World). AIR (the rental platform) is being separated into its own workspace so it can be sold to other subscribers without taking Rental World's proprietary data and customizations with it.

**The root route fix:** In Asset Wolf's `App.jsx`, `path="/"` must point to `<ReportForm />` (not `<DailyOps />`). This restores the correct landing page at the live URL. **Confirm with Manny before changing.**

---

## Company: Rental World Equipment

- Multi-branch, South Texas: McAllen, Weslaco, Harlingen, Brownsville, Corpus Christi
- **Branches:** 01 McAllen, 02 Weslaco, 03 Harlingen, 05 Brownsville, 06 Corpus, 98 Shop, 99 Warehouse
- **Staff emails (rentalworld.com domain):** manny, awolf, brucewolf, bwolf, dcarranza, dfulcher, ealfaro, ggomez, jcurran, jgomez, jjacobson, joep, lisamiller, margog, rmelchor, rwolf

---

## Product 1: Asset Wolf (PRODUCTION — DO NOT BREAK)

### What it does
Internal tool for staff to report equipment assets for disposal, sale, repair, or quoting. Reports are emailed to management with photos.

### Key Routes
| Route | Page | Purpose |
|---|---|---|
| `/` | `ReportForm` | **HOME — main report submission form** |
| `/history` | `ReportHistory` | View submitted reports |
| `/pending` | `PendingReports` | Pending/unsent reports |
| `/about` | `About` | App info (Rental World specific) |
| `/analytics` | `Analytics` | Report analytics dashboard |
| `/marketplace` | `Marketplace` | Internal equipment marketplace |
| `/report/:id` | `ReportView` | Public shareable report view (no auth) |
| `/staff-phones` | `StaffPhoneManager` | Staff SMS phone management |

### Key Features
- Offline support via `useOfflineQueue` hook — queues submissions when offline, syncs when reconnected
- Photo uploads via `Core.UploadFile` integration
- Email notifications via **Resend** (`RESEND_API_KEY`)
- SMS via **Twilio** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- Report view tracking (submitter gets email when recipient opens report)
- Weekly digest automation (Monday mornings)
- Instant Sell report alerts to management

### Backend Functions (Asset Wolf)
- `sendNotifications` — sends report emails
- `notifyNewSellReport` — alerts management on Sell submissions
- `notifyReportViewed` — notifies submitter when report is opened
- `trackReportView` — records report view events
- `weeklyDigest` — Monday morning summary email
- `sendAssetReport` — send individual asset report
- `sendMagicLink` / `verifyMagicLink` — custom auth flow
- `adminDeleteReport` — admin-only report deletion
- `ensureStaffPhone` — ensures staff has a phone record
- `driverSMS` — SMS for driver operations

---

## Product 2: AIR Platform (IN DEVELOPMENT → Moving to TheProjectAir workspace)

### What it is
A full rental management SaaS platform. Three branded modules:
- **AIRental** — Equipment rental management (invoicing, contracts, dispatch)
- **AIREvents** — Event planning & coordination with visual canvas layout tool
- **AIRfq** — RFQ & bid management for government/municipal contracts

### Architecture Philosophy
- Subscriber-agnostic: no hardcoded Rental World values
- Branch-driven: all settings flow from `BranchSettings` + `CompanySettings`
- Multi-branch aware throughout

### Key Routes (AIR)
| Route | Page | Purpose |
|---|---|---|
| `/` | `DailyOps` | **AIR home — ops dashboard** |
| `/counter` | `Counter` | Counter POS (new rental invoice) |
| `/manager` | `ManagerDashboard` | Branch manager KPIs |
| `/driver` | `DriverDashboard` | Driver task list |
| `/dispatch` | `DispatchBoard` | Live delivery/recovery map |
| `/delivery/:id` | `DeliveryDetail` | Driver delivery workflow |
| `/assign-deliveries` | `DeliveryAssignment` | Assign deliveries to drivers |
| `/recovery/:id` | `RecoveryDetail` | Driver recovery workflow |
| `/rental-history` | `RentalHistory` | All rental orders |
| `/availability` | `AvailabilityManager` | Availability / rental creation |
| `/availability-calendar` | `AvailabilityCalendar` | Visual calendar |
| `/customers` | `Customers` | Customer CRM |
| `/event-planner` | `EventPlanner` | Event canvas planner |
| `/event-planner/:planId` | `EventPlanner` | Specific event plan |
| `/planner-queue` | `PlannerQueue` | Staff event plan review queue |
| `/accounting` | `AccountingDashboard` | P&L, expenses, QuickBooks export |
| `/rfq` | `RFQManager` | RFQ list |
| `/rfq/:id` | `RFQDetail` | RFQ detail + AI response builder |
| `/rfq/templates` | `RFQTemplates` | Saved response templates |
| `/airoads` | `AIRoads` | Load planning, truck packing, shipping labels |
| `/airecovery` | `AIRecovery` | Theft/geofence recovery intelligence |
| `/gps-settings` | `GPSProviderSettings` | GPS tracker provider config |
| `/shop-floor` | `ShopFloor` | Mechanic repair dashboard |
| `/airepair` | `AIRepair` | AI repair intelligence |
| `/laundry` | `LaundryDashboard` | Linen/laundry tracking |
| `/dispatch` | `DispatchBoard` | Live map dispatch |
| `/timesheets` | `Timesheets` | Staff timesheets + payroll |
| `/branding` | `BrandingSettings` | Logo, colors, header styles |
| `/company-settings` | `CompanySettingsPage` | Core company config |
| `/branch-settings` | `BranchSettingsPage` | Per-branch config |
| `/pricing-editor` | `PricingEditor` | Equipment rate management |
| `/equipment-status` | `EquipmentStatusManager` | Fleet status board |
| `/equipment/:id` | `EquipmentDetail` | Individual unit detail |
| `/lupine` | `LupinePlan` | Master dev roadmap |

### Key Entities (AIR)
- `Equipment` — Rental catalog units with rates, specs, status, depreciation
- `Rental` — Rental contracts/orders (full lifecycle: quote → out → returned)
- `Customer` — Customer CRM with risk flags, loyalty, tax exempt
- `Delivery` — Delivery jobs with driver assignment, photos, GPS, signature
- `Recovery` — Equipment pickup/return jobs
- `WorkOrder` — Shop repair jobs
- `PartRequirement` / `PartsProcurement` — Parts tracking
- `MechanicProfile` — Shop staff profiles + skill ratings
- `MaintenanceLog` — Maintenance history
- `BranchSettings` — Per-branch invoice prefix, next invoice #, contact info
- `CompanySettings` — Logo, name, branding theme, header style, invoice settings, SMS toggle, geofence alert phones
- `DeliveryMatrix` — Per-branch delivery fee zones
- `VolumeDiscountRule` — Qty-based auto-discounts
- `PromoCode` — Promo codes
- `DiscountLog` — Discount audit trail
- `AuditLog` — System-wide audit trail
- `Role` — Custom RBAC roles
- `AvailabilityConfig` — Per-branch overbooking config
- `EquipmentCategory` — Category + attribute definitions
- `PaymentSettings` — Payment processor config
- `EventPlan` — Event canvas plans (customer or staff created)
- `RFQRecord` — RFQ/bid records with AI-extracted requirements
- `Timesheet` — Staff time entries
- `GPSProvider` — GPS provider credentials/config
- `EquipmentGPSLink` — Equipment ↔ GPS device mapping
- `RentalAgreement` — Per-branch agreement text with signature flow

### Backend Functions (AIR — key ones)
- `sendRentalConfirmation` — Email invoice + SMS after confirmed rental
- `upsertCustomer` — Syncs customer record on rental save
- `returnReminders` — Automated return reminders
- `suggestBundles` — AI bundle recommendations at counter
- `generateInvoiceImage` — Invoice image generation
- `renderEmailGateway` — Email rendering
- `demandPatterns` — Demand analytics backend
- `inventoryHealth` — Inventory health report
- `rfqStep1Analyze` / `rfqStep2Compliance` / `rfqStep3LineItems` / `rfqStep4Response` — AI RFQ pipeline
- `checkGeofenceBreaches` — GPS geofence breach detection
- `gpsQuery` — GPS provider polling
- `optimizeLoadDistribution` / `autoPackEquipment` / `generateLoadPDF` — AIRoads load planning
- `smartScheduleWorkOrders` / `assignWorkOrder` / `recommendMechanicAssignment` — Shop AI
- `loyaltyOutreach` — Customer re-engagement analysis
- `enrichAgreementWithSignatures` — Rental agreement PDF with embedded signatures
- `subscriptionCheckout` / `subscriptionWebhook` — Stripe subscription billing
- `createPlanCheckout` / `planCheckout` — Event plan checkout
- Various payment handlers: `stripePaymentHandler`, `squarePaymentHandler`, `paypalPaymentHandler`, `authorizeNetPaymentHandler`, `amazonPayPaymentHandler`, `wisePaymentHandler`, `quickbooksPaymentHandler`

### Payment Processors Supported
Stripe, Square, PayPal, Authorize.Net, Amazon Pay, Wise, QuickBooks

---

## Architecture Notes

### Auth
- All routes under `/*` require authentication (handled by `AuthProvider` + `AuthenticatedApp` in `App.jsx`)
- Public routes: `/air`, `/airental`, `/airevents`, `/airfq`, `/report/:id`, `/clockin`
- Custom magic link auth via `sendMagicLink` / `verifyMagicLink` functions

### AppLayout & Sidebar
- All authenticated routes are wrapped in `<AppLayout />` which provides the sidebar navigation
- The sidebar is defined in `components/AppLayout` — add new routes there when adding pages

### Header System
- `components/AppPageHeader` — the standard page header used across all AIR pages
- Supports 4 styles: `classic` (indigo), `glassmorphism`, `neon`, `navy`
- Style is stored in `CompanySettings.headerStyle` and read via `lib/useHeaderStyle.js`
- `lib/useHeaderStyle.js` uses a module-level cache + listener pattern so all mounted headers update instantly when branding changes — no page refresh needed
- `invalidateHeaderStyleCache(newStyle)` is called from BrandingSettings on save

### Design System
- Tailwind CSS with CSS variable tokens in `index.css`
- Fonts: Inter (labels/`font-label`), Source Sans 3 (body/`font-body`)
- shadcn/ui component library (all components installed)
- No dark mode currently active (tokens defined but not applied)

### Key Libraries
- `@tanstack/react-query` for data fetching
- `framer-motion` for animations
- `react-leaflet` for dispatch maps
- `jspdf` for invoice PDF generation
- `jsbarcode` for equipment barcodes
- `@hello-pangea/dnd` for drag-and-drop
- `react-quill` for rich text editing (CSS already imported)

### Invoice System
- `lib/buildInvoiceHTML.js` — builds and opens print window with invoice HTML
- `lib/deliveryFee.js` — calculates delivery fees from DeliveryMatrix
- `lib/availabilityEngine.js` — checks equipment availability conflicts
- `lib/rentalDayCalc.js` — clock_hour vs calendar_day billing mode logic
- Invoice numbers: per-branch prefix + sequential number stored in `BranchSettings.nextInvoiceNumber`

### Working Branch Context
- `lib/WorkingBranchContext.jsx` — provides `workingBranch` / `setWorkingBranch` globally
- Most pages filter data by working branch
- Staff can switch branches via `<WorkingBranchModal />`

### Subscription / Permissions
- `components/premium/PremiumGate` — wraps features behind subscription tiers: `core`, `pro`, `security_plus`
- `lib/permissions.js` — role-based permission checks

---

## Hardware Notes

### Signature Pad
- Uses **Topaz SigWeb** — Windows service at `tablet.sigwebtablet.com:47290`
- Only works with Topaz SigWeb-compatible pads (NOT generic Wacom/Scriptel/etc.)
- **Recommended hardware:** Topaz LBK462-HSB (~$80-120 USD)
- Fallback: mouse/touch if no pad detected
- Per-workstation setup: install SigWeb, trust self-signed cert in browser
- Diagnostic: `https://tablet.sigwebtablet.com:47290/SigWeb/TabletState` → `1`=ready, `0`=no pad, error=not installed
- **Policy:** Topaz SigWeb is a non-negotiable requirement. Multi-brand support only if a specific subscriber demands it (paid custom integration).

---

## Product Roadmap Decisions

### Asset Wolf → "Field Reports" (Future Rebrand)
- **Decision (2026-05-16):** Asset Wolf is a Rental World brand. Future subscribers get the same feature set as **"Field Reports"**
- Pending changes (do NOT implement until first non-Rental-World subscriber):
  1. Rename "Asset Wolf" → "Field Reports" in all UI
  2. Remove `/about` page from sidebar nav (Rental World-specific)
  3. Make report form categories, disposition options, branch list, and notification recipients configurable via `BranchSettings`/`CompanySettings` — remove hardcoded `rentalworld.com` assumptions
- Rental World exception: `track-wolf-now.base44.app` keeps "Asset Wolf" branding permanently

### One App Per Subscriber Architecture
- **Field Reports only** → deploy standalone Asset Wolf/Field Reports app
- **AIR only** → deploy full AIR platform
- **Both** → deploy combined (current Asset Wolf structure)
- No forced coupling

---

## Secrets In Use
- `RESEND_API_KEY` — Email sending
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` — SMS
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe payments
- `GITHUB_PAT` — GitHub PR tracking (`trackGitHubPRs` function)
- `google_oauth_client_secret` — Google OAuth

---

## Glossary

**AImnesia** *(n.)* — The condition where an AI forgets everything it previously built with you and starts making questionable decisions. Coined 2026-05-03. The existence of this file is the cure.

**AIR** — The rental management platform brand (AIRental + AIREvents + AIRfq).

**Lupine** — Internal codename for the full AIR platform vision/roadmap.

**DailyOps** — The AIR home dashboard page (ops command center).

**CPro** — The legacy rental software (CenterPoint Pro) that Rental World is migrating away from. Legacy data is imported via the `InventoryItem` entity and catalog review workflow.

---

*Last updated: 2026-05-24*