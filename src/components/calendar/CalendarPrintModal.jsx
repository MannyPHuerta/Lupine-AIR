import { useState, useRef } from 'react';
import { X, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval, addMonths, subMonths
} from 'date-fns';

const STATUS_COLORS_PRINT = {
  out:         { bg: '#ef4444', label: 'Out' },
  contract:    { bg: '#fb923c', label: 'Contract' },
  reservation: { bg: '#60a5fa', label: 'Reserved' },
  quote:       { bg: '#9ca3af', label: 'Quote' },
  returned:    { bg: '#a78bfa', label: 'Returned' },
  completed:   { bg: '#4ade80', label: 'Completed' },
};

function dateInRange(date, startStr, endStr) {
  if (!startStr || !endStr) return false;
  const d = new Date(date); d.setHours(12);
  const s = parseISO(startStr); s.setHours(0);
  const e = parseISO(endStr); e.setHours(23, 59);
  return d >= s && d <= e;
}

// ── Mode A: Month Gantt ──────────────────────────────────────────────────────
function PrintMonthGantt({ rentals, equipment, currentDate, deliveries }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const activeRentals = rentals.filter(r => !['cancelled', 'completed'].includes(r.status));

  const bookedEquipment = equipment.filter(eq =>
    activeRentals.some(r =>
      r.equipmentId === eq.id &&
      parseISO(r.startDate) <= monthEnd &&
      parseISO(r.endDate) >= monthStart
    )
  );

  const getBooking = (eqId, date) =>
    activeRentals.find(r => r.equipmentId === eqId && dateInRange(date, r.startDate, r.endDate)) || null;

  const isStart = (eqId, date) =>
    activeRentals.some(r => r.equipmentId === eqId && format(parseISO(r.startDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));

  return (
    <div className="print-section mb-8">
      <h2 className="text-lg font-bold mb-3 text-gray-900 border-b pb-1">
        Monthly Overview — {format(currentDate, 'MMMM yyyy')}
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 9 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e5e7eb', padding: '3px 6px', textAlign: 'left', background: '#f9fafb', minWidth: 120, position: 'sticky', left: 0 }}>Equipment</th>
              {days.map(day => (
                <th key={day.toISOString()} style={{ border: '1px solid #e5e7eb', padding: '2px 1px', textAlign: 'center', background: '#f9fafb', minWidth: 18, width: 18 }}>
                  <div>{format(day, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookedEquipment.map((eq, idx) => (
              <tr key={eq.id} style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                <td style={{ border: '1px solid #e5e7eb', padding: '3px 6px', fontWeight: 500, maxWidth: 160, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {eq.name}
                </td>
                {days.map(day => {
                  const rental = getBooking(eq.id, day);
                  const start = rental && isStart(eq.id, day);
                  const color = rental ? (STATUS_COLORS_PRINT[rental.status] || STATUS_COLORS_PRINT.quote) : null;
                  return (
                    <td key={day.toISOString()} style={{ border: '1px solid #e5e7eb', padding: 0, height: 18 }}>
                      {rental && (
                        <div style={{
                          background: color.bg,
                          height: '100%',
                          borderRadius: start ? '3px 0 0 3px' : 0,
                          display: 'flex', alignItems: 'center', paddingLeft: start ? 2 : 0,
                          overflow: 'hidden',
                        }}>
                          {start && (
                            <span style={{ color: 'white', fontSize: 7, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                              {rental.customerName?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', fontSize: 9 }}>
        {Object.entries(STATUS_COLORS_PRINT).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 10, height: 10, background: v.bg, display: 'inline-block', borderRadius: 2 }} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Mode B: Day Sheet ────────────────────────────────────────────────────────
function PrintDaySheet({ rentals, equipment, deliveries, selectedDay }) {
  const activeRentals = rentals.filter(r =>
    !['cancelled'].includes(r.status) && dateInRange(selectedDay, r.startDate, r.endDate)
  );

  const enriched = activeRentals.map(r => {
    const eq = equipment.find(e => e.id === r.equipmentId);
    const delivery = deliveries.find(d => d.rentalId === r.id);
    return { ...r, eq, delivery };
  }).sort((a, b) => (a.equipmentName || '').localeCompare(b.equipmentName || ''));

  return (
    <div className="print-section mb-8">
      <h2 className="text-lg font-bold mb-1 text-gray-900 border-b pb-1">
        Day Sheet — {format(selectedDay, 'EEEE, MMMM d, yyyy')}
      </h2>
      <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
        {enriched.length} active rental{enriched.length !== 1 ? 's' : ''} on this date
      </p>
      {enriched.length === 0 ? (
        <p style={{ fontSize: 11, color: '#9ca3af' }}>No active rentals on this date.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={th}>Equipment</th>
              <th style={th}>Customer</th>
              <th style={th}>Phone</th>
              <th style={th}>Address</th>
              <th style={th}>Rental Period</th>
              <th style={th}>Delivery</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((r, i) => {
              const color = STATUS_COLORS_PRINT[r.status] || STATUS_COLORS_PRINT.quote;
              const deliveryAddr = r.worksiteAddress
                ? `${r.worksiteAddress}, ${r.worksiteCity || ''} ${r.worksiteState || ''} ${r.worksiteZip || ''}`
                : r.customerAddress
                  ? `${r.customerAddress}, ${r.customerCity || ''} ${r.customerState || ''} ${r.customerZip || ''}`
                  : '—';
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={td}><strong>{r.equipmentName}</strong><br /><span style={{ fontSize: 9, color: '#6b7280' }}>{r.invoiceNumber || ''}</span></td>
                  <td style={td}>{r.customerName}</td>
                  <td style={td}>{r.customerPhone || '—'}</td>
                  <td style={td}>{deliveryAddr}</td>
                  <td style={td}>{r.startDate} → {r.endDate}</td>
                  <td style={td}>
                    {r.deliveryMethod === 'company_delivery' ? (
                      r.delivery ? (
                        <>
                          <strong>Driver:</strong> {r.delivery.driverName}<br />
                          {r.delivery.scheduledTime && <><strong>Time:</strong> {r.delivery.scheduledTime}<br /></>}
                          {r.delivery.teamDrivers?.length > 1 && <span style={{ fontSize: 9 }}>+{r.delivery.teamDrivers.length - 1} crew</span>}
                        </>
                      ) : <span style={{ color: '#d97706', fontWeight: 600 }}>⚠ Unassigned</span>
                    ) : r.deliveryMethod === 'customer_pickup' ? 'Customer Pickup' : 'Shipped'}
                  </td>
                  <td style={td}>
                    <span style={{ background: color.bg, color: 'white', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 600 }}>
                      {color.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Mode C: Week Schedule ────────────────────────────────────────────────────
function PrintWeekSchedule({ rentals, equipment, deliveries, weekStart }) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const activeRentals = rentals.filter(r =>
    !['cancelled', 'completed'].includes(r.status) &&
    parseISO(r.startDate) <= weekEnd &&
    parseISO(r.endDate) >= weekStart
  );

  const bookedEquipment = equipment.filter(eq =>
    activeRentals.some(r => r.equipmentId === eq.id)
  );

  return (
    <div className="print-section mb-8">
      <h2 className="text-lg font-bold mb-3 text-gray-900 border-b pb-1">
        Week Schedule — {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
      </h2>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 9 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ ...th, minWidth: 130 }}>Equipment</th>
            {days.map(day => (
              <th key={day.toISOString()} style={{ ...th, minWidth: 80 }}>
                {format(day, 'EEE M/d')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookedEquipment.map((eq, idx) => {
            const eqRentals = activeRentals.filter(r => r.equipmentId === eq.id);
            return (
              <tr key={eq.id} style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                <td style={{ ...td, fontWeight: 600 }}>{eq.name}</td>
                {days.map(day => {
                  const rental = eqRentals.find(r => dateInRange(day, r.startDate, r.endDate));
                  const color = rental ? (STATUS_COLORS_PRINT[rental.status] || STATUS_COLORS_PRINT.quote) : null;
                  return (
                    <td key={day.toISOString()} style={td}>
                      {rental ? (
                        <div style={{ background: color.bg, color: 'white', borderRadius: 3, padding: '2px 4px', fontSize: 8, fontWeight: 600 }}>
                          {rental.customerName?.split(' ')[0]}<br />
                          <span style={{ fontWeight: 400, fontSize: 7 }}>{rental.invoiceNumber || ''}</span>
                        </div>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Mode D: Delivery Run Sheet ───────────────────────────────────────────────
function PrintDeliveryRunSheet({ rentals, equipment, deliveries, rangeStart, rangeEnd }) {
  const deliveryRentals = rentals.filter(r =>
    r.deliveryMethod === 'company_delivery' &&
    !['cancelled'].includes(r.status) &&
    parseISO(r.startDate) <= rangeEnd &&
    parseISO(r.endDate) >= rangeStart
  );

  // Group by driver
  const byDriver = {};
  deliveryRentals.forEach(r => {
    const delivery = deliveries.find(d => d.rentalId === r.id);
    const driverKey = delivery?.driverName || '⚠ Unassigned';
    if (!byDriver[driverKey]) byDriver[driverKey] = [];
    byDriver[driverKey].push({ ...r, delivery });
  });

  return (
    <div className="print-section mb-8">
      <h2 className="text-lg font-bold mb-1 text-gray-900 border-b pb-1">
        Delivery Run Sheet — {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
      </h2>
      <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
        {deliveryRentals.length} delivery/pickup order{deliveryRentals.length !== 1 ? 's' : ''}
      </p>
      {Object.keys(byDriver).length === 0 ? (
        <p style={{ fontSize: 11, color: '#9ca3af' }}>No deliveries scheduled in this range.</p>
      ) : Object.entries(byDriver).map(([driver, items]) => (
        <div key={driver} style={{ marginBottom: 16 }}>
          <div style={{ background: '#1e1b4b', color: 'white', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            🚛 {driver} — {items.length} stop{items.length !== 1 ? 's' : ''}
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#e0e7ff' }}>
                <th style={th}>#</th>
                <th style={th}>Equipment</th>
                <th style={th}>Customer</th>
                <th style={th}>Phone</th>
                <th style={th}>Delivery Address</th>
                <th style={th}>Date</th>
                <th style={th}>Time Window</th>
                <th style={th}>Invoice</th>
                <th style={th}>Return</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => {
                const addr = r.worksiteAddress
                  ? `${r.worksiteAddress}, ${r.worksiteCity || ''} ${r.worksiteState || ''} ${r.worksiteZip || ''}`
                  : `${r.customerAddress || ''}, ${r.customerCity || ''} ${r.customerState || ''} ${r.customerZip || ''}`;
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#eef2ff' }}>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#4338ca' }}>{i + 1}</td>
                    <td style={td}><strong>{r.equipmentName}</strong></td>
                    <td style={td}>{r.customerName}</td>
                    <td style={td}>{r.customerPhone || '—'}</td>
                    <td style={td}>{addr.trim().replace(/^,\s*/, '') || '—'}</td>
                    <td style={td}>{r.startDate}</td>
                    <td style={td}>{r.delivery?.scheduledTime || '—'}</td>
                    <td style={td}>{r.invoiceNumber || '—'}</td>
                    <td style={td}>{r.endDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

const th = { border: '1px solid #e5e7eb', padding: '3px 6px', textAlign: 'left', background: '#f3f4f6', fontWeight: 600 };
const td = { border: '1px solid #e5e7eb', padding: '3px 6px', verticalAlign: 'top' };

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function CalendarPrintModal({ onClose, rentals, equipment, deliveries, currentDate }) {
  const [mode, setMode] = useState('ab'); // 'ab' | 'c' | 'd'
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rangeStart, setRangeStart] = useState(startOfMonth(currentDate));
  const [rangeEnd, setRangeEnd] = useState(endOfMonth(currentDate));
  const [monthDate, setMonthDate] = useState(currentDate);
  const printRef = useRef(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Availability Calendar Print</title>
      <style>
        * { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e5e7eb; padding: 3px 6px; font-size: 10px; color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        h2 { font-size: 13px; margin-bottom: 6px; }
        div { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        span { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: landscape; margin: 1cm; }
        @media print { 
          body { margin: 0; } 
          * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head><body>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:2px solid #111;padding-bottom:6px;">
        <h1>Availability Calendar</h1>
        <span style="font-size:10px;color:#6b7280;">Printed ${format(new Date(), 'MM/dd/yyyy h:mm a')}</span>
      </div>
      ${content}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-bold text-gray-900">Print Calendar</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Mode selector */}
        <div className="px-5 pt-4 pb-2 flex gap-2 flex-wrap">
          {[
            { key: 'ab', label: 'Month + Day Sheet', desc: 'Default' },
            { key: 'c',  label: 'Week Schedule', desc: 'Optional' },
            { key: 'd',  label: 'Delivery Run Sheet', desc: 'Optional' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                mode === m.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {m.label}
              <span className={`ml-1.5 text-[10px] font-normal ${mode === m.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                {m.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="px-5 py-3 bg-gray-50 border-y flex flex-wrap items-center gap-4 text-sm">
          {mode === 'ab' && (
            <>
              <div className="flex items-center gap-2 font-medium text-gray-700">
                <span>Month:</span>
                <button onClick={() => setMonthDate(d => subMonths(d, 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
                <span className="w-28 text-center">{format(monthDate, 'MMMM yyyy')}</span>
                <button onClick={() => setMonthDate(d => addMonths(d, 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span>Day Sheet date:</span>
                <input
                  type="date"
                  value={format(selectedDay, 'yyyy-MM-dd')}
                  onChange={e => setSelectedDay(parseISO(e.target.value))}
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}
          {mode === 'c' && (
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span>Week of:</span>
              <button onClick={() => setWeekStart(d => subWeeks(d, 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
              <span className="w-44 text-center">{format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}</span>
              <button onClick={() => setWeekStart(d => addWeeks(d, 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
          {mode === 'd' && (
            <div className="flex items-center gap-3 text-gray-700 flex-wrap">
              <div className="flex items-center gap-2">
                <span>From:</span>
                <input type="date" value={format(rangeStart, 'yyyy-MM-dd')} onChange={e => setRangeStart(parseISO(e.target.value))}
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex items-center gap-2">
                <span>To:</span>
                <input type="date" value={format(rangeEnd, 'yyyy-MM-dd')} onChange={e => setRangeEnd(parseISO(e.target.value))}
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* Print preview area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div ref={printRef}>
            {mode === 'ab' && (
              <>
                <PrintMonthGantt rentals={rentals} equipment={equipment} currentDate={monthDate} deliveries={deliveries} />
                <PrintDaySheet rentals={rentals} equipment={equipment} deliveries={deliveries} selectedDay={selectedDay} />
              </>
            )}
            {mode === 'c' && (
              <PrintWeekSchedule rentals={rentals} equipment={equipment} deliveries={deliveries} weekStart={weekStart} />
            )}
            {mode === 'd' && (
              <PrintDeliveryRunSheet rentals={rentals} equipment={equipment} deliveries={deliveries} rangeStart={rangeStart} rangeEnd={rangeEnd} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">Cancel</button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}