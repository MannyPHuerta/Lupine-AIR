# Project Notes — Asset Wolf / AIR Platform

## Overview
This is a **dual-product** Base44 app. It was originally built as **Asset Wolf** (an internal equipment disposal reporting tool for Rental World Equipment), and is now being evolved into the **AIR** platform (AI-powered Rental management suite). Asset Wolf must remain fully functional in production throughout the transition.

---

## Live Production App
- URL: `track-wolf-now.base44.app`
- Primary users: Rental World Equipment staff
- Company: Rental World Equipment — multi-branch, South Texas (McAllen, Weslaco, Harlingen, Brownsville, Corpus Christi)

---

## Product 1: Asset Wolf (PRODUCTION — DO NOT BREAK)

### What it does
Internal tool for staff to report equipment assets for disposal, sale, repair, or quoting. Reports are emailed to management with photos.

### Key Routes
| Route | Page | Purpose |
|---|---|---|
| `/` | `ReportForm` | Main report submission form (HOME) |
| `/history` | `ReportHistory` | View submitted reports |
| `/pending` | `PendingReports` | Pending/unsent reports |
| `/about` | `About` | App info |
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

### Staff / Branches
**Branches:** 01 McAllen, 02 Weslaco, 03 Harlingen, 05 Brownsville, 06 Corpus, 98 Shop, 99 Warehouse

**Staff emails (rentalworld.com domain):**
manny, awolf, brucewolf, bwolf, dcarranza, dfulcher, ealfaro, ggomez, jcurran, jgomez, jjacobson, joep, lisamiller, margog, rmelchor, rwolf

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

## Product 2: AIR Platform (IN DEVELOPMENT)

### What it is
A full rental management platform being built as an evolution of Asset Wolf. Includes:
- **AIRental** — Equipment rental management (invoicing, contracts, dispatch)
- **AIREvents** — Event planning & coordination  
- **AIRfq** — RFQ & bid management

### Key Routes
| Route | Page | Purpose |
|---|---|---|
| `/air` | `LandingHero` | AIR animated landing page |
| `/airental` | `AIRental` | AIRental product page |
| `/airevents` | `AIREvents` | AIREvents product page |
| `/airfq` | `AIRfq` | AIRfq product page |
| `/availability` | `AvailabilityManager` | New Rental Invoice (counter POS) |
| `/rental-history` | `RentalHistory` | All rental orders |
| `/counter` | `Counter` | Counter POS interface |
| `/manager` | `ManagerDashboard` | Branch manager KPIs |
| `/driver` | `DriverDashboard` | Driver task list |
| `/dispatch` | `DispatchBoard` | Live delivery/recovery map |
| `/delivery/:id` | `DeliveryDetail` | Driver delivery workflow |
| `/assign-deliveries` | `DeliveryAssignment` | Assign deliveries to drivers |
| `/recovery/:id` | `RecoveryDetail` | Driver recovery workflow |
| `/lupine` | `LupinePlan` | Master dev roadmap dashboard |

### Rental Management Routes
| Route | Page |
|---|---|
| `/availability-calendar` | `AvailabilityCalendar` |
| `/pricing-editor` | `PricingEditor` |
| `/dependencies-editor` | `DependenciesEditor` |
| `/equipment-status` | `EquipmentStatusManager` |
| `/equipment/:id` | `EquipmentDetail` |
| `/customers` | `Customers` |
| `/delivery-matrix` | `DeliveryMatrixPage` |
| `/discounts` | `DiscountManager` |
| `/categories` | `CategoryManager` |
| `/availability-config` | `AvailabilityConfigPage` |

### Admin / Settings Routes
| Route | Page |
|---|---|
| `/branch-settings` | `BranchSettingsPage` |
| `/company-settings` | `CompanySettingsPage` |
| `/branding` | `BrandingSettings` |
| `/roles` | `RoleManager` |
| `/audit-logs` | `AuditLogDashboard` |
| `/depreciation` | `DepreciationReport` |
| `/inventory-health` | `InventoryHealth` |
| `/demand-patterns` | `DemandPatterns` |

### Legacy Migration Routes (CPro → Lupine)
| Route | Page |
|---|---|
| `/catalog-review` | `CatalogReview` |
| `/converter` | `DbfConverter` |
| `/legacy-mapper` | `LegacyMapper` |
| `/contact-review` | `ContactReview` |

### Key Entities (AIR)
- `Equipment` — Rental catalog units with rates, specs, status
- `Rental` — Rental contracts/orders
- `Customer` — Customer accounts
- `Delivery` — Delivery jobs
- `Recovery` — Equipment return/pickup jobs
- `DriverLocation` — Real-time GPS tracking
- `WorkOrder` — Shop/maintenance work orders
- `MaintenanceLog` — Maintenance history
- `InventoryItem` — Legacy CPro migration staging
- `BranchSettings` — Per-branch invoice prefix, next invoice #
- `CompanySettings` — Logo, name, invoice footer, SMS toggle
- `DeliveryMatrix` — Per-branch delivery fee zones
- `VolumeDiscountRule` — Qty-based auto-discounts
- `PromoCode` — Promo codes
- `DiscountLog` — Discount audit trail
- `AuditLog` — System-wide audit trail
- `Role` — Custom RBAC roles
- `AvailabilityConfig` — Per-branch overbooking config
- `EquipmentCategory` — Category + attribute definitions
- `PaymentSettings` — Payment processor config

### Backend Functions (AIR)
- `sendRentalConfirmation` — Emails invoice + SMS after confirmed rental
- `upsertCustomer` — Syncs customer record on rental
- `returnReminders` — Automated return reminders
- `suggestBundles` — AI bundle recommendations
- `generateInvoiceImage` — Invoice image generation
- `renderEmailGateway` — Email rendering gateway
- `demandPatterns` — Demand analytics
- `inventoryHealth` — Inventory health report
- `approveAllCatalog` / `approveAllCatalogBg` — Bulk catalog approval
- `migrateApprovedToEquipment` / `migrateItemsToEquipment` — CPro migration
- `bulkImportCatalog` / `importCatalogNames` — Catalog import
- Various CPro extraction functions (`extractCuauxCatalog`, `extractInvRecords`, etc.)
- Multiple payment handlers (`stripePaymentHandler`, `squarePaymentHandler`, etc.)

### Payment Processors Supported
Stripe, Square, PayPal, Authorize.Net, Amazon Pay, Wise, QuickBooks

---

## Architecture Notes

### Auth
- All routes under `/*` require authentication (handled by `AuthProvider` + `AuthenticatedApp` in `App.jsx`)
- Public routes: `/air`, `/airental`, `/airevents`, `/airfq`, `/report/:id`
- Custom magic link auth via `sendMagicLink` / `verifyMagicLink` functions

### Design System
- Tailwind CSS with CSS variable tokens in `index.css`
- Fonts: Inter (labels), Source Sans 3 (body)
- shadcn/ui component library
- No dark mode currently active (tokens defined but not applied)

### Key Libraries
- `@tanstack/react-query` for data fetching
- `framer-motion` for animations
- `react-leaflet` for dispatch maps
- `jspdf` for invoice PDF generation
- `jsbarcode` for equipment barcodes
- `@hello-pangea/dnd` for drag-and-drop

### Invoice System
- `lib/buildInvoiceHTML.js` — builds and opens print window with invoice HTML
- `lib/deliveryFee.js` — calculates delivery fees from DeliveryMatrix
- `lib/availabilityEngine.js` — checks equipment availability conflicts
- Invoice numbers: per-branch prefix + sequential number stored in `BranchSettings.nextInvoiceNumber`

---

## Roadmap: Merging Asset Wolf → AIR

The goal is to eventually incorporate Asset Wolf's functionality into the AIR platform as a module. Until then:
1. Asset Wolf routes stay at their current paths
2. The `/` home route stays as `ReportForm` (Asset Wolf)  
3. AIR lives under `/air`, `/airental`, `/availability`, `/lupine`, etc.
4. Do NOT change Asset Wolf business logic while building out AIR features

---

---

## Glossary

**AImnesia** *(n.)* — The condition where an AI forgets everything it previously built with you and starts making questionable decisions. Coined 2026-05-03. The existence of this file is the cure.

---

*Last updated: 2026-05-03*