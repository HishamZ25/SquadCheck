// Calendar utility functions
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const getMonthName = (month: number) => MONTH_NAMES[month];

export const getOrdinal = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export const getStartOfWeek = (date: Date): Date => {
  const startOfWeek = new Date(date);
  const day = date.getDay();
  const diff = date.getDate() - day;
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

export const getWeekDates = (weekStart: Date): Date[] => {
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    week.push(date);
  }
  return week;
};

export const formatWeekRange = (startDate: Date, endDate: Date): string => {
  const startMonth = getMonthName(startDate.getMonth());
  const endMonth = getMonthName(endDate.getMonth());
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startMonth} ${startDay}${getOrdinal(startDay)} - ${endDay}${getOrdinal(endDay)}, ${year}`;
  } else {
    return `${startMonth} ${startDay}${getOrdinal(startDay)} - ${endMonth} ${endDay}${getOrdinal(endDay)}, ${year}`;
  }
};

export const getDateString = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const generateMonthData = (year: number, month: number) => {
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
    const nextDate = new Date(year, month + 1, week.length - startDay);
    week.push(nextDate);
  }
  if (week.length > 0) {
    weeks.push(week);
  }

  return weeks;
};

export const generateAllMonths = (startYear: number, endYear: number) => {
  const months: { month: number; year: number; dates: Date[][] }[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      months.push({ 
        month, 
        year, 
        dates: generateMonthData(year, month) 
      });
    }
  }
  
  return months;
};

