import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Truck, RotateCcw, Users, BarChart3,
  Wrench, ClipboardList, DollarSign, Settings, ChevronDown, ChevronRight,
  Menu, X, Package, MapPin, Star, Shield, FileText, Zap, Globe,
  Building2, AlertTriangle, Layers, TrendingUp, UserCog
} from 'lucide-react';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { label: 'Daily Ops', path: '/', icon: LayoutDashboard },
      { label: 'Counter / New Rental', path: '/counter', icon: Zap },
      { label: 'Dispatch Board', path: '/dispatch', icon: Truck },
      { label: 'Availability Calendar', path: '/availability-calendar', icon: Calendar },
      { label: 'Rental History', path: '/rental-history', icon: ClipboardList },
      { label: 'Delivery Assignment', path: '/assign-deliveries', icon: MapPin },
    ],
  },
  {
    label: 'Equipment',
    items: [
      { label: 'Equipment Status', path: '/equipment-status', icon: Package },
      { label: 'Availability Manager', path: '/availability', icon: Calendar },
      { label: 'Pricing Editor', path: '/pricing-editor', icon: DollarSign },
      { label: 'Categories', path: '/categories', icon: Layers },
      { label: 'Inventory Health', path: '/inventory-health', icon: AlertTriangle },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Discounts & Promos', path: '/discounts', icon: Star },
    ],
  },
  {
    label: 'Shop & Repair',
    items: [
      { label: 'AIRepair', path: '/airepair', icon: Wrench },
      { label: 'Shop Floor', path: '/shop-floor', icon: Building2 },
      { label: 'Inspection Queue', path: '/inspection-queue', icon: Shield },
      { label: 'Parts Procurement', path: '/parts-procurement', icon: Package },
      { label: 'Laundry Dashboard', path: '/laundry', icon: RotateCcw },
    ],
  },
  {
    label: 'Events & Bids',
    items: [
      { label: 'Event Planner', path: '/event-planner', icon: Calendar },
      { label: 'Planner Queue', path: '/planner-queue', icon: ClipboardList },
    ],
  },
  {
    label: 'Analytics & Finance',
    items: [
      { label: 'Manager Dashboard', path: '/manager', icon: BarChart3 },
      { label: 'AIReports', path: '/aireports', icon: TrendingUp },
      { label: 'Accounting', path: '/accounting', icon: DollarSign },
      { label: 'Demand Patterns', path: '/demand-patterns', icon: TrendingUp },
      { label: 'Depreciation', path: '/depreciation', icon: FileText },
    ],
  },
  {
    label: 'Admin & Settings',
    items: [
      { label: 'Branch Settings', path: '/branch-settings', icon: Settings },
      { label: 'Company Settings', path: '/company-settings', icon: Building2 },
      { label: 'Employee Profiles', path: '/employee-profiles', icon: UserCog },
      { label: 'Roles', path: '/roles', icon: Shield },
      { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
      { label: 'Branding', path: '/branding', icon: Star },
    ],
  },
];

function NavGroup({ group, location, onNavigate }) {
  const isActive = group.items.some(i => i.path === location.pathname);
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition"
      >
        {group.label}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mb-2">
          {group.items.map(item => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 text-sm transition ${
                  active
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
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

      {/* Website link */}
      <div className="px-4 py-2 border-b border-slate-700">
        <Link
          to="/air"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition py-1"
        >
          <Globe className="w-3.5 h-3.5" /> View Public Website
        </Link>
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

      {/* Driver / Field */}
      <div className="border-t border-slate-700 px-3 py-3 space-y-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">Field</div>
        {[
          { label: 'Driver Dashboard', path: '/driver', icon: Truck },
          { label: 'Manager Dashboard', path: '/manager', icon: BarChart3 },
        ].map(item => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                active ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
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