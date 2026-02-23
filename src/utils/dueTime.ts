/**
 * Timezone-correct due-time utilities.
 *
 * All challenge due times are stored as a wall-clock time string (e.g. "16:00")
 * interpreted in the admin's IANA timezone (e.g. "America/Los_Angeles").
 *
 * This module provides helpers to:
 *  - Compute the absolute UTC moment for a given day's due time
 *  - Compute the current/previous period key in the admin's timezone
 *  - Convert the due moment to the viewer's local timezone for display
 *  - Handle DST transitions correctly via Intl.DateTimeFormat
 *
 * We avoid external dependencies by using the built-in Intl API which is
 * available in all modern JS engines including Hermes (React Native).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the current wall-clock parts in a given IANA timezone.
 * Uses Intl.DateTimeFormat to resolve the correct local time including DST.
 */
export function getWallClockInZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number; dayOfWeek: number } {
  // formatToParts gives us the components in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string): string => parts.find(p => p.type === type)?.value ?? '0';

  const weekdayStr = get('weekday');
  const dayOfWeekMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10) % 24, // Intl may return 24 for midnight
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    dayOfWeek: dayOfWeekMap[weekdayStr] ?? 0,
  };
}

/**
 * Get the UTC offset in minutes for a given IANA timezone at a specific instant.
 * Positive means ahead of UTC (e.g. +60 for CET), negative for behind (e.g. -480 for PST).
 * Note: This is the OPPOSITE sign convention from Date.getTimezoneOffset().
 */
function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  // Approach: compare the wall-clock in the target zone with the UTC wall-clock.
  const wc = getWallClockInZone(date, timeZone);
  const utcWc = getWallClockInZone(date, 'UTC');

  // Build synthetic minute-of-epoch values for comparison
  const wcMinutes = ((wc.year * 12 + wc.month) * 31 + wc.day) * 1440 + wc.hour * 60 + wc.minute;
  const utcMinutes = ((utcWc.year * 12 + utcWc.month) * 31 + utcWc.day) * 1440 + utcWc.hour * 60 + utcWc.minute;

  return wcMinutes - utcMinutes;
}

/**
 * Compute the absolute UTC timestamp for a given date string (YYYY-MM-DD) and
 * wall-clock time (HH:MM) in the specified IANA timezone.
 *
 * This correctly handles DST transitions by:
 * 1. Building an initial UTC guess based on the last-known offset
 * 2. Checking what the wall-clock is at that guess in the target zone
 * 3. Adjusting if needed (spring-forward / fall-back)
 */
export function wallClockToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // First guess: use the timezone offset at the start of that day
  const startOfDayUtcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetAtStartOfDay = getUtcOffsetMinutes(startOfDayUtcGuess, timeZone);

  // Compute a UTC timestamp assuming the offset stays the same
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - offsetAtStartOfDay * 60000;
  const utcGuess = new Date(utcGuessMs);

  // Verify: what wall-clock does this correspond to in the target timezone?
  const verifyWc = getWallClockInZone(utcGuess, timeZone);
  if (verifyWc.hour === hour && verifyWc.minute === minute && verifyWc.day === day) {
    return utcGuess;
  }

  // The offset changed (DST transition). Recompute with the actual offset at the guess.
  const actualOffset = getUtcOffsetMinutes(utcGuess, timeZone);
  const correctedMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - actualOffset * 60000;
  return new Date(correctedMs);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current date's YYYY-MM-DD in the admin's timezone.
 */
export function getAdminZoneDayKey(adminTimeZone: string, now: Date = new Date()): string {
  const wc = getWallClockInZone(now, adminTimeZone);
  return `${wc.year}-${String(wc.month).padStart(2, '0')}-${String(wc.day).padStart(2, '0')}`;
}

/**
 * Get the week key (start-of-week date as YYYY-MM-DD) in the admin's timezone.
 */
export function getAdminZoneWeekKey(
  adminTimeZone: string,
  weekStartsOn: number = 0,
  now: Date = new Date()
): string {
  const wc = getWallClockInZone(now, adminTimeZone);
  let daysToSubtract = wc.dayOfWeek - weekStartsOn;
  if (daysToSubtract < 0) daysToSubtract += 7;

  // Build a Date for the wall-clock day and subtract
  const dayDate = new Date(Date.UTC(wc.year, wc.month - 1, wc.day));
  dayDate.setUTCDate(dayDate.getUTCDate() - daysToSubtract);

  const y = dayDate.getUTCFullYear();
  const m = String(dayDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dayDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute the absolute UTC moment for a given day's due time in the admin timezone.
 *
 * @param adminTimeZone - IANA timezone string (e.g., "America/Los_Angeles")
 * @param dayKey - YYYY-MM-DD date in the admin's timezone
 * @param dueTimeLocal - HH:MM wall-clock time (e.g., "16:00")
 * @returns Date representing the exact UTC moment
 */
export function computeDueMomentUtcForDay(
  adminTimeZone: string,
  dayKey: string,
  dueTimeLocal: string
): Date {
  return wallClockToUtc(dayKey, dueTimeLocal, adminTimeZone);
}

/**
 * Compute the end-of-week due moment for weekly challenges.
 * Weekly period ends on the last day of the week (day before next weekStartsOn) at dueTimeLocal.
 *
 * @param adminTimeZone - IANA timezone
 * @param weekKey - YYYY-MM-DD of the week start
 * @param dueTimeLocal - HH:MM wall-clock time
 * @param weekStartsOn - 0=Sun, 1=Mon
 * @returns Date representing the exact UTC moment of the weekly due
 */
export function computeWeeklyDueMomentUtc(
  adminTimeZone: string,
  weekKey: string,
  dueTimeLocal: string,
  weekStartsOn: number = 0
): Date {
  // The week ends on the day before the next week starts.
  // So if weekStartsOn=1 (Monday), the week ends on Sunday.
  // The due moment is Sunday at dueTimeLocal in admin timezone.
  const weekStart = new Date(Date.UTC(
    parseInt(weekKey.slice(0, 4)),
    parseInt(weekKey.slice(5, 7)) - 1,
    parseInt(weekKey.slice(8, 10))
  ));
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6); // 6 days after week start

  const endDayKey = `${weekEndDate.getUTCFullYear()}-${String(weekEndDate.getUTCMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getUTCDate()).padStart(2, '0')}`;
  return wallClockToUtc(endDayKey, dueTimeLocal, adminTimeZone);
}

/**
 * Compute the deadline moment (UTC) for a deadline challenge.
 * If deadlineDate is provided, uses dueTimeLocal on that date in adminTimeZone.
 * If no dueTimeLocal, defaults to "23:59".
 */
export function computeDeadlineMomentUtc(
  adminTimeZone: string,
  deadlineDate: string | any,
  dueTimeLocal: string = '23:59'
): Date {
  // Guard: deadlineDate may arrive as a Firestore Timestamp or Date object
  let dateStr: string;
  if (typeof deadlineDate === 'string') {
    dateStr = deadlineDate;
  } else if (deadlineDate?.toDate) {
    // Firestore Timestamp
    const d = deadlineDate.toDate() as Date;
    dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } else if (deadlineDate instanceof Date) {
    dateStr = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;
  } else {
    // Fallback: use a far-future date to avoid crashes
    dateStr = '2099-12-31';
  }
  return wallClockToUtc(dateStr, dueTimeLocal, adminTimeZone);
}

/**
 * Get the current check-in period key (daily) based on admin timezone and due time.
 * If we've passed today's due time in the admin timezone, the period is "tomorrow".
 */
export function getCurrentPeriodDayKey(
  adminTimeZone: string,
  dueTimeLocal: string = '23:59',
  now: Date = new Date()
): string {
  const todayKey = getAdminZoneDayKey(adminTimeZone, now);
  const todayDueMomentUtc = computeDueMomentUtcForDay(adminTimeZone, todayKey, dueTimeLocal);

  if (now.getTime() >= todayDueMomentUtc.getTime()) {
    // Past due — current submission period is tomorrow
    const wc = getWallClockInZone(now, adminTimeZone);
    const tomorrow = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + 1));
    return `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`;
  }
  return todayKey;
}

/**
 * Get the current check-in period key (weekly) based on admin timezone.
 */
export function getCurrentPeriodWeekKey(
  adminTimeZone: string,
  weekStartsOn: number = 0,
  now: Date = new Date()
): string {
  return getAdminZoneWeekKey(adminTimeZone, weekStartsOn, now);
}

/**
 * Compute the next due moment (UTC timestamp in millis) for a challenge.
 * Used to set `nextDueAtUtc` on the challenge document for scheduler queries.
 */
export function computeNextDueAtUtc(
  adminTimeZone: string,
  dueTimeLocal: string = '23:59',
  cadenceUnit: 'daily' | 'weekly',
  weekStartsOn: number = 0,
  now: Date = new Date()
): number {
  if (cadenceUnit === 'daily') {
    const todayKey = getAdminZoneDayKey(adminTimeZone, now);
    const todayDue = computeDueMomentUtcForDay(adminTimeZone, todayKey, dueTimeLocal);
    if (now.getTime() < todayDue.getTime()) {
      return todayDue.getTime();
    }
    // Next due is tomorrow
    const wc = getWallClockInZone(now, adminTimeZone);
    const tomorrowDate = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + 1));
    const tomorrowKey = `${tomorrowDate.getUTCFullYear()}-${String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getUTCDate()).padStart(2, '0')}`;
    return computeDueMomentUtcForDay(adminTimeZone, tomorrowKey, dueTimeLocal).getTime();
  }

  // Weekly
  const weekKey = getAdminZoneWeekKey(adminTimeZone, weekStartsOn, now);
  const weekDue = computeWeeklyDueMomentUtc(adminTimeZone, weekKey, dueTimeLocal, weekStartsOn);
  if (now.getTime() < weekDue.getTime()) {
    return weekDue.getTime();
  }
  // Next week
  const weekStart = new Date(Date.UTC(
    parseInt(weekKey.slice(0, 4)),
    parseInt(weekKey.slice(5, 7)) - 1,
    parseInt(weekKey.slice(8, 10))
  ));
  weekStart.setUTCDate(weekStart.getUTCDate() + 7);
  const nextWeekKey = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`;
  return computeWeeklyDueMomentUtc(adminTimeZone, nextWeekKey, dueTimeLocal, weekStartsOn).getTime();
}

/**
 * Convert an absolute UTC moment to a display time string in the viewer's local timezone.
 * Returns "h:mm AM/PM" format.
 */
export function formatDueMomentInViewerZone(dueMomentUtc: Date, viewerTimeZone?: string): string {
  const tz = viewerTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(dueMomentUtc);
}

/**
 * Resolve the admin timezone for a challenge, with fallbacks for legacy data.
 * Priority: challenge.adminTimeZone > challenge.due.timezone > offset-based guess > 'UTC'
 */
export function resolveAdminTimeZone(challenge: {
  adminTimeZone?: string;
  due?: { timezone?: string; timezoneOffset?: number };
}): string {
  if (challenge.adminTimeZone) return challenge.adminTimeZone;
  if (challenge.due?.timezone) return challenge.due.timezone;
  // Fallback to UTC for legacy challenges without timezone info
  return 'UTC';
}

/**
 * Check if a user can check in for the current period.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export function canUserCheckIn(
  challenge: {
    type: string;
    state?: string;
    adminTimeZone?: string;
    due?: { dueTimeLocal?: string; timezone?: string; timezoneOffset?: number; deadlineDate?: string };
    settings?: { allowLateCheckIn?: boolean; lateGraceMinutes?: number };
  },
  memberState: 'active' | 'eliminated' | undefined,
  nowUtc: Date = new Date()
): { allowed: boolean; reason?: string } {
  // Challenge ended
  if (challenge.state === 'ended') {
    return { allowed: false, reason: 'Challenge has ended.' };
  }

  // User eliminated
  if (challenge.type === 'elimination' && memberState === 'eliminated') {
    return { allowed: false, reason: 'You have been eliminated from this challenge.' };
  }

  // Deadline passed
  if (challenge.type === 'deadline' && challenge.due?.deadlineDate) {
    const adminTz = resolveAdminTimeZone(challenge);
    const dueTimeLocal = challenge.due.dueTimeLocal || '23:59';
    const deadlineMoment = computeDeadlineMomentUtc(adminTz, challenge.due.deadlineDate, dueTimeLocal);
    if (nowUtc.getTime() >= deadlineMoment.getTime()) {
      return { allowed: false, reason: 'Deadline has passed.' };
    }
  }

  return { allowed: true };
}
