/**
 * Shared calendar grid generation utilities.
 * Used by CalendarScreen and FriendProfileScreen.
 */

/**
 * Generate a month grid (array of weeks, each week is array of 7 dates).
 * Pads with dates from previous/next month to fill complete weeks.
 */
export function generateMonthGrid(currentMonth: Date): Date[][] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks: Date[][] = [];
  let week: Date[] = [];

  // Fill in days from previous month
  const startDay = firstDay.getDay();
  for (let i = 0; i < startDay; i++) {
    const prevDate = new Date(year, month, -startDay + i + 1);
    week.push(prevDate);
  }

  // Fill in days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    week.push(date);

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  // Fill in days from next month
  while (week.length > 0 && week.length < 7) {
    const nextDate = new Date(year, month + 1, week.length - startDay + lastDay.getDate() + 1);
    week.push(nextDate);
  }
  if (week.length > 0) {
    weeks.push(week);
  }

  return weeks;
}

/**
 * Map a check-in count to a heat-map color.
 */
export function getColorForCount(count: number, isDark = false): string {
  if (isDark) {
    if (count === 0) return '#1F2937';
    if (count === 1) return '#3B2518';
    if (count === 2) return '#5C3316';
    return '#FF6B35'; // 3+ completions
  }
  if (count === 0) return '#F0F0F0';
  if (count === 1) return '#FFE5DC';
  if (count === 2) return '#FFB088';
  return '#FF6B35'; // 3+ completions
}
