import { Entry } from '../types/index.ts';

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRange(startDateStr: string, weekNumber: number): string {
  if (!startDateStr) return `Week ${weekNumber}`;
  try {
    const start = parseDate(startDateStr);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (weekNumber - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startFormatted = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endFormatted = weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return `${startFormatted} – ${endFormatted}`;
  } catch {
    return `Week ${weekNumber}`;
  }
}

export function computeCurrentWeek(startDateStr: string, durationWeeks: number): number {
  if (!startDateStr || durationWeeks <= 0) return 1;
  try {
    const start = parseDate(startDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const rawWeek = Math.floor(diffDays / 7) + 1;
    return Math.min(Math.max(1, rawWeek), durationWeeks);
  } catch {
    return 1;
  }
}

export function computeDaysRemaining(startDateStr: string, durationWeeks: number): number {
  if (!startDateStr || durationWeeks <= 0) return 0;
  try {
    const start = parseDate(startDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = durationWeeks * 7;
    return Math.max(0, totalDays - daysSinceStart);
  } catch {
    return 0;
  }
}

/**
 * Computes consecutive weeks with an entry ending at the current week.
 * If the current week is in progress and not yet submitted, counts consecutive
 * weeks ending at currentWeek - 1 so students don't lose their streak early in the week.
 */
export function computeLoggingStreak(entries: Entry[], currentWeek: number): number {
  if (!entries || entries.length === 0) return 0;

  const enteredWeeks = new Set(entries.map((e) => e.week_number));

  let startCheckWeek = currentWeek;
  // If current week not yet logged, check if previous week was logged
  if (!enteredWeeks.has(currentWeek)) {
    if (currentWeek > 1 && enteredWeeks.has(currentWeek - 1)) {
      startCheckWeek = currentWeek - 1;
    } else {
      return 0;
    }
  }

  let streak = 0;
  for (let w = startCheckWeek; w >= 1; w--) {
    if (enteredWeeks.has(w)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
