import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Comprehensive platform knowledge - all modules and features
    const platformFeatures = [
      {
        module: "DailyOps",
        featureName: "Main Dashboard",
        description: "Central hub for daily counter operations and quick access to all modules",
        workflow: ["View today's rentals and deliveries", "Quick stats: revenue, outstanding returns, new rentals", "Access all modules from sidebar", "Real-time notifications and alerts"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "What is DailyOps?", answer: "DailyOps is your main dashboard showing today's key metrics: rentals, deliveries, returns, and revenue. Use it as your starting point each day." }
        ]
      },
      {
        module: "Counter",
        featureName: "Quick Sale",
        description: "Fast walk-in equipment sales without customer details - ideal for consumables and grab-and-go rentals",
        workflow: ["Search equipment by name", "Add items to cart", "Review subtotal with auto-discounts", "Click Complete Quick Sale", "Print simple invoice"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I create a quick sale?", answer: "Go to Counter → Search equipment → Add to cart → Click Complete Quick Sale → Print invoice. No customer details needed." },
          { question: "Does Counter require customer information?", answer: "No. Counter is designed for walk-in customers only. No name, phone, address, or signature required." }
        ]
      },
      {
        module: "AvailabilityManager",
        featureName: "Full Rental Contract",
        description: "Complete rental workflow with customer details, delivery options, signatures, and payment processing",
        workflow: ["Select or create customer", "Add equipment with start/end dates", "Choose delivery/pickup method", "Review auto-calculated totals", "Apply discounts (volume, promo, loyalty)", "Capture customer signature", "Print invoice and send confirmation"],
        requiresCustomer: true,
        requiresSignature: true,
        requiresPayment: true,
        commonQuestions: [
          { question: "How do I create a full rental contract?", answer: "Go to Availability → New Rental → Select customer → Add equipment with dates → Review totals → Capture signature → Print/Email invoice." },
          { question: "When should I use Availability vs Counter?", answer: "Use Counter for quick walk-in sales (no customer details). Use Availability for full rentals requiring customer info, delivery, and signatures." }
        ]
      },
      {
        module: "AIReports",
        featureName: "Business Intelligence",
        description: "Financial analytics, profitability reports, fraud detection, and business insights",
        workflow: ["Navigate to AIReports from main menu", "Select Accounting for P&L statements", "Choose Fraud Intel for suspicious activity alerts", "View Fleet Analytics for utilization metrics", "Check Inventory Health for slow-moving equipment", "Export reports as PDF/Excel"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I determine how profitable my business is?", answer: "Go to AIReports → Click Accounting → Click P&L. Select date range to view profit/loss by job or company-wide." },
          { question: "How do I track profitability per job?", answer: "Go to Accounting → Job P&L → Select invoice number → View revenue vs expenses (delivery, parts, labor, subcontractors)." },
          { question: "How do I detect fraudulent rentals?", answer: "Go to AIReports → Fraud Intel. System flags suspicious patterns: fake IDs, stolen equipment, repeat offenders." }
        ]
      },
      {
        module: "AIRoads",
        featureName: "Logistics and Shipping",
        description: "Load planning, shipping labels, field expense capture, and job-level P&L tracking",
        workflow: ["Create new load in Load Planner", "Auto-pack equipment using AI suggestions", "Generate shipping labels and BOL", "Drivers capture receipts in field", "Track job-level expenses and profitability"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I optimize truck loading?", answer: "Go to AIRoads → Load Planner → Add equipment → AI suggests optimal truck and layout → Generate load manifest." },
          { question: "How do drivers capture expenses?", answer: "Drivers use AIRoads mobile view → Field Expense Capture → Photograph receipt → AI categorizes expense → Links to job P&L." }
        ]
      },
      {
        module: "AIRfq",
        featureName: "RFQ Intelligence",
        description: "Request for Quote analysis, compliance tracking, and competitive bid responses",
        workflow: ["Upload RFP/RFQ document", "AI analyzes requirements and line items", "Build compliance matrix", "Price line items competitively", "Generate professional bid response"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I respond to an RFQ?", answer: "Go to RFQ Manager → Upload RFP document → AI extracts requirements → Price line items → Generate bid response." }
        ]
      },
      {
        module: "AIRepair",
        featureName: "Shop and Maintenance",
        description: "Repair workflows, work orders, parts procurement, and predictive maintenance alerts",
        workflow: ["Create work order (repair/inspection/cleaning)", "Assign to mechanic based on skills", "Request parts if needed", "Track repair progress", "Update equipment status when complete"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I create a repair work order?", answer: "Go to AIRepair → New Work Order → Select equipment → Choose type (repair/inspection) → Assign mechanic → Add parts if needed." },
          { question: "How do I order parts?", answer: "Go to Parts Procurement → Create parts request → Send RFQ to vendors → Track received parts → Update work order." }
        ]
      },
      {
        module: "AIRecovery",
        featureName: "Theft Recovery and GPS Tracking",
        description: "Equipment recovery, GPS integration, geofence alerts, and insurance claim packages",
        workflow: ["Create recovery record with police report", "GPS tracking shows last known location", "Geofence breach alerts via SMS/email", "Generate claim package for insurance", "Track recovery status"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "What if equipment is stolen?", answer: "Go to AIRecovery → Create recovery record → Enter police report details → GPS auto-tracks location → Generate insurance claim package." },
          { question: "How do I set up GPS tracking?", answer: "Go to GPS Settings → Add GPS provider (Samsara, Geotab, etc.) → Enter API credentials → Link equipment to GPS devices." }
        ]
      },
      {
        module: "AIREvents",
        featureName: "Event Planning",
        description: "Visual event design, floor plans, equipment auto-packing, and customer proposals",
        workflow: ["Create new event plan", "Use visual canvas to place tents, staging, chairs", "AI auto-packs required equipment", "Generate customer proposal with site plan", "Convert to rental contract when approved"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I plan an event?", answer: "Go to Event Planner → Create plan → Use canvas to place equipment → AI suggests quantities → Generate proposal → Convert to rental when approved." }
        ]
      },
      {
        module: "Customers",
        featureName: "Customer Management",
        description: "Customer database, account types, payment terms, credit holds, and loyalty discounts",
        workflow: ["Search existing customers", "Create new customer with full details", "Set account type (individual/business/municipal)", "Configure payment terms and credit limits", "Add linked contacts for business accounts"],
        requiresCustomer: true,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I add a new customer?", answer: "Go to Customers → New Customer → Enter full name, phone, email, address → Set account type → Save." },
          { question: "How do loyalty discounts work?", answer: "Go to Customer record → Enable loyalty discount → Set percentage → Discount auto-applies to all their rentals." }
        ]
      },
      {
        module: "Equipment",
        featureName: "Catalog Management",
        description: "Equipment catalog, pricing per branch, dependencies, status tracking, and specifications",
        workflow: ["Review and approve migrated inventory items", "Set pricing per branch (daily/weekly/monthly)", "Configure equipment dependencies", "Track unit status (available/reserved/out/maintenance)", "Add technical specifications by category"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I change equipment pricing?", answer: "Go to Pricing Editor → Select branch → Search equipment → Update rates → Save. Changes apply to new rentals only." },
          { question: "How do I check equipment availability?", answer: "Use Availability Calendar from main menu, or check availability panel when creating rental — shows conflicts in real-time." }
        ]
      },
      {
        module: "Delivery",
        featureName: "Dispatch and Delivery",
        description: "Delivery assignment, driver notifications, route optimization, and signature capture",
        workflow: ["Manager assigns deliveries in Dispatch Board", "Driver receives notification on Driver Dashboard", "Driver completes delivery with signature/photos", "System updates rental status automatically", "Cross-branch transfers tracked"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I assign a delivery to a driver?", answer: "Go to Dispatch Board → Select pending deliveries → Choose driver → Assign. Driver gets notification on their dashboard." },
          { question: "How do delivery fees work?", answer: "Set up delivery matrix in Delivery Matrix with fees per ZIP code. System auto-applies fees based on customer location." }
        ]
      },
      {
        module: "Accounting",
        featureName: "Financial Management",
        description: "Expense tracking, invoice management, job-level P&L, and depreciation reports",
        workflow: ["Log vendor expenses (parts, labor, fuel)", "Track accounts receivable", "View job-level P&L by invoice number", "Run depreciation reports (straight-line or declining balance)", "Export financial data"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I log an expense?", answer: "Go to Accounting → Expense Log → Enter date, category, vendor, amount → Upload receipt → Save." },
          { question: "How do I view depreciation?", answer: "Go to Accounting → Depreciation Report → Select date range → View by equipment category or individual units." }
        ]
      },
      {
        module: "Admin",
        featureName: "System Administration",
        description: "Company settings, branch configuration, user management, roles, audit logs, and data exports",
        workflow: ["Configure company branding and invoice terms", "Set up branch-specific settings", "Invite staff and assign roles", "Customize permission sets", "View audit logs for compliance", "Export all data for backup"],
        requiresCustomer: false,
        requiresSignature: false,
        requiresPayment: false,
        commonQuestions: [
          { question: "How do I invite new staff?", answer: "Go to User Management → Add user email → Select role (admin/user) → Send invite. They receive login credentials via email." },
          { question: "Can I export my data?", answer: "Yes — go to Data Export → Select entities → Download CSV/JSON. Full backup available anytime." },
          { question: "How do I change company branding?", answer: "Go to Company Settings → Upload logo → Set colors → Configure invoice footer → Save." }
        ]
      }
    ];

    // Bulk create all platform features
    await base44.entities.PlatformFeature.bulkCreate(platformFeatures);

    return Response.json({ 
      success: true,
      message: `Seeded ${platformFeatures.length} platform features to PlatformFeature entity`,
      count: platformFeatures.length
    });
  } catch (error) {
    console.error('seedPlatformKnowledge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});