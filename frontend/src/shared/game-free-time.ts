export interface GameFreeWindow {
  day: number;
  startTime: string;
  endTime: string;
}

export const GAME_FREE_WINDOWS: GameFreeWindow[] = [];

export function isGameFreeTime(date: Date): boolean {
  return false;
}

export function isGameBlockingDay(date: Date): boolean {
  return date.getDay() !== 0 && date.getDay() !== 6;
}
