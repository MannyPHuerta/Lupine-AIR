/**
 * Seasonal themes for the AIR Platform header/sidebar.
 * Each theme has a date window (month/day, inclusive), color palette,
 * and a header style key that maps to AppPageHeader + AppLayout rendering.
 */

export const SEASONAL_THEMES = [
  {
    key: 'newyears',
    label: "New Year's",
    emoji: '🎆',
    dateRanges: [{ startMD: '01-01', endMD: '01-03' }, { startMD: '12-30', endMD: '12-31' }],
    sidebarBg: '#0a0a0a',
    headerBg: '#0a0a0a',
    accentColor: '#FFD700',
    description: 'Black & gold — ring in the new year',
  },
  {
    key: 'valentines',
    label: "Valentine's Day",
    emoji: '❤️',
    dateRanges: [{ startMD: '02-10', endMD: '02-14' }],
    sidebarBg: '#1a0010',
    headerBg: '#1a0010',
    accentColor: '#E91E8C',
    description: 'Deep rose & pink glow',
  },
  {
    key: 'easter',
    label: 'Easter',
    emoji: '🐣',
    // Easter is variable — approximate with a 2-week spring window
    dateRanges: [{ startMD: '03-24', endMD: '04-06' }],
    sidebarBg: '#2d1f3d',
    headerBg: '#2d1f3d',
    accentColor: '#A8E6CF',
    description: 'Soft lavender & mint',
  },
  {
    key: 'memorialday',
    label: 'Memorial Day',
    emoji: '🇺🇸',
    dateRanges: [{ startMD: '05-24', endMD: '05-31' }],
    sidebarBg: '#0d1b3e',
    headerBg: '#0d1b3e',
    accentColor: '#C0392B',
    description: 'Navy, red & white — honoring our heroes',
  },
  {
    key: 'july4',
    label: '4th of July',
    emoji: '🎇',
    dateRanges: [{ startMD: '07-01', endMD: '07-04' }],
    sidebarBg: '#0a0a14',
    headerBg: '#0a0a14',
    accentColor: '#FF4136',
    description: 'Dark with red, white & blue',
  },
  {
    key: 'veteransday',
    label: "Veterans Day",
    emoji: '🎖️',
    dateRanges: [{ startMD: '11-09', endMD: '11-11' }],
    sidebarBg: '#1a2010',
    headerBg: '#1a2010',
    accentColor: '#C9A84C',
    description: 'Olive green & gold — thank you for your service',
  },
  {
    key: 'thanksgiving',
    label: 'Thanksgiving',
    emoji: '🦃',
    dateRanges: [{ startMD: '11-20', endMD: '11-28' }],
    sidebarBg: '#1a1000',
    headerBg: '#1a1000',
    accentColor: '#D4670A',
    description: 'Deep brown & harvest orange',
  },
  {
    key: 'christmas',
    label: 'Christmas',
    emoji: '🎄',
    dateRanges: [{ startMD: '12-20', endMD: '12-26' }],
    sidebarBg: '#0a1f0a',
    headerBg: '#0a1f0a',
    accentColor: '#C41E3A',
    description: 'Forest green & crimson',
  },
  {
    key: 'hanukkah',
    label: 'Hanukkah',
    emoji: '🕎',
    // Approximate fixed window — varies by year
    dateRanges: [{ startMD: '12-14', endMD: '12-22' }],
    sidebarBg: '#0d1020',
    headerBg: '#0d1020',
    accentColor: '#4A90D9',
    description: 'Deep navy & silver blue',
  },
];

/**
 * Given today's date, returns the matching seasonal theme or null.
 */
export function getActiveSeasonalTheme(dateObj = new Date()) {
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const today = `${month}-${day}`;

  for (const theme of SEASONAL_THEMES) {
    for (const range of theme.dateRanges) {
      // Handle ranges that don't cross year boundary
      if (range.startMD <= range.endMD) {
        if (today >= range.startMD && today <= range.endMD) return theme;
      } else {
        // Cross-year range (e.g. Dec 30 – Jan 3)
        if (today >= range.startMD || today <= range.endMD) return theme;
      }
    }
  }
  return null;
}