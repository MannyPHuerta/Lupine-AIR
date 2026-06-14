// Vercel/Supabase mode - Base44 SDK stub (no Base44 backend features used)
// This project uses Supabase for all data and auth - Base44 is only for hosting

const emptyEntityStub = {
  list: async () => [],
  filter: async () => [],
  create: async () => ({}),
  bulkCreate: async () => [],
  update: async () => ({}),
  delete: async () => ({}),
  schema: async () => ({})
};

export const base44 = {
  auth: {
    me: async () => null,
    logout: () => {},
    redirectToLogin: () => {},
    isAuthenticated: async () => false,
    updateMe: async () => {}
  },
  entities: {
    CompanySettings: emptyEntityStub,
    PlatformFeature: emptyEntityStub,
    User: emptyEntityStub,
    WaitlistEntry: emptyEntityStub,
    SubscriberTrial: emptyEntityStub,
    AuditLog: emptyEntityStub,
    AvailabilityConfig: emptyEntityStub,
    BranchSettings: emptyEntityStub,
    CashDrawer: emptyEntityStub,
    CproContact: emptyEntityStub,
    CustomEmail: emptyEntityStub,
    Customer: emptyEntityStub,
    Delivery: emptyEntityStub,
    DeliveryMatrix: emptyEntityStub,
    DiscountLog: emptyEntityStub,
    DriverLocation: emptyEntityStub,
    Equipment: emptyEntityStub,
    EquipmentCategory: emptyEntityStub,
    EquipmentGPSLink: emptyEntityStub,
    EventPlan: emptyEntityStub,
    Expense: emptyEntityStub,
    GPSProvider: emptyEntityStub
  },
  functions: {
    invoke: async () => ({ data: null })
  },
  integrations: {},
  analytics: {
    track: async () => {}
  },
  users: {
    inviteUser: async () => {}
  },
  agents: {}
};