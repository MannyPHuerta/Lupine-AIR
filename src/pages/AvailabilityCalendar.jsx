import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Printer, ChevronLeft, ChevronRight,
  LayoutGrid, CalendarDays, List, MessageSquare, CalendarRange
} from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import EquipmentAvailabilityCalendar from '@/components/calendar/EquipmentAvailabilityCalendar';
import CalendarPrintModal from '@/components/calendar/CalendarPrintModal';
import CalendarDayView from '@/components/calendar/CalendarDayView';
import CalendarWeekView from '@/components/calendar/CalendarWeekView';
import TextCrewModal from '@/components/calendar/TextCrewModal';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];
const VIEWS = [
  { id: 'gantt', label: 'Gantt', icon: LayoutGrid },
  { id: 'week',  label: 'Week',  icon: CalendarDays },
  { id: 'day',   label: 'Day',   icon: List },
];

export default function AvailabilityCalendar() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const focusRentalId = urlParams.get('rentalId');
  const focusDate = urlParams.get('date');

  const [equipment, setEquipment]     = useState([]);
  const [rentals, setRentals]         = useState([]);
  const [deliveries, setDeliveries]   = useState([]);
  const [users, setUsers]             = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [showPrint, setShowPrint]     = useState(false);
  const [showTextCrew, setShowTextCrew] = useState(false);

  const [view, setView]     = useState('gantt'); // 'gantt' | 'week' | 'day'
  const [branch, setBranch] = useState('All Branches');
  const [viewDate, setViewDate] = useState(() => focusDate ? new Date(focusDate + 'T12:00:00') : new Date());

  const load = async () => {
    const [me, eq, rent, dels, usrs] = await Promise.all([
      base44.auth.me(),
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-startDate', 2000),
      base44.entities.Delivery.list('-created_date', 1000),
      base44.entities.User.list(),
    ]);
    setCurrentUser(me);
    setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
    setRentals(rent);
    setDeliveries(dels);
    setUsers(usrs);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDeliveryAssigned = (newDelivery) => {
    setDeliveries(prev => {
      const exists = prev.find(d => d.id === newDelivery?.id);
      if (exists) return prev.map(d => d.id === newDelivery.id ? newDelivery : d);
      return newDelivery ? [...prev, newDelivery] : prev;
    });
  };

  // Filter rentals/deliveries by branch
  const filteredRentals = branch === 'All Branches'
    ? rentals
    : rentals.filter(r => r.branch === branch);

  const filteredDeliveries = branch === 'All Branches'
    ? deliveries
    : deliveries.filter(d => d.branch === branch);

  const filteredEquipment = branch === 'All Branches'
    ? equipment
    : equipment.filter(e => e.location === branch || filteredRentals.some(r => r.equipmentId === e.id));

  // Navigation helpers per view
  const goBack = () => {
    if (view === 'day') setViewDate(d => subDays(d, 1));
    else if (view === 'week') setViewDate(d => subWeeks(d, 1));
  };
  const goForward = () => {
    if (view === 'day') setViewDate(d => addDays(d, 1));
    else if (view === 'week') setViewDate(d => addWeeks(d, 1));
  };

  const dateLabel = () => {
    if (view === 'day') return format(viewDate, 'EEEE, MMMM d, yyyy');
    if (view === 'week') {
      const ws = startOfWeek(viewDate, { weekStartsOn: 0 });
      const we = addDays(ws, 6);
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(viewDate, 'MMMM yyyy');
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const activeRentals = filteredRentals.filter(r => !['cancelled','completed'].includes(r.status));
  const todayDeliveries = filteredDeliveries.filter(d => d.scheduledDate === today && !['completed','cancelled'].includes(d.status));
  const unassignedDeliveries = todayDeliveries.filter(d => !d.driverId);

  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Availability Calendar"
        subtitle={`${filteredEquipment.length} items · ${activeRentals.length} active rentals${unassignedDeliveries.length > 0 ? ` · ⚠️ ${unassignedDeliveries.length} unassigned today` : ''}`}
        icon={CalendarRange}
        action={
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-white/10 rounded-lg p-0.5">
              {VIEWS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === v.id ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}>
                  <v.icon className="w-3.5 h-3.5" />{v.label}
                </button>
              ))}
            </div>
            <select value={branch} onChange={e => setBranch(e.target.value)}
              className="h-8 border-0 rounded-lg px-2 bg-white/10 text-white text-xs">
              {BRANCHES.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
            </select>
            {view !== 'gantt' && (
              <div className="flex items-center gap-1">
                <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/10 text-white"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-white/80 font-medium min-w-40 text-center">{dateLabel()}</span>
                <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-white/10 text-white"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setViewDate(new Date())} className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">Today</button>
              </div>
            )}
            <button onClick={() => setShowTextCrew(true)} className="flex items-center gap-1.5 bg-green-500/80 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
              <MessageSquare className="w-3.5 h-3.5" /><span className="hidden sm:inline">Text Crew</span>
            </button>
            <button onClick={() => setShowPrint(true)} className="p-2 rounded-lg hover:bg-white/10 text-white"><Printer className="w-4 h-4" /></button>
            <button onClick={handleRefresh} disabled={refreshing} className="p-2 rounded-lg hover:bg-white/10 text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center gap-6 text-xs text-gray-600 flex-wrap">
        <span><strong className="text-gray-900">{activeRentals.length}</strong> active rentals</span>
        <span><strong className="text-red-600">{activeRentals.filter(r=>r.status==='out').length}</strong> out</span>
        <span><strong className="text-orange-500">{activeRentals.filter(r=>r.status==='contract').length}</strong> contracts</span>
        <span><strong className="text-blue-500">{activeRentals.filter(r=>r.status==='reservation').length}</strong> reservations</span>
        <span className="border-l border-gray-200 pl-4">
          <strong className="text-indigo-600">{todayDeliveries.length}</strong> deliveries today
          {unassignedDeliveries.length > 0 && (
            <span className="ml-1 text-amber-600 font-semibold">({unassignedDeliveries.length} unassigned)</span>
          )}
        </span>
      </div>

      <div className="px-2 py-4 sm:px-4">
        {view === 'gantt' && (
          <EquipmentAvailabilityCalendar
            equipment={filteredEquipment}
            rentals={filteredRentals}
            deliveries={filteredDeliveries}
            users={users}
            currentUser={currentUser}
            isManager={isManager}
            focusRentalId={focusRentalId}
            focusDate={focusDate}
            onDateSelect={() => {}}
            onDeliveryAssigned={handleDeliveryAssigned}
          />
        )}

        {view === 'week' && (
          <CalendarWeekView
            date={viewDate}
            rentals={filteredRentals}
            deliveries={filteredDeliveries}
            onRentalClick={(rental) => {
              setView('gantt');
            }}
          />
        )}

        {view === 'day' && (
          <CalendarDayView
            date={viewDate}
            rentals={filteredRentals}
            deliveries={filteredDeliveries}
            onRentalClick={(rental) => {
              setView('gantt');
            }}
          />
        )}

        {showPrint && (
          <CalendarPrintModal
            onClose={() => setShowPrint(false)}
            rentals={filteredRentals}
            equipment={filteredEquipment}
            deliveries={filteredDeliveries}
            currentDate={viewDate}
          />
        )}

        {showTextCrew && (
          <TextCrewModal
            date={viewDate}
            rentals={filteredRentals}
            deliveries={filteredDeliveries}
            onClose={() => setShowTextCrew(false)}
          />
        )}

        <div className="mt-4 text-xs text-gray-400 text-center">
          Gantt: click any booking bar for details · Week/Day: click to switch views · Text Crew sends today's schedule to assigned drivers
        </div>
      </div>
    </div>
  );
}