/**
 * Rental Day Calculation Utility
 *
 * Two modes (set in CompanySettings.rentalDayMode):
 *
 *  "clock_hour" (default) — 24-hour rolling from pickup time.
 *    A new billable day is logged at the same hour/minute the customer took
 *    possession.  Day count = ceil((returnDateTime - pickupDateTime) / 24h).
 *    For quoting when exact times aren't known yet we use the pickupTime
 *    string (HH:MM) and assume return at same time on endDate.
 *
 *  "calendar_day" — day boundary is midnight.
 *    Day count = calendar days spanned (endDate - startDate + 1).
 *    Classic "you get the day" model regardless of what hour you pick up.
 */

/**
 * Calculate billable days.
 *
 * @param {string} startDate  - "YYYY-MM-DD"
 * @param {string} endDate    - "YYYY-MM-DD"
 * @param {string} pickupTime - "HH:MM" (24h), used only for clock_hour mode
 * @param {string} mode       - "clock_hour" | "calendar_day"
 * @returns {number} whole billable days (min 1)
 */
export function calcBillableDays(startDate, endDate, pickupTime = '08:00', mode = 'clock_hour') {
  if (!startDate || !endDate) return 0;

  if (mode === 'calendar_day') {
    // Simple calendar-day count: Mon → Wed = 3 days
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  }

  // clock_hour: 24-hour rolling from pickup time
  const [ph, pm] = (pickupTime || '08:00').split(':').map(Number);
  const start = new Date(startDate + 'T00:00:00');
  start.setHours(ph, pm, 0, 0);

  const end = new Date(endDate + 'T00:00:00');
  end.setHours(ph, pm, 0, 0); // assume return at same time on end date

  const diffMs = end - start;
  if (diffMs <= 0) return 1;

  // Each 24-hour period = 1 day.  ceil so a partial 24h still = 1 day.
  return Math.max(1, Math.ceil(diffMs / 86400000));
}

/**
 * Human-readable label for the mode.
 */
export function rentalDayModeLabel(mode) {
  if (mode === 'calendar_day') return 'Calendar Day (midnight cutoff)';
  return '24-Hour Rolling (from pickup time)';
}