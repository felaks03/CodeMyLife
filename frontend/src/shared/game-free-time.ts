export interface GameFreeWindow {
  day: number;
  startTime: string;
  endTime: string;
}

// Viernes desde las 17:00 hasta el final del dia, sabado y domingo todo el dia quedan libres por defecto.
export const GAME_FREE_WINDOWS: GameFreeWindow[] = [
  { day: 5, startTime: '17:00', endTime: '24:00' },
  { day: 6, startTime: '00:00', endTime: '24:00' },
  { day: 0, startTime: '00:00', endTime: '24:00' }
];

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isGameFreeTime(date: Date): boolean {
  const day = date.getDay();
  const minutes = minutesOfDay(date);
  return GAME_FREE_WINDOWS.some((window) =>
    window.day === day && minutes >= parseTime(window.startTime) && minutes < parseTime(window.endTime)
  );
}
