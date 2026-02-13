/**
 * Date key utilities for challenge periods.
 *
 * NOTE: For timezone-correct calculations using IANA timezone strings, prefer
 * the functions in ./dueTime.ts. The helpers here use the device's local time
 * or a numeric offset for backward compatibility with legacy challenge data.
 */

export const dateKeys = {
  /**
   * Get day key for a date (YYYY-MM-DD)
   */
  getDayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Get week start date for a given date
   * @param date - Date to get week start for
   * @param weekStartsOn - 0=Sunday, 1=Monday (default), etc.
   */
  getWeekKey(date: Date = new Date(), weekStartsOn: number = 1): string {
    const currentDay = date.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Calculate days to subtract to get to week start
    let daysToSubtract = currentDay - weekStartsOn;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);
    
    return this.getDayKey(weekStart);
  },

  /**
   * Parse YYYY-MM-DD to Date
   */
  parseKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  /**
   * Get last N day keys
   */
  getLastNDays(n: number): string[] {
    const keys: string[] = [];
    const today = new Date();
    
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      keys.push(this.getDayKey(date));
    }
    
    return keys;
  },

  /**
   * Get last N week keys
   */
  getLastNWeeks(n: number, weekStartsOn: number = 1): string[] {
    const keys: string[] = [];
    const today = new Date();
    
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - (i * 7));
      keys.push(this.getWeekKey(date, weekStartsOn));
    }
    
    return keys;
  },

  /**
   * Check if due time has passed for today
   */
  isDueTimePassed(dueTimeLocal: string = '23:59'): boolean {
    const now = new Date();
    const [hours, minutes] = dueTimeLocal.split(':').map(Number);
    
    const dueTime = new Date(now);
    dueTime.setHours(hours, minutes, 0, 0);
    
    return now > dueTime;
  },

  /**
   * Get the current check-in period key based on due time
   * The check-in period runs from dueTime yesterday to dueTime today
   * Example: If due at 21:00 and it's 22:00 on Saturday, the current period is Sunday
   */
  getCurrentCheckInPeriod(dueTimeLocal: string = '23:59'): string {
    const now = new Date();
    const [hours, minutes] = dueTimeLocal.split(':').map(Number);
    
    // Check if we've passed today's due time
    const todayDueTime = new Date(now);
    todayDueTime.setHours(hours, minutes, 0, 0);
    
    if (now > todayDueTime) {
      // Past due time - we're in tomorrow's check-in period
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return this.getDayKey(tomorrow);
    } else {
      // Before due time - we're in today's check-in period
      return this.getDayKey(now);
    }
  },

  /**
   * Get the day key that would be used for a submission RIGHT NOW.
   * Uses the same timezone-aware logic as CheckInService.submitChallengeCheckIn.
   * Use this when checking "already submitted" so we match the period that will actually be recorded.
   */
  getSubmissionPeriodDayKey(
    dueTimeLocal: string = '23:59',
    challengeTimezoneOffset?: number
  ): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let dayKey = `${year}-${month}-${day}`;

    if (dueTimeLocal && challengeTimezoneOffset !== undefined) {
      const userOffset = now.getTimezoneOffset();
      const [hours, minutes] = dueTimeLocal.split(':').map(Number);
      const offsetDiff = challengeTimezoneOffset - userOffset;
      const adjustedHours = (hours * 60 + minutes + offsetDiff) / 60;
      const userLocalHours = Math.floor(adjustedHours);
      const userLocalMinutes = Math.floor((adjustedHours % 1) * 60);
      const todayDueTime = new Date(now);
      todayDueTime.setHours(userLocalHours, userLocalMinutes, 0, 0);

      if (now > todayDueTime) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dayKey = this.getDayKey(tomorrow);
      }
    } else {
      dayKey = this.getCurrentCheckInPeriod(dueTimeLocal);
    }
    return dayKey;
  },

  /**
   * Get the next due Date for countdown (today or tomorrow at dueTimeLocal, or deadline date).
   * For deadline type pass deadlineDate (YYYY-MM-DD); otherwise uses dueTimeLocal.
   */
  getNextDueDate(
    dueTimeLocal: string = '23:59',
    deadlineDate?: string | null,
    type?: string
  ): Date {
    const now = new Date();
    if (type === 'deadline' && deadlineDate) {
      const [y, m, d] = deadlineDate.split('-').map(Number);
      const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
      return end;
    }
    const [hours, minutes] = dueTimeLocal.split(':').map(Number);
    let dueTime = new Date(now);
    dueTime.setHours(hours, minutes, 0, 0);
    if (now > dueTime) {
      dueTime = new Date(now);
      dueTime.setDate(dueTime.getDate() + 1);
      dueTime.setHours(hours, minutes, 0, 0);
    }
    return dueTime;
  },

  /**
   * Format time remaining until due time
   * If past due time today, calculates time until due time tomorrow
   */
  getTimeRemaining(dueTimeLocal: string = '23:59'): string {
    const now = new Date();
    const [hours, minutes] = dueTimeLocal.split(':').map(Number);
    
    // Try today's due time first
    let dueTime = new Date(now);
    dueTime.setHours(hours, minutes, 0, 0);
    
    // If we're past today's due time, use tomorrow's due time
    if (now > dueTime) {
      dueTime = new Date(now);
      dueTime.setDate(dueTime.getDate() + 1);
      dueTime.setHours(hours, minutes, 0, 0);
    }
    
    const diffMs = dueTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  },

  /**
   * Format military time to 12-hour format with AM/PM
   */
  format12Hour(timeString: string): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  },

  /**
   * Get weeks elapsed since challenge creation
   */
  getWeeksElapsed(createdAt: number, currentWeekKey: string, weekStartsOn: number = 1): number {
    const createdDate = new Date(createdAt);
    const createdWeekKey = this.getWeekKey(createdDate, weekStartsOn);
    const createdWeekStart = this.parseKey(createdWeekKey);
    const currentWeekStart = this.parseKey(currentWeekKey);
    
    const diffMs = currentWeekStart.getTime() - createdWeekStart.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    
    return Math.max(0, diffWeeks);
  },

  /**
   * Format date for display
   */
  formatDate(dateStr: string): string {
    const date = this.parseKey(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  },

  /**
   * Format week label
   */
  formatWeekLabel(weekKey: string): string {
    return `Wk of ${this.formatDate(weekKey)}`;
  },
};
