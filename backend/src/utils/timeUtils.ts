/**
 * Time and Date calculation utilities for appointments and queue management
 */

export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const generateSlots = (
  startTime: string = '09:00',
  endTime: string = '17:00',
  duration: number = 30
): string[] => {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const slots: string[] = [];

  for (let current = startMins; current + duration <= endMins; current += duration) {
    slots.push(minutesToTime(current));
  }

  return slots;
};

export const getDayOfWeek = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
};

export const formatDateStr = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getTodayStr = (): string => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = now.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getLocalDateStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};
