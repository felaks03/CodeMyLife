export interface GameFreeWindow {
  day: number;
  startTime: string;
  endTime: string;
}

export const GAME_FREE_WINDOWS: GameFreeWindow[] = [];

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isGameFreeTime(date: Date): boolean {
  return false;
}

export function isGameBlockingDay(date: Date): boolean {
  return date.getDay() !== 0 && date.getDay() !== 6;
}

export function isYoutubeFreeTime(date: Date): boolean {
  const day = date.getDay();
  const minutes = minutesOfDay(date);
  if (day === 5) return minutes >= 17 * 60;
  if (day === 6) return true;
  if (day === 0) return minutes < 17 * 60;
  return false;
}
