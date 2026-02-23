/**
 * Date/time helpers for Cloud Functions (server-side).
 *
 * All due-time calculations are based on the admin's IANA timezone stored on
 * the challenge document.  We use Intl.DateTimeFormat which is available in
 * Node 18+.
 *
 * Legacy challenges that only have a numeric timezoneOffset are handled via a
 * fallback path (offset-based UTC arithmetic).
 */

// ---------------------------------------------------------------------------
// Wall-clock helpers using Intl (mirrors client-side dueTime.ts)
// ---------------------------------------------------------------------------

export function getWallClockInZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; dayOfWeek: number } {
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
    hour: parseInt(get('hour'), 10) % 24,
    minute: parseInt(get('minute'), 10),
    dayOfWeek: dayOfWeekMap[weekdayStr] ?? 0,
  };
}

function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const wc = getWallClockInZone(date, timeZone);
  const utcWc = getWallClockInZone(date, 'UTC');
  const wcMin = ((wc.year * 12 + wc.month) * 31 + wc.day) * 1440 + wc.hour * 60 + wc.minute;
  const utcMin = ((utcWc.year * 12 + utcWc.month) * 31 + utcWc.day) * 1440 + utcWc.hour * 60 + utcWc.minute;
  return wcMin - utcMin;
}

/**
 * Convert a wall-clock date+time in an IANA timezone to an absolute UTC Date.
 */
export function wallClockToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  const startOfDayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetAtStart = getUtcOffsetMinutes(startOfDayUtc, timeZone);

  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - offsetAtStart * 60000;
  const utcGuess = new Date(utcGuessMs);

  const verify = getWallClockInZone(utcGuess, timeZone);
  if (verify.hour === hour && verify.minute === minute && verify.day === day) {
    return utcGuess;
  }

  const actualOffset = getUtcOffsetMinutes(utcGuess, timeZone);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - actualOffset * 60000);
}

// ---------------------------------------------------------------------------
// Day/week key helpers
// ---------------------------------------------------------------------------

export function getDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getAdminZoneDayKey(timeZone: string, now: Date = new Date()): string {
  const wc = getWallClockInZone(now, timeZone);
  return `${wc.year}-${String(wc.month).padStart(2, '0')}-${String(wc.day).padStart(2, '0')}`;
}

export function getAdminZoneWeekKey(timeZone: string, weekStartsOn: number = 0, now: Date = new Date()): string {
  const wc = getWallClockInZone(now, timeZone);
  let daysToSubtract = wc.dayOfWeek - weekStartsOn;
  if (daysToSubtract < 0) daysToSubtract += 7;
  const dayDate = new Date(Date.UTC(wc.year, wc.month - 1, wc.day));
  dayDate.setUTCDate(dayDate.getUTCDate() - daysToSubtract);
  return getDayKey(dayDate);
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ---------------------------------------------------------------------------
// Period key computation
// ---------------------------------------------------------------------------

export function computeDueMomentUtcForDay(timeZone: string, dayKey: string, dueTimeLocal: string): Date {
  return wallClockToUtc(dayKey, dueTimeLocal, timeZone);
}

export function computeWeeklyDueMomentUtc(
  timeZone: string,
  weekKey: string,
  dueTimeLocal: string
): Date {
  const weekStart = parseKey(weekKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const endDayKey = getDayKey(weekEnd);
  return wallClockToUtc(endDayKey, dueTimeLocal, timeZone);
}

/**
 * Get the current check-in period day key in the admin's timezone.
 * If we've passed today's due time, the period is "tomorrow".
 */
export function getCurrentPeriodDayKey(timeZone: string, dueTimeLocal: string, now: Date = new Date()): string {
  const todayKey = getAdminZoneDayKey(timeZone, now);
  const todayDue = computeDueMomentUtcForDay(timeZone, todayKey, dueTimeLocal);
  if (now.getTime() >= todayDue.getTime()) {
    const wc = getWallClockInZone(now, timeZone);
    const tomorrow = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + 1));
    return getDayKey(tomorrow);
  }
  return todayKey;
}

/**
 * Get the PREVIOUS period's key (the one that just ended).
 * This is the period we need to evaluate for missed check-ins.
 */
export function getPreviousPeriodDayKey(timeZone: string, dueTimeLocal: string, now: Date = new Date()): string {
  const currentKey = getCurrentPeriodDayKey(timeZone, dueTimeLocal, now);
  const currentDate = parseKey(currentKey);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  return getDayKey(currentDate);
}

export function getPreviousPeriodWeekKey(timeZone: string, weekStartsOn: number = 0, now: Date = new Date()): string {
  const currentWeekKey = getAdminZoneWeekKey(timeZone, weekStartsOn, now);
  const weekStart = parseKey(currentWeekKey);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  return getDayKey(weekStart);
}

/**
 * Check whether the due moment for a given period has already passed.
 */
export function hasPeriodDuePassed(
  timeZone: string,
  periodKey: string,
  dueTimeLocal: string,
  cadenceUnit: 'daily' | 'weekly',
  now: Date = new Date()
): boolean {
  let dueMoment: Date;
  if (cadenceUnit === 'weekly') {
    dueMoment = computeWeeklyDueMomentUtc(timeZone, periodKey, dueTimeLocal);
  } else {
    dueMoment = computeDueMomentUtcForDay(timeZone, periodKey, dueTimeLocal);
  }
  return now.getTime() >= dueMoment.getTime();
}

// ---------------------------------------------------------------------------
// Resolve admin timezone with fallback
// ---------------------------------------------------------------------------

export function resolveAdminTimeZone(challenge: {
  adminTimeZone?: string;
  due?: { timezone?: string; timezoneOffset?: number };
}): string {
  if (challenge.adminTimeZone) return challenge.adminTimeZone;
  if (challenge.due?.timezone) return challenge.due.timezone;
  return 'UTC';
}
