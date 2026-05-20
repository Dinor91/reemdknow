/**
 * Time bucketing helpers — week/month/year hierarchy for archive.
 *
 * Week rule:
 *   - Week ends Friday 23:59. From Saturday 00:00, a date falls into the
 *     "previous" week bucket if we're past Friday.
 *   - Week number within month: the week that contains the 1st of the month
 *     is week 1; each subsequent Saturday starts a new week.
 *   - Format: `שבוע X/Y` (e.g. `3/5` = week 3 of May).
 */

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export interface TimeBucket {
  year: number;
  monthIndex: number; // 0-11
  monthName: string;  // Hebrew
  monthNumber: number; // 1-12
  weekInMonth: number; // 1..6
  weekLabel: string;   // "שבוע X/Y"
  monthLabel: string;  // "מאי 2025"
  yearLabel: string;   // "2025"
  weekKey: string;     // sortable: "2025-05-W3"
  monthKey: string;    // "2025-05"
  yearKey: string;     // "2025"
}

/**
 * Returns the week-of-month number (1-based) for a given date, where:
 *  - The week containing the 1st of the month is week 1.
 *  - Each Saturday starts a new week.
 */
function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  const dow = date.getDay(); // 0=Sunday … 6=Saturday
  // Day-of-month of the most recent Saturday on/before `date`.
  // dow=6 (Sat) → offset 0; dow=0 (Sun) → offset 1; … dow=5 (Fri) → offset 6.
  const daysSinceSaturday = (dow + 1) % 7;
  const lastSaturdayDom = day - daysSinceSaturday;
  // Number of Saturdays that have occurred from the 1st up to (and including)
  // the most recent one. If lastSaturdayDom < 1, no Saturday yet this month.
  const saturdaysSoFar = lastSaturdayDom >= 1 ? Math.floor((lastSaturdayDom - 1) / 7) + 1 : 0;
  return saturdaysSoFar + 1;
}

export function getTimeBucket(input: Date | string): TimeBucket {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const monthNumber = monthIndex + 1;
  const monthName = HEBREW_MONTHS[monthIndex];
  const weekInMonth = getWeekOfMonth(date);

  return {
    year,
    monthIndex,
    monthNumber,
    monthName,
    weekInMonth,
    weekLabel: `שבוע ${weekInMonth}/${monthNumber}`,
    monthLabel: `${monthName} ${year}`,
    yearLabel: String(year),
    weekKey: `${year}-${String(monthNumber).padStart(2, "0")}-W${weekInMonth}`,
    monthKey: `${year}-${String(monthNumber).padStart(2, "0")}`,
    yearKey: String(year),
  };
}
