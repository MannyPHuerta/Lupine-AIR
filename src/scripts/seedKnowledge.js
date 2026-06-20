/* global process */
// Run via: node scripts/seedKnowledge.js
// Vercel runs this automatically via postbuild in package.json
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const TRAINING_ENTRIES = [
  {
    module: 'Platform',
    feature_name: 'What is AIR?',
    description: `AIR (Artificial Intelligence Rentals) is a multi-tenant, AI-native rental management platform built by Lupine for the equipment and event rental industry. It serves small-to-medium rental companies in construction, heavy equipment, and event/party rental markets.

AIR replaces legacy rental software (CPro, Point of Rental, DOS-era systems) with a modern, mobile-friendly web app that embeds AI into every operational workflow. Every subscriber gets their own isolated tenant (subdomain, e.g. acme.theprojectair.com) with their own data, branches, users, and settings.

Plan tiers:
- Core: 1 branch, essential counter + rental ops, AIRental + AIREvents, email & SMS
- Pro: Up to 3 branches, all AI modules, AIRepair + AIRecovery, GPS tracking
- Custom: Up to 10 branches, AIRfq + AIRoads, advanced maintenance, account manager

The platform is organized into named Sections — each prefixed with "AI" — that correspond to major operational domains.`,
    is_active: true,
    workflow: [],
    common_questions: [
      { question: 'What is AIR?', answer: 'AIR is an AI-native rental management platform for construction and event rental companies. It replaces legacy software with a modern, mobile-friendly web app built around AI workflows.' },
      { question: 'Who uses AIR?', answer: 'Counter staff, drivers, shop mechanics, branch managers, company owners, and procurement staff all use different parts of AIR.' },
    ],
  },
  {
    module: 'AIRental',
    feature_name: 'Daily Ops Dashboard',
    description: `Daily Ops is the main landing page after login. Shows a real-time snapshot of the branch: active rentals, equipment due back today, overdue equipment, pending deliveries, open work orders, and cash drawer status. Branch-aware — switch branches using the branch selector at the top of the sidebar.`,
    is_active: true,
    workflow: ['Log in', 'Review Due Today list', 'Check Overdue items', 'Review delivery assignments', 'Use quick-action buttons to jump to Counter, Dispatch, or Shop Floor'],
    common_questions: [
      { question: 'What is Daily Ops?', answer: 'Daily Ops is the home dashboard. It shows active rentals, equipment due today, overdue items, pending deliveries, open work orders, and cash drawer status for the current branch.' },
    ],
  },
  {
    module: 'AIRental',
    feature_name: 'Counter — Creating a Rental',
    description: `The Counter is where staff create rental contracts, process payments, and check out equipment.

Full rental workflow:
1. Click Counter in the sidebar
2. Click New Rental
3. Search for customer by name, phone, or email. If new, click "New Customer"
4. Verify customer identity (ID type, last 4 digits, phone verification)
5. Add equipment — search by name, category, or asset number
6. Set rental dates — system auto-calculates daily/weekly/monthly rate
7. Review line items and apply discounts (promo code, volume, or loyalty)
8. Select payment method: Cash, Card, Check, or ACH
9. Capture customer signature on screen
10. Print or email the rental agreement PDF
11. Equipment is marked out — inventory updates in real time

Quick Sale: For consumables (propane, ice, cones), use Quick Sale — no rental contract, just a POS receipt.

Customer alerts: Credit hold shows a red banner requiring upfront payment. Blacklisted customers cannot be added to a rental.`,
    is_active: true,
    workflow: ['Open Counter', 'New Rental', 'Search/create customer', 'Verify ID', 'Add equipment', 'Set dates', 'Apply discounts', 'Select payment', 'Capture signature', 'Email/print contract'],
    common_questions: [
      { question: 'How do I create a rental?', answer: 'Go to Counter → New Rental. Search for or create the customer, add equipment, set dates, apply any discounts, collect payment, get the customer signature, and print or email the contract.' },
      { question: 'What is Quick Sale?', answer: 'Quick Sale is for consumable items (propane, ice, safety cones). It creates a simple receipt without a full rental contract.' },
      { question: 'What happens when a customer is on credit hold?', answer: 'A red banner appears at the top of the counter screen. Staff must collect full upfront payment before proceeding.' },
    ],
  },
  {
    module: 'AIRental',
    feature_name: 'Availability Calendar',
    description: `Visual calendar showing which equipment is booked, available, or in conflict on any date range. Color coding: green = available, yellow = partially booked, red = fully booked/conflict. Click any block to see which rental occupies it. Buffer days appear as blocked time between rentals.`,
    is_active: true,
    workflow: ['Navigate to Availability Calendar', 'Select date range', 'Filter by category or equipment item', 'Read color-coded blocks', 'Click block to see rental details'],
    common_questions: [
      { question: 'How do I check if equipment is available?', answer: 'Go to Availability Calendar, select the date range, and filter by the equipment item. Green means available, red means booked.' },
    ],
  },
  {
    module: 'AIRental',
    feature_name: 'Customers',
    description: `CRM view for all customer accounts. Customer profile includes: contact info, rental history, total spend, loyalty status, credit hold/blacklist status, linked contacts (authorized renters), tax exemption, and notes. Add linked contacts (employees authorized to pick up equipment for a business account). Admins can enable a standing loyalty discount (e.g. 5% off all rentals) on any account.`,
    is_active: true,
    workflow: ['Navigate to Customers', 'Search by name/company/phone/email', 'Click customer to open profile', 'Edit any field directly', 'Add linked contacts or loyalty discount'],
    common_questions: [
      { question: 'How do I look up a customer?', answer: 'Go to Customers and search by name, company, phone, or email. Click the result to open their full profile.' },
      { question: 'How do I give a customer a loyalty discount?', answer: 'Open the customer profile, find the Loyalty Discount section, enable it, and set the percentage. It auto-applies at the counter for future rentals.' },
    ],
  },
  {
    module: 'AIREvents',
    feature_name: 'Event Planner Canvas',
    description: `A visual, drag-and-drop floor plan tool for designing event layouts. Staff or customers place equipment on a scaled canvas and the system generates a quote automatically.

Full workflow:
1. Navigate to Event Planner or click New Plan from Planner Queue
2. Enter event details: title, event type, date, guest count, customer contact
3. Define venue: enter dimensions (W×L in feet), upload a photo, or enter an address
4. Set ground surface (grass, asphalt, concrete, etc.)
5. Drag equipment from the Item Palette onto the canvas: tents, tables, chairs, staging, lighting, generators, restroom trailers
6. Position and rotate items by dragging
7. Quote Summary panel updates in real time
8. AI Nudge Panel suggests missing items
9. Save and optionally share with customer for review
10. Once approved, click Convert to Rental

Plan statuses: Draft → Customer Review → Planner Review → Finalized → Converted → Cancelled`,
    is_active: true,
    workflow: ['Open Event Planner', 'Enter event details', 'Define venue dimensions', 'Drag equipment onto canvas', 'Review AI nudges', 'Save plan', 'Convert to Rental when approved'],
    common_questions: [
      { question: 'How do I create an event plan?', answer: 'Go to Event Planner, enter the event details and venue dimensions, then drag equipment from the Item Palette onto the canvas. The quote updates automatically. When the customer approves, click Convert to Rental.' },
    ],
  },
  {
    module: 'AIRepair',
    feature_name: 'Shop Floor & Work Orders',
    description: `Shop Floor is the mechanic\'s primary view showing all open work orders.

Creating a work order:
1. Navigate to Shop Floor (or flag equipment for repair from Equipment Detail)
2. Click New Work Order
3. Select the equipment unit
4. Describe the issue
5. Set priority: Routine, Urgent, or Critical
6. Assign to a mechanic (or leave for manager to assign)
7. Add initial parts requirements
8. Save

Work order lifecycle: Open → In Progress → Awaiting Parts → Completed → Closed

Inspection Queue: After a rental return, equipment goes to Inspection Queue. Pass = back to Available. Fail = new work order created, equipment goes to In Shop status.`,
    is_active: true,
    workflow: ['Open Shop Floor', 'New Work Order', 'Select unit', 'Describe issue', 'Set priority', 'Assign mechanic', 'Add parts', 'Save'],
    common_questions: [
      { question: 'How do I create a work order?', answer: 'Go to Shop Floor → New Work Order. Select the equipment unit, describe the issue, set priority, assign a mechanic, and save.' },
      { question: 'What happens when equipment fails inspection?', answer: 'A work order is automatically created and the equipment status is changed to In Shop until repairs are complete.' },
    ],
  },
  {
    module: 'AIRecovery',
    feature_name: 'Fraud Intelligence & GPS Alerts',
    description: `AIRecovery monitors rental activity for suspicious patterns and manages GPS tracking data.

Fraud flags:
- Equipment moved at night (outside rental hours)
- Equipment exceeding 40 mph (unauthorized transport)
- Equipment outside agreed worksite geofence
- Customer accounts with multiple late returns or disputes

GPS setup:
1. Go to GPS Provider Settings → Add Provider
2. Select provider (Samsara, Geotab, Verizon Connect, CalAmp, Bouncie, etc.)
3. Enter API key and account credentials
4. Link devices to equipment units from the Equipment Detail page

Access: Admin-only, PIN-protected.`,
    is_active: true,
    workflow: ['Navigate to Fraud Intelligence (admin + PIN)', 'Review flagged events', 'Click alert for full context', 'Mark reviewed, escalate, or dismiss'],
    common_questions: [
      { question: 'How do I set up GPS tracking?', answer: 'Go to GPS Provider Settings, add your provider with API credentials, then link devices to equipment units from each Equipment Detail page.' },
      { question: 'What triggers a fraud alert?', answer: 'Night movement, speed over 40 mph, geofence breach, and customers with multiple disputes all trigger alerts.' },
    ],
  },
  {
    module: 'AIRoads',
    feature_name: 'Dispatch & Driver Workflow',
    description: `AIRoads manages delivery and logistics.

Dispatch Board (manager view):
- See all pending deliveries
- Drag-drop to assign drivers and vehicles
- AI recommends optimal route order
- Track driver locations live on map

Driver Dashboard (mobile-optimized):
1. Driver logs in on phone → sees delivery queue
2. Taps a delivery to open it
3. Reviews the equipment manifest
4. Marks Departed when leaving branch
5. Marks Arrived at customer location
6. Completes setup checklist
7. Takes geotagged condition photos
8. Collects customer signature on screen
9. Marks Complete — rental contract updated automatically

Field Expense Capture: Drivers tap Log Expense, photograph receipt, AI pre-fills amount/vendor/category.`,
    is_active: true,
    workflow: ['Manager assigns deliveries on Dispatch Board', 'Driver opens Driver Dashboard on phone', 'Driver follows manifest: Depart → Arrive → Checklist → Photos → Signature → Complete'],
    common_questions: [
      { question: 'How does a driver complete a delivery?', answer: 'On the Driver Dashboard, the driver marks Departed, then Arrived, completes the equipment checklist, takes condition photos, collects the customer signature, and marks Complete.' },
    ],
  },
  {
    module: 'AIRfq',
    feature_name: 'RFQ Bid Analysis',
    description: `AIRfq assists with government and commercial bid responses.

Full workflow:
1. Receive an RFQ document (PDF or Word)
2. Navigate to RFQ Manager → New RFQ → upload document
3. AI runs 4-step analysis:
   - Step 1 (Analyze): Identifies requested equipment and services
   - Step 2 (Compliance): Checks bid requirements against your certifications and capacity
   - Step 3 (Line Items): Generates pricing table using your current rate sheet
   - Step 4 (Response): Drafts the full bid response document
4. Staff reviews and edits the draft
5. Export to PDF and submit
6. Track bid status in RFQ Manager`,
    is_active: true,
    workflow: ['Upload RFQ document', 'AI analyzes in 4 steps', 'Review and edit draft response', 'Export to PDF', 'Submit to agency', 'Track status in RFQ Manager'],
    common_questions: [
      { question: 'How do I respond to a government bid using AIRfq?', answer: 'Upload the RFQ document in RFQ Manager. The AI analyzes the requirements, checks your compliance, builds a pricing table, and drafts the full response. You review, edit, export to PDF, and submit.' },
    ],
  },
  {
    module: 'Administration',
    feature_name: 'Cash Drawer Reconciliation',
    description: `Opening a shift:
1. Navigate to Cash Drawer → Open Drawer
2. Enter starting float (pre-populated from branch settings)
3. Shift is active — all cash transactions record against it

Closing a shift:
1. Click Close Drawer
2. Count physical cash and enter the amount
3. System compares to expected (float + collections - petty cash out)
4. Variance is flagged for manager review
5. Manager reconciles and adds notes

Petty cash: Log cash taken out (fuel, supplies) as petty cash out with receipt photo.`,
    is_active: true,
    workflow: ['Open Drawer → set starting float', 'Record all cash transactions during shift', 'Close Drawer → count and enter cash', 'Manager reconciles variance'],
    common_questions: [
      { question: 'How do I open a cash drawer?', answer: 'Go to Cash Drawer → Open Drawer. Enter the starting float and the shift begins.' },
      { question: 'How do I close a shift?', answer: 'Click Close Drawer, physically count the cash and enter the amount. The system calculates the expected total and flags any variance for manager review.' },
    ],
  },
  {
    module: 'Administration',
    feature_name: 'Onboarding & Trial Lifecycle',
    description: `How a subscriber joins AIR:
1. Submit info on public waitlist at theprojectair.com
2. AIR admin approves in Waitlist Manager
3. Subscriber receives magic link email
4. Clicks link → lands on Onboarding (3 steps: Company Info, First Branch, Plan Selection)
5. System provisions tenant automatically (subdomain, isolated database, default settings)
6. 14-day free trial begins

Trial timeline:
- Day 12: Reminder email sent
- Day 14: If no upgrade, account downgrades to Core tier
- Day 30: If still not upgraded, account suspended

Magic link sign-in: Users receive a one-click email link. No password required. Links expire in 1 hour.`,
    is_active: true,
    workflow: ['Submit waitlist', 'Admin approves', 'Click magic link', 'Complete onboarding', 'Trial starts', 'Upgrade before Day 14 to keep full access'],
    common_questions: [
      { question: 'How does the trial work?', answer: '14-day full access trial starts on approval. Day 12 you get a reminder. Day 14 if no upgrade, you drop to Core tier. Day 30, the account suspends.' },
      { question: 'What is a magic link?', answer: 'A one-click email sign-in link. No password needed. Click it and you are signed in automatically. Links expire in 1 hour.' },
    ],
  },
];

async function seed() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping knowledge seed.');
    return;
  }
  console.log('🌱 Seeding platform knowledge...');

  // Check which entries already exist to avoid duplicates
  const { data: existing } = await supabase
    .from('platform_features')
    .select('feature_name');

  const existingNames = new Set((existing || []).map(e => e.feature_name));
  const toInsert = TRAINING_ENTRIES.filter(e => !existingNames.has(e.feature_name));

  if (toInsert.length === 0) {
    console.log('✅ All knowledge entries already exist — nothing to insert.');
    return;
  }

  const { data, error } = await supabase
    .from('platform_features')
    .insert(toInsert.map(e => ({
      module: e.module,
      feature_name: e.feature_name,
      description: e.description,
      is_active: e.is_active,
      workflow: e.workflow,
      common_questions: e.common_questions,
    })))
    .select('id, feature_name');

  if (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${data.length} knowledge entries:`);
  data.forEach(d => console.log(`   - ${d.feature_name}`));
}

seed();