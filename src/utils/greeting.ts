/** Time-aware greeting helpers for the student dashboard */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface GreetingInfo {
  message: string;
  timeOfDay: TimeOfDay;
}

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export function getGreetingInfo(date = new Date()): GreetingInfo {
  const timeOfDay = getTimeOfDay(date);

  switch (timeOfDay) {
    case 'morning':
      return { message: 'Good morning', timeOfDay };
    case 'afternoon':
      return { message: 'Good afternoon', timeOfDay };
    default:
      return { message: 'Good evening', timeOfDay };
  }
}

export function formatDashboardDateTime(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
