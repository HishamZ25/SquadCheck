/**
 * Date key utilities for challenge periods
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
   * Format time remaining
   */
  getTimeRemaining(dueTimeLocal: string = '23:59'): string {
    const now = new Date();
    const [hours, minutes] = dueTimeLocal.split(':').map(Number);
    
    const dueTime = new Date(now);
    dueTime.setHours(hours, minutes, 0, 0);
    
    const diffMs = dueTime.getTime() - now.getTime();
    if (diffMs <= 0) return 'Overdue';
    
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
