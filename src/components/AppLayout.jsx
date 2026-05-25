import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useWorkingBranch } from '@/lib/WorkingBranchContext';
import { useHeaderStyle } from '@/lib/useHeaderStyle';
import WorkingBranchModal from '@/components/WorkingBranchModal';
import DemoBanner from '@/components/DemoBanner';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Calendar, Truck, RotateCcw, Users, BarChart3,
  Wrench, ClipboardList, DollarSign, Settings, ChevronDown, ChevronRight,
  Menu, Package, MapPin, Star, Shield, FileText, Zap, Globe,
  Building2, AlertTriangle, Layers, TrendingUp, UserCog, Route,
  Receipt, HardHat, Send, ChartNoAxesCombined, Clock, LogOut, Download
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
      { label: 'Delivery Assignment', path: '/assign-deliveries', icon: MapPin },
      { label: 'Availability Calendar', path: '/availability-calendar', icon: Calendar },
      { label: 'Dispatch Board', path: '/dispatch', icon: Truck },
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Rental History', path: '/rental-history', icon: ClipboardList },
      { label: 'Driver View', path: '/driver', icon: Truck },
      { label: 'Timesheets', path: '/timesheets', icon: Clock },
    ],
  },
  {
    label: 'AIReports',
    color: 'text-violet-400',
    description: 'Management & finance',
    items: [
      { label: 'Business Intelligence', path: '/aireports', icon: ChartNoAxesCombined },
      { label: 'Accounting', path: '/accounting', icon: Receipt },
      { label: 'Loyalty Manager', path: '/loyalty-manager', icon: Star },
      { label: 'Inventory Health', path: '/inventory-health', icon: AlertTriangle },
      { label: 'Audit Logs', path: '/audit-logs', icon: Shield },
      { label: '— Asset Wolf —', path: null, icon: null, divider: true },
      { label: 'Submit Report', path: '/report-form', icon: Send },
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
      { label: 'RFQ Manager', path: '/rfq', icon: FileText },
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
    label: 'AIRecovery',
    color: 'text-orange-400',
    description: 'Theft prevention & recovery',
    items: [
      { label: 'Recovery Intelligence', path: '/airecovery', icon: AlertTriangle },
      { label: 'Equipment GPS Tracking', path: '/equipment-status', icon: MapPin },
      { label: 'GPS Providers', path: '/gps-settings', icon: Settings },
    ],
  },
  {
    label: 'AIREvents',
    color: 'text-pink-400',
    description: 'Events & marketing',
    items: [
      { label: 'Event Planner', path: '/event-planner', icon: Calendar },
      { label: 'Planner Queue', path: '/planner-queue', icon: ClipboardList },
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
      { label: 'User Management', path: '/user-management', icon: Users },
      { label: 'Roles', path: '/roles', icon: Shield },
      { label: 'Discounts & Promos', path: '/discounts', icon: Star },
      { label: 'Branding', path: '/branding', icon: Star },
      { label: 'Inventory Export', path: '/inventory-export', icon: FileText },
      { label: 'Data Export / Backup', path: '/data-export', icon: Download },
      { label: 'Demo Mode Manager', path: '/demo-manager', icon: Star },
    ],
  },
];

function NavGroup({ group, location, onNavigate, allGroupRefs }) {
  const isActive = group.items.some(i => i.path === location.pathname);
  const singleItem = group.items.filter(i => !i.divider && i.path).length === 1;
  const [open, setOpen] = useState(isActive || singleItem);
  const headerRef = useRef(null);
  const itemRefs = useRef([]);
  const navigableItems = group.items.filter(i => !i.divider && i.path);

  // Expose refs upward so sibling groups can be reached via arrow keys
  useEffect(() => {
    if (allGroupRefs) {
      allGroupRefs.current[group.label] = { headerRef, itemRefs, navigableItems, open, setOpen };
    }
  });

  const handleHeaderKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setTimeout(() => itemRefs.current[0]?.focus(), 0);
      } else {
        itemRefs.current[0]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move to previous group's last item or header
      const keys = Object.keys(allGroupRefs.current);
      const myIdx = keys.indexOf(group.label);
      if (myIdx > 0) {
        const prev = allGroupRefs.current[keys[myIdx - 1]];
        if (prev.open && prev.navigableItems.length > 0) {
          prev.itemRefs.current[prev.navigableItems.length - 1]?.focus();
        } else {
          prev.headerRef.current?.focus();
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(o => !o);
    }
  };

  const handleItemKeyDown = (e, navIdx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (navIdx < navigableItems.length - 1) {
        itemRefs.current[navIdx + 1]?.focus();
      } else {
        // Move to next group header
        const keys = Object.keys(allGroupRefs.current);
        const myIdx = keys.indexOf(group.label);
        if (myIdx < keys.length - 1) {
          allGroupRefs.current[keys[myIdx + 1]]?.headerRef.current?.focus();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (navIdx > 0) {
        itemRefs.current[navIdx - 1]?.focus();
      } else {
        headerRef.current?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      headerRef.current?.focus();
    }
  };

  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        ref={headerRef}
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleHeaderKeyDown}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/40 transition group focus:outline-none focus:bg-slate-700/40"
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
          {group.items.map((item) => {
            if (item.divider) {
              return (
                <div key={item.label} className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Asset Wolf
                </div>
              );
            }
            const active = location.pathname === item.path;
            const Icon = item.icon;
            const navIdx = navigableItems.indexOf(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                ref={el => { itemRefs.current[navIdx] = el; }}
                tabIndex={0}
                onKeyDown={e => handleItemKeyDown(e, navIdx)}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-4 py-1.5 text-sm transition border-l-4 focus:outline-none focus:bg-slate-700/60 ${
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
  const { workingBranch, loading } = useWorkingBranch();
  const [user, setUser] = useState(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const allGroupRefs = useRef({});
  const headerStyleResult = useHeaderStyle();
  const headerStyle = headerStyleResult?.style ?? null;
  const seasonalTheme = headerStyleResult?.seasonalTheme ?? null;

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (!workingBranch && !loading) {
        setShowBranchModal(true);
      }
    }).catch(() => {});
  }, [workingBranch, loading]);

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
          <div className="text-white font-bold text-sm leading-tight">AIR</div>
          <div className="text-indigo-400 text-xs">by Lupine</div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {navGroups.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            location={location}
            onNavigate={() => setSidebarOpen(false)}
            allGroupRefs={allGroupRefs}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 px-4 py-3 space-y-2">
        {user && (
          <div className="text-xs text-slate-400 truncate">{user.email}</div>
        )}
        <div className="flex items-center justify-between">
          <Link
            to="/air"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            <Globe className="w-3.5 h-3.5" /> Public Site
          </Link>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-1.5 text-xs text-white hover:text-red-300 transition font-semibold"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {showBranchModal && <WorkingBranchModal user={user} onClose={() => setShowBranchModal(false)} />}
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 overflow-hidden" style={{
        backgroundColor: headerStyle === 'navy' ? '#0d1b3e'
          : headerStyle === 'glassmorphism' ? '#1e293b'
          : headerStyle === 'neon' ? '#09090b'
          : headerStyle === 'seasonal' && seasonalTheme ? seasonalTheme.sidebarBg
          : '#1e293b'
      }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 overflow-hidden flex flex-col" style={{
            backgroundColor: headerStyle === 'navy' ? '#0d1b3e'
              : headerStyle === 'glassmorphism' ? '#1e293b'
              : headerStyle === 'neon' ? '#09090b'
              : headerStyle === 'seasonal' && seasonalTheme ? seasonalTheme.sidebarBg
              : '#1e293b'
          }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 text-white" style={{
          backgroundColor: headerStyle === 'navy' ? '#0d1b3e'
            : headerStyle === 'glassmorphism' ? '#1e293b'
            : headerStyle === 'neon' ? '#09090b'
            : headerStyle === 'seasonal' && seasonalTheme ? seasonalTheme.sidebarBg
            : '#1e293b'
        }}>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/4da8b3637_AIRBlack-01.svg"
            alt="AIR"
            className="h-6 w-6 rounded"
          />
          <span className="font-bold text-sm">AIR</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <DemoBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}