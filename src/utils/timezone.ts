/**
 * Timezone utilities for challenge timing
 */

export const timezone = {
  /**
   * Get user's current timezone offset in minutes
   */
  getUserTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
  },

  /**
   * Get user's IANA timezone string (e.g., "America/New_York")
   */
  getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  /**
   * Convert a time from one timezone offset to another
   * @param time - Time string in "HH:MM" format
   * @param fromOffset - Source timezone offset in minutes from UTC
   * @param toOffset - Target timezone offset in minutes from UTC
   * @returns Converted time in "HH:MM" format
   */
  convertTime(time: string, fromOffset: number, toOffset: number): string {
    const [hours, minutes] = time.split(':').map(Number);
    
    // Calculate the difference in minutes
    const offsetDiff = fromOffset - toOffset;
    
    // Create a date with the time
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // Apply the offset difference
    date.setMinutes(date.getMinutes() + offsetDiff);
    
    // Format back to HH:MM
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMinutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${newHours}:${newMinutes}`;
  },

  /**
   * Get the due time for a challenge adjusted to the user's timezone
   * @param challengeDueTime - Original due time (e.g., "21:00")
   * @param challengeTimezoneOffset - Timezone offset when challenge was created
   * @returns Due time adjusted to user's current timezone
   */
  getUserLocalDueTime(challengeDueTime: string, challengeTimezoneOffset: number): string {
    const userOffset = this.getUserTimezoneOffset();
    return this.convertTime(challengeDueTime, challengeTimezoneOffset, userOffset);
  },

  /**
   * Get current day key in user's local timezone
   */
  getCurrentDayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Get the check-in period for a specific challenge based on timezone
   * The period runs from dueTime yesterday to dueTime today (in the challenge creator's timezone)
   * But we need to check against the user's current time
   */
  getCurrentCheckInPeriod(
    challengeDueTime: string = '23:59',
    challengeTimezoneOffset: number
  ): string {
    const now = new Date();
    const userOffset = this.getUserTimezoneOffset();
    
    // Convert challenge due time to user's timezone
    const userLocalDueTime = this.getUserLocalDueTime(challengeDueTime, challengeTimezoneOffset);
    const [hours, minutes] = userLocalDueTime.split(':').map(Number);
    
    // Check if we've passed today's due time (in user's local time)
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
   * Get day key for a date (YYYY-MM-DD)
   */
  getDayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Check if due time has passed for today (in user's local timezone)
   */
  isDueTimePassed(
    challengeDueTime: string = '23:59',
    challengeTimezoneOffset: number
  ): boolean {
    const now = new Date();
    const userLocalDueTime = this.getUserLocalDueTime(challengeDueTime, challengeTimezoneOffset);
    const [hours, minutes] = userLocalDueTime.split(':').map(Number);
    
    const dueTime = new Date(now);
    dueTime.setHours(hours, minutes, 0, 0);
    
    return now > dueTime;
  },

  /**
   * Format time remaining until due time
   */
  getTimeRemaining(
    challengeDueTime: string = '23:59',
    challengeTimezoneOffset: number
  ): string {
    const now = new Date();
    const userLocalDueTime = this.getUserLocalDueTime(challengeDueTime, challengeTimezoneOffset);
    const [hours, minutes] = userLocalDueTime.split(':').map(Number);
    
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
};
