# AIR Platform — Encyclopedic Training Document
*Version 1.0 — June 2026 | Authoritative reference for AI assistant training*

---

## WHAT IS AIR?

AIR (Artificial Intelligence Rentals) is a multi-tenant, AI-native rental management platform built by Lupine for the equipment and event rental industry. It is designed specifically for small-to-medium rental companies operating in construction, heavy equipment, and event/party rental markets — particularly those serving commercial clients, municipalities, and general contractors in the Southern United States.

AIR replaces legacy rental software (such as CPro, Point of Rental, and similar DOS-era systems) with a modern, mobile-friendly web application that embeds artificial intelligence directly into every operational workflow. Rather than being a system of record with AI bolted on, AIR is designed so that AI is the primary interface for analysis, decision-making, and operational guidance.

**Who uses AIR?**
- Counter staff — process rentals, take payments, check availability
- Drivers — receive delivery assignments, log GPS, capture signatures and photos
- Shop mechanics — manage repair tickets, parts requests, and maintenance logs
- Branch managers — review daily operations, approve discounts, monitor performance
- Company owners / executives — review analytics, P&L, fleet health, and fraud intelligence
- Procurement staff — manage purchase orders, vendor relationships, and supply costs

**How is AIR structured?**
AIR is organized into named Sections — each prefixed with "AI" — that correspond to a major operational domain. Within each Section are Subsections (individual pages or views) that handle specific tasks. Each Section has its own AI assistant trained on that domain's context.

**Multi-tenant architecture:**
Every subscriber gets their own isolated workspace (tenant) with their own data, branches, users, and settings. Tenants are provisioned automatically during onboarding and accessed via subdomain (e.g., `acme.theprojectair.com`). Data never crosses tenant boundaries.

**Plan tiers:**
- **Core** — 1 branch, essential counter + rental operations, AIRental + AIREvents, AIReports, email & SMS
- **Pro** — Up to 3 branches, all AI modules, AIRepair + AIRecovery, GPS tracking, priority support
- **Custom** — Up to 10 branches, AIRfq + AIRoads, advanced maintenance, account manager & SLA

---

## SECTION 1: AIRental

**What is AIRental?**
AIRental is the core operational hub for construction and general equipment rentals. It manages the full lifecycle of a rental — from quote to contract to return — and is where counter staff spend the majority of their working day.

---

### Subsection 1.1 — Daily Ops (Home Dashboard)

**What it is:** The main landing page after login. Shows a real-time operational snapshot of the branch.

**What you see:**
- Active rentals currently out in the field
- Equipment due back today or overdue
- Pending deliveries scheduled for today
- Open work orders in the shop
- Cash drawer status (open/closed)
- Recent customer activity

**How to use it:**
1. Log in — you land on Daily Ops automatically
2. Review the "Due Today" list — contact customers whose equipment is due back
3. Check "Overdue" items — these require follow-up and may trigger late fees if enabled
4. Review delivery assignments — confirm drivers have received and acknowledged their runs
5. Use the quick-action buttons to jump to Counter, Dispatch, or Shop Floor without navigating the sidebar

**Key behavior:** Daily Ops is branch-aware. If you work at multiple branches, use the branch selector (top of sidebar) to switch context. All data shown reflects the currently selected branch.

---

### Subsection 1.2 — Counter

**What it is:** The primary transaction screen where staff create rental contracts, process payments, and check out equipment to customers.

**How to create a new rental (start to finish):**
1. Click **Counter** in the sidebar
2. Click **New Rental** (top right)
3. **Search for customer** — type name, phone, or email. If found, select them. If new, click "New Customer" to create a record inline
4. **Verify customer identity** — check ID type and last 4 digits, confirm phone via outbound call if required by policy
5. **Add equipment** — search by name, category, or asset number. Click to add to cart. Set quantity for bulk items
6. **Set rental dates** — choose start date and expected return date. The system calculates duration and applies the correct daily/weekly/monthly rate automatically
7. **Review line items** — each item shows rate, quantity, subtotal. You can override rates with manager approval
8. **Apply discounts** — enter a promo code, or select volume/loyalty discount if customer qualifies. All discounts are logged in the Discount Log
9. **Review totals** — subtotal, tax (if applicable), delivery fee (if delivery requested), deposit, and grand total
10. **Select payment method** — Cash, Card, Check, or ACH. For card, follow the payment processor flow
11. **Capture signature** — customer signs on screen or on a mobile device
12. **Print or email receipt/contract** — the system generates a PDF rental agreement and can email it automatically
13. **Equipment is marked out** — inventory availability updates in real time

**Quick Sale (consumables):**
For items marked as "consumable" (e.g., propane tanks, bags of ice, safety cones), use the Quick Sale button. No rental contract is generated — it's a simple point-of-sale transaction with receipt.

**Recurring Rentals:**
If a customer rents the same equipment on a regular basis (e.g., weekly generator rental every Monday), set up a Recurring Rental. The system auto-generates contracts on the scheduled interval and notifies counter staff to confirm.

**Customer verification:**
- ID verification: mark ID type and last 4 digits on the customer record
- Phone verification: staff calls the customer's number and confirms verbally — the system logs who verified and when
- Credit hold: if a customer is on credit hold, a red banner appears and the system requires upfront payment
- Blacklist: blacklisted customers cannot be added to a new rental — staff sees a warning and must override with manager credentials

---

### Subsection 1.3 — Availability Calendar

**What it is:** A visual calendar showing which equipment is booked, available, or in conflict on any given date range.

**How to use it:**
1. Navigate to Availability Calendar in the sidebar
2. Select a date range using the date pickers
3. Select a category or specific equipment item to filter
4. The calendar shows color-coded blocks: green = available, yellow = partially booked, red = fully booked or in conflict
5. Click any block to see which rental is occupying that time slot
6. Use this to answer customer questions about availability before creating a rental

**Buffer days:** Equipment can have a configured buffer (e.g., 1 day between rentals for cleaning/inspection). Buffer days appear as blocked time on the calendar even if no rental is assigned.

**Overbooking:** If a branch allows overbooking (configured in Availability Config), the calendar shows an orange warning when overbooking thresholds are approached.

---

### Subsection 1.4 — Rental History

**What it is:** A searchable archive of all past and current rental transactions.

**How to use it:**
1. Navigate to Rental History
2. Use filters: by date range, customer name, equipment, branch, status (active/closed/overdue)
3. Click any rental to open its detail view
4. From the detail view, you can: reprint the agreement, view payment history, add notes, initiate a return, or flag for review

---

### Subsection 1.5 — Customers

**What it is:** The customer relationship management (CRM) view for all customer accounts.

**How to use it:**
1. Navigate to Customers
2. Search by name, company, phone, or email
3. Click a customer to open their profile
4. Customer profile shows: contact info, rental history, total spend, loyalty status, credit hold/blacklist status, linked contacts (authorized renters), tax exemption status, and internal notes
5. Edit any field directly — changes are saved immediately
6. Add linked contacts (e.g., employees authorized to pick up equipment on behalf of a business account)

**Loyalty discounts:** Admins can enable a standing loyalty discount on any customer account (e.g., 5% off all rentals). This auto-applies at the counter.

---

### Subsection 1.6 — Pricing Editor

**What it is:** Where managers set and update daily, weekly, and monthly rates for all equipment.

**How to use it:**
1. Navigate to Pricing Editor
2. Browse or search equipment
3. Click any item to edit its rates: daily, weekly, monthly, hourly (if hour-metered)
4. Save — the new rate applies to all new rentals immediately (existing open rentals are not affected)
5. All price changes are audit-logged with who changed them and when

---

### Subsection 1.7 — Discount Manager

**What it is:** Central management of promo codes, volume discount rules, and loyalty programs.

**Promo codes:** Create codes with a discount type (fixed dollar or percentage), expiry date, and optional usage limit. Codes are entered by counter staff at checkout.

**Volume discount rules:** Automatically apply discounts when a rental includes more than a set quantity of an item (e.g., 10% off when ordering 50+ chairs).

**How to create a promo code:**
1. Navigate to Discount Manager
2. Click "New Promo Code"
3. Enter code name, discount type, amount/percent, start/end dates, usage cap
4. Save — the code is immediately active

---

### Subsection 1.8 — Availability Config

**What it is:** Branch-level settings that control overbooking rules and cross-branch reservations.

**Settings:**
- Allow overbooking by default (yes/no)
- Max overbooking percentage
- Require manager approval above a threshold
- Default buffer days between rentals
- Enable cross-branch reservations

---

## SECTION 2: AIREvents

**What is AIREvents?**
AIREvents handles the event and party rental side of the business — tents, chairs, tables, linens, bounce houses, staging, lighting, and all related equipment. It includes an AI-powered visual event planner (drag-and-drop canvas) and customer-facing quoting tools.

---

### Subsection 2.1 — Event Planner (Canvas)

**What it is:** A visual, drag-and-drop floor plan tool that allows staff or customers to design an event layout, place equipment on a scaled canvas, and generate a quote automatically.

**How to create an event plan (start to finish):**
1. Navigate to Event Planner (or click "New Plan" from Planner Queue)
2. Enter event details: title, event type (wedding, quinceañera, corporate, etc.), event date, guest count, customer name/contact
3. Define the venue: enter dimensions (width × length in feet), or upload a venue photo, or enter an address
4. Set the ground surface (grass, asphalt, concrete, etc.) — this affects AI equipment recommendations
5. The canvas loads scaled to the venue dimensions
6. Drag equipment from the Item Palette on the left onto the canvas:
   - Tents (sized to footprint)
   - Tables and chairs (AI suggests quantities based on guest count)
   - Staging, dance floors, lighting
   - Generators, restroom trailers, catering equipment
7. Position and rotate items on the canvas by dragging
8. The Quote Summary panel updates in real time with line items and total
9. The AI Nudge Panel suggests missing items ("You have 200 guests but no dance floor")
10. Save the plan — it can be shared with the customer for review
11. Once approved, click "Convert to Rental" — the plan becomes a rental contract with all items pre-populated

**Plan statuses:** Draft → Customer Review → Planner Review → Finalized → Converted → Cancelled

---

### Subsection 2.2 — Planner Queue

**What it is:** A list of all active event plans sorted by event date, showing status and assigned planner.

**How to use it:**
1. Navigate to Planner Queue
2. See all plans across all statuses
3. Filter by status, date, or planner
4. Click any plan to open it in the canvas editor
5. Plans needing customer review show a notification badge

---

### Subsection 2.3 — Event Store (Online Booking)

**What it is:** A public-facing web page (`/store/events`) where customers can browse available equipment, design their own event plan, and submit a reservation request.

**How it works:**
- Customers visit the store URL (linked from the company website)
- They choose their event type and date
- They browse equipment by category and add items to their cart
- They submit their contact info and request — this creates a pending reservation in the system
- Staff receives a notification and converts the reservation to a rental contract

---

## SECTION 3: AIRepair

**What is AIRepair?**
AIRepair manages the shop floor — all maintenance, repair, and inspection work performed on the rental fleet. It includes work order management, parts tracking, mechanic assignment, predictive maintenance alerts, and shop scheduling.

---

### Subsection 3.1 — Shop Floor

**What it is:** The mechanic's primary view showing all open work orders assigned to the current user or the branch.

**How to create a work order:**
1. Navigate to Shop Floor (or flag equipment for repair from Equipment Detail)
2. Click "New Work Order"
3. Select the equipment unit
4. Describe the issue / required work
5. Set priority: Routine, Urgent, or Critical
6. Assign to a mechanic (or leave unassigned for the manager to assign)
7. Add any initial parts requirements
8. Save — the work order is live and visible to all shop staff

**Work order lifecycle:** Open → In Progress → Awaiting Parts → Completed → Closed

**Mechanic view:** Mechanics see only their assigned work orders by default. They can update status, log labor hours, and request parts.

---

### Subsection 3.2 — Inspection Queue

**What it is:** A list of equipment units that need a post-rental inspection before being returned to available inventory.

**How to use it:**
1. When a rental is returned, the equipment is flagged for inspection
2. Navigate to Inspection Queue
3. Select a unit and complete the inspection checklist (condition, cleanliness, damage, hour meter reading)
4. Mark as passed — equipment returns to "Available" status
5. Mark as failed — a work order is automatically created and equipment goes to "In Shop" status

---

### Subsection 3.3 — Parts Procurement (Repair)

**What it is:** Tracks parts requests generated by work orders and their procurement status.

**How a parts request works:**
1. Mechanic adds a part requirement to a work order
2. The parts request appears in Parts Procurement
3. A parts buyer reviews and sources the part (from preferred vendors or the open market)
4. When ordered, the PO is linked to the work order
5. When parts arrive, the work order moves from "Awaiting Parts" back to "In Progress"

---

### Subsection 3.4 — AIRepair (AI Assistant)

**What it is:** An AI chat interface that analyzes repair patterns, suggests mechanic assignments, detects anomalies, and predicts which equipment is likely to need service soon.

**How to use it:**
1. Navigate to AIRepair
2. Ask questions like: "Which units are overdue for maintenance?", "What's our average repair turnaround time?", "Which mechanic has the most open tickets?"
3. The AI pulls live data from work orders, maintenance logs, and equipment history
4. It can generate a repair intelligence report summarizing fleet health

**Predictive alerts:** The system automatically flags equipment that has exceeded usage thresholds or shows patterns consistent with upcoming failure, creating proactive maintenance tickets.

---

## SECTION 4: AIRecovery

**What is AIRecovery?**
AIRecovery is the fraud, theft, and loss-prevention module. It monitors rental activity for suspicious patterns, manages GPS tracking data, and generates intelligence reports for management.

---

### Subsection 4.1 — Fraud Intelligence

**What it is:** A dashboard showing flagged rentals, suspicious activity alerts, and AI-generated fraud risk scores.

**What gets flagged:**
- Equipment moved at night (outside rental hours)
- Equipment exceeding expected speed (e.g., >40 mph — suggests unauthorized transport)
- Equipment detected outside the agreed worksite geofence
- Customer accounts with multiple late returns, disputes, or chargebacks
- Rentals with unusual discount patterns or manager override frequency

**How to use it:**
1. Navigate to Fraud Intelligence (PIN-protected — admin only)
2. Review flagged events in chronological order
3. Click any alert to see full context: GPS data, photos, customer history, rental details
4. Mark as reviewed (no action), escalate (initiate recovery), or dismiss (false positive)

---

### Subsection 4.2 — AI Fraud Digest

**What it is:** A daily AI-generated summary of fraud and loss events sent to designated phone numbers and emails.

**How to configure:**
1. Go to Company Settings → Fraud Alert Phones / Fraud Alert Emails
2. Add phone numbers (E.164 format, e.g., +12105551234) and email addresses
3. The digest runs nightly and covers: new geofence breaches, speed anomalies, night movement, high-risk accounts

---

### Subsection 4.3 — Recovery (Case Management)

**What it is:** Tracks active equipment recovery cases where equipment is overdue, stolen, or disputed.

**How a recovery case works:**
1. A recovery case is created automatically when equipment is flagged as stolen or manually by a manager
2. The case includes: last known GPS location, customer contact info, rental contract, photos, and timeline
3. Staff uses the case to coordinate with law enforcement, insurance, or collections
4. Cases are closed when equipment is returned, written off, or recovered

---

## SECTION 5: AIReports

**What is AIReports?**
AIReports is the reporting and analytics module. It provides both pre-built standard reports and an AI assistant that generates custom reports from natural language queries.

---

### Subsection 5.1 — Standard Reports

Available reports include:
- **Revenue Report** — gross revenue by day, week, month, branch, category
- **Equipment Utilization** — what percentage of fleet is out on rental vs. sitting idle
- **Late Returns Report** — overdue equipment with customer contact info
- **Depreciation Report** — book value of the fleet by depreciation method (straight-line or declining balance)
- **Driver Performance** — deliveries completed, on-time rate, customer signatures per driver
- **Expense Report** — all logged expenses by category, vendor, and job
- **Cash Drawer Reconciliation** — shift-by-shift cash in/out with variance analysis
- **Laundry Report** — tracking for linens and soft goods sent to laundry

**How to run a report:**
1. Navigate to AIReports
2. Select the report type
3. Set the date range and branch filter
4. Click Run — results display on screen and can be exported to PDF or CSV

---

### Subsection 5.2 — AI Report Builder

**What it is:** A natural language interface where you describe what you want to know and the AI generates the report.

**Example queries:**
- "Show me all rentals from last month where the customer received a discount over 10%"
- "Which equipment category generated the most revenue in Q1?"
- "List all customers who haven't rented in 90 days"

---

## SECTION 6: AIRoads

**What is AIRoads?**
AIRoads manages delivery and logistics — route planning, load optimization, truck manifests, driver tracking, and field expense capture.

---

### Subsection 6.1 — Dispatch Board

**What it is:** The manager's view of all deliveries scheduled for today and upcoming days, with drag-and-drop assignment of drivers and vehicles.

**How to use it:**
1. Navigate to Dispatch Board
2. See all pending deliveries on the left panel
3. Assign a driver by dragging a delivery card to a driver's column
4. The AI recommends optimal route order based on addresses and time windows
5. Drivers receive their assignment in the Driver Dashboard
6. Track live driver locations on the map (if GPS is enabled)

---

### Subsection 6.2 — Driver Dashboard

**What it is:** The mobile-optimized view for drivers. Shows their assigned deliveries for the day with navigation, checklist, photo capture, and signature collection.

**How a driver uses it:**
1. Driver logs in on their phone and navigates to Driver Dashboard
2. Sees their delivery queue sorted by recommended route order
3. Taps a delivery to open it
4. Reviews the manifest (equipment list)
5. Marks "Departed" when leaving the branch
6. Marks "Arrived" when at the customer location
7. Completes the setup checklist (each piece of equipment checked off)
8. Takes condition photos (geotagged automatically)
9. Collects customer signature on-screen
10. Marks "Complete" — the delivery is logged and the rental contract is updated

---

### Subsection 6.3 — Load Planner (AIRoads)

**What it is:** AI-powered tool that determines how to pack a truck given the equipment list for a delivery.

**How to use it:**
1. Open a delivery
2. Click "Plan Load"
3. The AI analyzes equipment dimensions and truck bed size
4. Generates a visual floor plan showing how to stack and arrange items
5. Produces a printed load manifest for the driver

---

### Subsection 6.4 — Field Expense Capture

**What it is:** Allows drivers to photograph receipts in the field (fuel, tolls, meals) and submit them as expense records linked to the job.

**How to use it:**
1. Driver opens Driver Dashboard
2. Taps "Log Expense"
3. Takes photo of receipt
4. AI reads the receipt and pre-fills amount, vendor, and category
5. Driver confirms and submits — expense is logged and linked to the delivery job

---

## SECTION 7: AIRfq

**What is AIRfq?**
AIRfq (AI Request for Quotation) assists rental companies that bid on government contracts, commercial construction projects, and large events. It analyzes RFQ documents and generates compliant bid responses.

---

### How AIRfq works (start to finish):
1. Receive an RFQ document (PDF or Word) from a government agency, GC, or event organizer
2. Navigate to RFQ Manager
3. Click "New RFQ" and upload the document
4. The AI runs a 4-step analysis:
   - **Step 1 (Analyze):** Identifies what equipment and services are being requested
   - **Step 2 (Compliance):** Checks the bid requirements against your certifications, insurance, and capacity
   - **Step 3 (Line Items):** Generates a detailed line-item pricing table using your current rate sheet
   - **Step 4 (Response):** Drafts the full bid response document, ready for review and submission
5. Staff reviews and edits the draft
6. Export to PDF and submit to the issuing agency
7. Track bid status (submitted, awarded, lost) in RFQ Manager

---

## SECTION 8: Purchase Orders & Procurement

**What is it?**
The procurement module manages vendor relationships, supply purchasing, and purchase orders for parts, supplies, and equipment.

---

### Subsection 8.1 — Vendor Manager

**What it is:** A directory of all approved vendors with contact info, payment terms, and purchase history.

**How to add a vendor:**
1. Navigate to Vendors
2. Click "New Vendor"
3. Enter name, contact, address, payment terms, and account number
4. Save — the vendor is now available when creating purchase orders

---

### Subsection 8.2 — Purchase Orders

**How to create a PO:**
1. Navigate to Purchase Orders
2. Click "New PO"
3. Select vendor
4. Add line items: description, quantity, unit price
5. Link to a work order (if this is a parts purchase for repair)
6. Submit for purchasing review — the purchasing email at the branch receives a notification
7. Once approved, the PO is sent to the vendor — accounting email receives a copy
8. When goods arrive, mark as received — linked work orders are updated automatically

---

### Subsection 8.3 — Supply Catalog

**What it is:** A catalog of recurring supply items (cleaning supplies, safety equipment, fuel, etc.) that can be quickly added to POs without re-entering details each time.

---

## SECTION 9: Fleet & Equipment Management

---

### Subsection 9.1 — Equipment Status Manager

**What it is:** A grid view of every equipment unit with its current status and location.

**Unit statuses:**
- **Available** — ready to rent
- **Reserved** — booked for an upcoming rental
- **Out on Rental** — currently with a customer
- **In Shop** — undergoing repair or maintenance
- **Awaiting Parts** — repair paused waiting for parts
- **In Laundry** — soft goods sent to laundry (event rental)
- **Under Inspection** — post-rental inspection in progress
- **Retired** — removed from active fleet

**How to update status:**
1. Navigate to Equipment Status Manager
2. Find the unit (search by name, asset number, or category)
3. Click the status dropdown and select the new status
4. Add a note (e.g., ETA for return from shop)
5. Save — the change is logged with who changed it and when

---

### Subsection 9.2 — Equipment Detail

**What it is:** The full profile of a single equipment unit including specs, rental history, maintenance log, depreciation, GPS link, and pricing.

**How to access it:**
- From Equipment Status Manager, click any unit
- From a rental contract, click the equipment name
- From a work order, click the linked unit

---

### Subsection 9.3 — GPS Tracking

**What it is:** Integration with third-party GPS providers (Samsara, Geotab, Verizon Connect, CalAmp, Bouncie, etc.) to track equipment location in real time.

**How to set up GPS:**
1. Navigate to GPS Provider Settings
2. Click "Add Provider"
3. Select your GPS provider from the list
4. Enter your API key and account credentials
5. Save and test connection
6. Navigate to any Equipment Detail page
7. Click "Link GPS Device" and select the device from your provider's device list
8. The equipment now shows real-time location on the Dispatch Map and in AIRecovery

**Geofence alerts:** Set a geofence radius (in miles) for each unit. If the unit leaves the radius around its rental worksite, an alert is sent via SMS and email to configured contacts.

---

### Subsection 9.4 — Inventory Health

**What it is:** An AI-powered dashboard showing fleet utilization, aging equipment, maintenance cost trends, and recommendations for fleet decisions (retire, replace, purchase more).

---

### Subsection 9.5 — Depreciation Report

**What it is:** Shows the current book value of all equipment using either straight-line or declining balance depreciation, based on purchase cost, useful life, and salvage value configured on each unit.

---

## SECTION 10: Cash & Accounting

---

### Subsection 10.1 — Cash Drawer Reconciliation

**How to open a shift:**
1. Navigate to Cash Drawer
2. Click "Open Drawer"
3. Enter the starting float (pre-populated from branch settings)
4. The shift is now active — all cash transactions are recorded against it

**How to close a shift:**
1. At end of shift, click "Close Drawer"
2. Count the physical cash and enter the counted amount
3. The system compares to expected cash (float + collections - petty cash out)
4. Any variance is flagged
5. A manager reconciles the drawer and adds notes

**Petty cash:**
- Log any cash taken out of the drawer (fuel, supplies) as petty cash out with a receipt photo
- Log any cash deposited back as petty cash in

---

### Subsection 10.2 — Accounting Dashboard

**What it is:** An overview of financial performance including revenue, expenses, open invoices, and job-level profit & loss.

---

### Subsection 10.3 — Expense Log

**What it is:** A searchable ledger of all company expenses by category, vendor, branch, and job.

**Expense categories include:** Fuel, Repairs/Parts, Labor, Shop Supplies, Insurance, Rent/Lease, Utilities, Vehicle, Subcontractors, Equipment Purchase, Meals, Lodging, Permits, Fines, Hospitality, Towing, Miscellaneous

---

## SECTION 11: Human Resources & Timekeeping

---

### Subsection 11.1 — Timesheets

**What it is:** Digital timekeeping for all staff — clock in, clock out, shift summaries, and payroll export.

---

### Subsection 11.2 — Clock In

**What it is:** A public-facing page (`/clockin`) that staff can access without full login. They scan a QR code or enter their employee ID to clock in or out. The system logs the timestamp and location.

---

### Subsection 11.3 — Employee Profiles

**What it is:** HR records for all staff including contact info, certifications, role assignments, and employment history.

---

### Subsection 11.4 — Leaderboard

**What it is:** A gamified performance view showing staff rankings by rentals processed, deliveries completed, or other configurable metrics. Used to drive engagement and friendly competition.

---

## SECTION 12: Administration & Settings

---

### Subsection 12.1 — Company Settings

**Key settings:**
- Company name, logo, tax ID, DUNS/CAGE codes
- Invoice terms and footer text
- Auto-assign invoice numbers (prefix + starting number)
- SMS reminders (on/off)
- Rental day billing mode: Clock Hour vs. Calendar Day
- Late fees (master switch, per-day amount, grace period, max cap)
- Branding theme and header style
- Demo mode (watermark for prospect demonstrations)
- Store mode (construction only, events only, or both)

---

### Subsection 12.2 — Branch Settings

**Key settings (per branch):**
- Invoice prefix and next invoice number
- Address, phone, email
- Parts buyer email, purchasing email, accounting email
- Default area code for phone number entry
- Branch certifications/licenses
- Default starting cash float

---

### Subsection 12.3 — User Management

**How to invite a user:**
1. Navigate to User Management
2. Click "Invite User"
3. Enter email address and select role
4. The user receives a magic link email to create their account

**Roles available:** Admin, Manager, Counter Staff, Driver, Mechanic (roles can be customized per tenant)

---

### Subsection 12.4 — Role Manager

**What it is:** Defines what each role can see and do within the platform. Admins can create custom roles and assign granular permissions.

---

### Subsection 12.5 — Audit Log

**What it is:** An immutable record of every significant action taken in the system — who did what, when, and what changed. Includes before/after values for data changes.

**Access:** Admin only, PIN-protected under the Fraud section.

---

### Subsection 12.6 — Branding & Theme

**What it is:** Customize the visual appearance of the staff app — primary color, header style (Classic, Glassmorphism, Neon, Navy, Seasonal), and seasonal auto-activation.

---

## SECTION 13: Onboarding & Trial Lifecycle

**How a new subscriber joins AIR:**
1. They submit their info on the public waitlist at `theprojectair.com`
2. An AIR admin reviews the application in Waitlist Manager
3. Admin approves — the subscriber receives a magic link email
4. Subscriber clicks the link and lands on Onboarding
5. They complete 3 steps: Company Info, First Branch, Plan Selection
6. The system provisions their tenant automatically (subdomain, database isolation, default settings)
7. Their 14-day free trial begins immediately
8. Day 12: reminder email sent
9. Day 14: if no upgrade, account downgrades to Core tier (limited features)
10. Day 30: if still not upgraded, account is suspended (lockout)
11. Subscriber upgrades via the subscription checkout flow → Stripe payment → account activates to selected plan

---

## GLOSSARY

| Term | Definition |
|------|-----------|
| Tenant | An isolated subscriber workspace with its own data and subdomain |
| Branch | A physical location within a tenant (e.g., "01 McAllen") |
| Unit | A single trackable equipment asset |
| Bulk Item | Equipment tracked by quantity, not individual serial number (e.g., chairs) |
| Serialized Item | Equipment tracked individually with serial/asset numbers |
| Buffer Days | Required downtime between rentals for a given equipment item |
| Overbooking | Accepting a rental when inventory is technically at capacity (managed risk) |
| Core Tier | Downgraded plan after Day 14 — limited to 1 branch and essential features |
| Pro Tier | Full-featured plan for multi-location operators |
| RFQ | Request for Quotation — a government or commercial bid solicitation |
| RTO | Rent-to-Own — a payment plan where rental fees credit toward equipment purchase |
| PO | Purchase Order |
| WO | Work Order |
| AOG | Aircraft On Ground equivalent — critical equipment breakdown needing immediate repair |
| Magic Link | A one-click email sign-in link (no password required) |
| Geofence | A virtual boundary around a GPS-equipped asset's allowed location |
| Ledger Branch | The branch whose data is currently displayed (controlled by the branch selector) |

---

*This document is the authoritative training source for the AIR AI assistant. When a user asks "What is AIR?", "How do I create a rental?", "What does AIRepair do?", or any operational question, answers should be drawn from this document. If a feature is described here as planned or partial, acknowledge that clearly rather than overstating capability.*