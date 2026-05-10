# AIR (Asset Inventory & Rental) Management System

A comprehensive equipment rental management platform built on Base44 with real-time inventory tracking, multi-branch operations, customer management, and advanced business intelligence.

## Project Overview

AIR is a full-featured SaaS platform for equipment rental companies with:
- **Equipment Catalog** — Centralized inventory with pricing, specs, and availability tracking
- **Rental Management** — Quote generation, contract creation, and invoice processing
- **Multi-Branch Operations** — Separate settings, invoice numbering, and delivery matrices per branch
- **Customer Database** — Account management with credit holds, tax exemptions, and loyalty discounts
- **Delivery & Recovery** — Route optimization, real-time driver tracking, photo capture, and signature collection
- **Business Intelligence** — Demand forecasting, asset depreciation, profitability analysis, and audit logging
- **Payment Processing** — Stripe, Square, PayPal, Authorize.Net, Amazon Pay, and Wise integration
- **Automated Communications** — SMS reminders, email confirmations, and rental notifications
- **Legacy Data Migration** — DBF/fixed-width file parsing and bulk import for CPro/CUAUX catalog data

## Technology Stack

- **Frontend**: React 18 + Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Deno-based serverless functions (Base44 platform)
- **Database**: Base44 managed entities (equipment, rentals, customers, etc.)
- **Auth**: Base44 authentication (magic links, password, SSO)
- **Maps**: Leaflet for route optimization and dispatch mapping
- **Charts**: Recharts for business analytics

## Core Entities

### Main Operations
- **Equipment** — Rental items with rates, specs, status, and depreciation tracking
- **Rental** — Orders with customer info, dates, pricing, taxes, and delivery details
- **Delivery** — Logistics workflow (scheduled → departed → arrived → setup → signed → completed)
- **Recovery** — Return/pickup process with damage assessment and photo comparison
- **Customer** — Account records with contact, payment terms, credit holds, tax exemptions

### Administration
- **BranchSettings** — Invoice numbering, contact info, and local configuration per branch
- **CompanySettings** — Legal name, logo, tax ID, branding, and SMS settings
- **Role** — Custom permission definitions for staff access control
- **DeliveryMatrix** — Zone-based delivery pricing and crew sizing
- **EquipmentCategory** — Hierarchical categories with attribute schemas
- **PromoCode** — Discounts with usage limits and expiration
- **VolumeDiscountRule** — Quantity-based pricing incentives
- **MaintenanceLog** — Service history and scheduled maintenance
- **AvailabilityConfig** — Overbooking policies and buffer day requirements

### Reporting
- **Report** — Asset sale/disposal tracking with photos and recipient emails
- **DiscountLog** — Audit trail of promotional and manual discounts
- **InventoryItem** — Legacy DBF records awaiting migration and categorization
- **CproContact** — Extracted contact data from CPro for customer import
- **PullRequest** — GitHub PR tracking (auto-synced from repo)

## Key Pages & Features

### Rental Operations
- **Counter** (`/counter`) — POS-style quick order entry with customer search, bundle suggestions, and real-time availability
- **AvailabilityManager** (`/availability`) — Rental form with delivery/return methods, signature capture, and invoice printing
- **RentalHistory** (`/rental-history`) — Browse all past orders with filtering and status tracking
- **Customers** (`/customers`) — Full CRM with credit holds, tax exemptions, and loyalty tiers

### Logistics
- **DispatchBoard** (`/dispatch`) — Map view and route optimizer for drivers with real-time location tracking
- **DriverDashboard** (`/driver`) — Mobile-friendly delivery/recovery assignments with geolocation
- **DeliveryDetail** — Checklist, photo capture, signature, status tracking per delivery
- **RecoveryDetail** — Before/after photo comparison and damage assessment

### Inventory & Pricing
- **PricingEditor** (`/pricing-editor`) — Adjust daily/weekly/monthly rates and deposits
- **DependenciesEditor** — Define bundle recommendations (e.g., suggest tent stakes with tent)
- **EquipmentStatusManager** — Monitor unit status (available, reserved, in shop, retired)
- **EquipmentDetail** — View/edit individual unit specs and maintenance history
- **CategoryManager** — Create categories and assign technical attributes
- **CatalogReview** — Clean and approve migrated inventory before going live

### Business Operations
- **Manager Dashboard** (`/manager`) — KPI overview, pending tasks, and operational metrics
- **Shop Dashboard** (`/shop`) — Work order queue for maintenance and repairs
- **Dispatch Board** — Assign and optimize routes for daily deliveries/recoveries
- **DailyOps** (`/`) — Default landing page with operational summary

### Finance & Analytics
- **Analytics** (`/analytics`) — Revenue trends, asset type distribution, branch performance
- **DepreciationReport** — Straight-line and declining-balance calculations per unit
- **AccountingDashboard** (`/accounting`) — P&L statements, revenue summaries, expense tracking
- **DiscountManager** — Promo codes, volume rules, and loyalty discounts
- **DeliveryMatrixPage** — Zone-based delivery costs and crew allocation

### Administration
- **RoleManager** (`/roles`) — Define roles, assign permissions, and manage employees
- **BranchSettingsPage** — Invoice prefixes, contact, and auto-numbering per branch
- **CompanySettingsPage** — Legal info, government IDs, certifications, and branding
- **BrandingSettings** — Logo upload and theme color customization
- **AvailabilityConfigPage** — Overbooking and buffer day policies per branch
- **AuditLogDashboard** — Track all entity changes and user actions

### Data Migration & Integration
- **DbfConverter** (`/converter`) — Parse CPro DBF files and extract inventory
- **LegacyMapper** (`/legacy-mapper`) — Map legacy fields to new equipment attributes
- **ContactReview** (`/contact-review`) — Review and edit extracted contacts before import
- **CatalogReview** (`/catalog-review`) — Approve/junk migrated items and set categories
- **EventPlanner** (`/event-planner`) — Visual canvas for event planning with footprint calculations

### Public Pages
- **AIRWebsite** (`/air`) — Marketing landing page
- **AIRental** (`/airental`) — Equipment rental product page
- **AIREvents** (`/airevents`) — Event planning tool showcaseAIRfq (`/airfq`) — Request for quote management
- **AIReports** (`/aireports`) — Business intelligence dashboard

## Backend Functions

### Core Operations
- `upsertCustomer` — Auto-sync customer records on rental creation
- `sendRentalConfirmation` — Email/SMS rental contracts and invoices
- `driverSMS` — Send status updates to customers (on-way, arrived, etc.)
- `returnReminders` — Automated SMS return notifications

### Payments
- `stripePaymentHandler`, `squarePaymentHandler`, `paypalPaymentHandler`, etc. — Process payments via integrated processors
- `planCheckout` — Create event plan checkout sessions

### Data Processing
- `parseDbf` — Extract DBF file contents
- `analyzeDbfFields` — Infer field names and types from raw DBF
- `extractInvRecords` — Parse inventory from fixed-width format
- `importInvRecords` — Bulk import inventory items
- `migrateApprovedToEquipment` — Convert approved catalog items to Equipment
- `migrateCproContactsToCustomers` — Import contacts as customers

### Reporting & Analytics
- `demandPatterns` — Analyze rental trends by equipment/season
- `inventoryHealth` — Condition and status reports
- `sendAssetReport` — Email disposal/sale reports with photos
- `trackReportView` — Log when recipients view reports

### Integrations
- `trackGitHubPRs` — Hourly sync of merged PRs from MannyPHuerta/air repo
- `sendNotifications` — Multi-channel notifications (email, SMS)
- `generateInvoiceImage` — HTML → PNG invoice rendering

## Secrets (Environment Variables)

```
GITHUB_PAT              # GitHub personal access token for PR tracking
STRIPE_SECRET_KEY       # Stripe API secret
STRIPE_PUBLISHABLE_KEY  # Stripe publishable key
RESEND_API_KEY          # Resend email service
TWILIO_PHONE_NUMBER     # Twilio SMS sender number
TWILIO_ACCOUNT_SID      # Twilio account ID
TWILIO_AUTH_TOKEN       # Twilio auth token
```

## Getting Started

1. **Clone & Install**: Standard Vite + React setup
2. **Environment Setup**: Configure secrets in Base44 dashboard
3. **Database**: Entities auto-sync on first load
4. **Auth**: Users invited via email; roles assigned in RoleManager
5. **Branding**: Upload logo and set colors in CompanySettings

## Notes for Development

- **Offline Support**: Form state auto-saves to localStorage (rental quotes persist between sessions)
- **Real-time**: Entity subscriptions available for live updates (e.g., PR tracking)
- **Mobile**: Counter and Driver dashboards optimized for mobile/tablet use
- **PDF Export**: Invoices print to HTML window or export as PDF via jsPDF
- **Payment Flow**: Non-card methods (cash, check) skip payment processor; card methods use Stripe/Square/PayPal

## Deployment

Published apps can accept real payments. Test mode uses Stripe sandbox (card: 4242 4242 4242 4242).

---

Last updated: May 2026