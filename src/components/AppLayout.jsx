import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Truck, RotateCcw, Users, BarChart3,
  Wrench, ClipboardList, DollarSign, Settings, ChevronDown, ChevronRight,
  Menu, Package, MapPin, Star, Shield, FileText, Zap, Globe,
  Building2, AlertTriangle, Layers, TrendingUp, UserCog, Route,
  Receipt, HardHat, Send, ChartNoAxesCombined
} from 'lucide-react';

// Each top-level group maps to one of the 6 AIR modules + Admin
const navGroups = [
  {
    label: 'AIRental',
    color: 'text-cyan-400',
    description: 'Daily counter ops',
    items: [
      { label: 'Daily Ops', path: '/', icon: LayoutDashboard },
      { label: 'Counter / Quick Sale', path: '/counter', icon: Zap },
      { label: 'New Rental / Availability', path: '/availability', icon: Calendar },
      { label: 'Dispatch Board', path: '/dispatch', icon: Truck },
      { label: 'Delivery Assignment', path: '/assign-deliveries', icon: MapPin },
      { label: 'Availability Calendar', path: '/availability-calendar', icon: Calendar },
      { label: 'Rental History', path: '/rental-history', icon: ClipboardList },
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Discounts & Promos', path: '/discounts', icon: Star },
      { label: 'Driver View', path: '/driver', icon: Truck },
    ],
  },
  {
    label: 'AIReports',
    color: 'text-violet-400',
    description: 'Management & finance',
    items: [
      { label: 'Manager Dashboard', path: '/manager', icon: BarChart3 },
      { label: 'AI Reports', path: '/aireports', icon: ChartNoAxesCombined },
      { label: 'Accounting', path: '/accounting', icon: Receipt },
      { label: 'Demand Patterns', path: '/demand-patterns', icon: TrendingUp },
      { label: 'Depreciation', path: '/depreciation', icon: FileText },
      { label: 'Inventory Health', path: '/inventory-health', icon: AlertTriangle },
      { label: 'Loyalty Manager', path: '/loyalty-manager', icon: Star },
      { label: 'Audit Logs', path: '/audit-logs', icon: Shield },
    ],
  },
  {
    label: 'AIRoads',
    color: 'text-amber-400',
    description: 'Transport & logistics',
    items: [
      { label: 'AIRoads Hub', path: '/airoads', icon: Route },
    ],
  },
  {
    label: 'AIRfq',
    color: 'text-green-400',
    description: 'Quotes & bids',
    items: [
      { label: 'Event Planner', path: '/event-planner', icon: Calendar },
      { label: 'Planner Queue', path: '/planner-queue', icon: ClipboardList },
      { label: 'RFQ Website', path: '/airfq', icon: Send },
    ],
  },
  {
    label: 'AIRepair',
    color: 'text-red-400',
    description: 'Shop & maintenance',
    items: [
      { label: 'Repair Intelligence', path: '/airepair', icon: Wrench },
      { label: 'Shop Floor', path: '/shop-floor', icon: Building2 },
      { label: 'Inspection Queue', path: '/inspection-queue', icon: Shield },
      { label: 'Parts Procurement', path: '/parts-procurement', icon: Package },
      { label: 'Laundry Dashboard', path: '/laundry', icon: RotateCcw },
      { label: 'Equipment Status', path: '/equipment-status', icon: HardHat },
    ],
  },
  {
    label: 'AIREvents',
    color: 'text-pink-400',
    description: 'Events & marketing',
    items: [
      { label: 'Events Website', path: '/airevents', icon: Globe },
      { label: 'Asset Reports', path: '/pending', icon: FileText },
      { label: 'Marketplace', path: '/marketplace', icon: TrendingUp },
    ],
  },
  {
    label: 'Admin',
    color: 'text-slate-400',
    description: 'Settings & config',
    items: [
      { label: 'Pricing Editor', path: '/pricing-editor', icon: DollarSign },
      { label: 'Equipment Specs', path: '/equipment-specs', icon: Settings },
      { label: 'Categories', path: '/categories', icon: Layers },
      { label: 'Availability Config', path: '/availability-config', icon: Settings },
      { label: 'Dependencies Editor', path: '/dependencies-editor', icon: Layers },
      { label: 'Delivery Matrix', path: '/delivery-matrix', icon: MapPin },
      { label: 'Rental Agreement', path: '/rental-agreement', icon: FileText },
      { label: 'Branch Settings', path: '/branch-settings', icon: Building2 },
      { label: 'Company Settings', path: '/company-settings', icon: Building2 },
      { label: 'Employee Profiles', path: '/employee-profiles', icon: UserCog },
      { label: 'Roles', path: '/roles', icon: Shield },
      { label: 'Branding', path: '/branding', icon: Star },
      { label: 'Inventory Export', path: '/inventory-export', icon: FileText },
    ],
  },
];

function NavGroup({ group, location, onNavigate }) {
  const isActive = group.items.some(i => i.path === location.pathname);
  const [open, setOpen] = useState(isActive);

  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/40 transition group"
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${group.color}`}>{group.label}</span>
          {group.description && (
            <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition hidden lg:block">{group.description}</span>
          )}
        </div>
        {open ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
      </button>
      {open && (
        <div className="pb-1">
          {group.items.map(item => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-4 py-1.5 text-sm transition border-l-2 ${
                  active
                    ? `font-semibold ${group.color} bg-slate-700/60 border-current`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <img
          src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg"
          alt="AIR"
          className="h-8 w-8 rounded-lg"
        />
        <div>
          <div className="text-white font-bold text-sm leading-tight">AIR Platform</div>
          <div className="text-indigo-400 text-xs">by Lupine</div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {navGroups.map(group => (
          <NavGroup
            key={group.label}
            group={group}
            location={location}
            onNavigate={() => setSidebarOpen(false)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 px-4 py-3">
        <Link
          to="/air"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition"
        >
          <Globe className="w-3.5 h-3.5" /> View Public Website
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-800 flex-shrink-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-800 overflow-hidden flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 text-white">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg"
            alt="AIR"
            className="h-6 w-6 rounded"
          />
          <span className="font-bold text-sm">AIR Platform</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}