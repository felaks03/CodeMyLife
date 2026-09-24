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
