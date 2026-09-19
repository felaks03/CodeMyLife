import { Commitment } from './types';

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isCommitmentEnforcedNow(commitment: Commitment, now: Date): boolean {
  if (commitment.status !== 'active') return false;
  if (now < new Date(commitment.startsAt) || now > new Date(commitment.endsAt)) return false;
  if (commitment.unlockUntil && now < new Date(commitment.unlockUntil)) return false;
  if (commitment.alwaysBlocked) return true;
  if (!commitment.days.includes(now.getDay())) return false;

  const current = minutesOfDay(now);
  return current >= parseTime(commitment.startTime) && current < parseTime(commitment.endTime);
}

export function domainsToBlock(commitments: Commitment[], now: Date): string[] {
  const active = commitments.filter((commitment) => isCommitmentEnforcedNow(commitment, now));
  return [...new Set(active.flatMap((commitment) => commitment.blockedDomains))].sort();
}

export function shouldShowLockScreen(commitments: Commitment[], now: Date): boolean {
  return commitments.some((commitment) =>
    commitment.showLockScreen === true && isCommitmentEnforcedNow(commitment, now)
  );
}

function dateAtTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function nextSleepStart(now: Date): Date | null {
  const start = new Date(now);
  const lookaheadDays = 8;

  for (let offset = 0; offset < lookaheadDays; offset++) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const dayNumber = day.getDay();
    if (dayNumber === 5 || dayNumber === 6) continue;

    const candidate = dateAtTime(day, '00:00');
    if (candidate > now) return candidate;
  }

  return null;
}

export function nextExecutableStart(commitments: Commitment[], now: Date): Date | null {
  const candidates: Date[] = [];

  for (const commitment of commitments) {
    if (commitment.status !== 'active') continue;
    if (new Date(commitment.startsAt) > now) {
      // Sigue siendo válido para analizar el primer inicio posible.
    }
    if (commitment.alwaysBlocked) continue;

    const startsAt = new Date(commitment.startsAt);
    const endsAt = new Date(commitment.endsAt);
    if (now > endsAt) continue;

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    for (let offset = 0; offset <= 7; offset++) {
      const cursor = new Date(dayStart);
      cursor.setDate(dayStart.getDate() + offset);
      if (!commitment.days.includes(cursor.getDay())) continue;

      const candidate = dateAtTime(cursor, commitment.startTime);
      if (candidate <= now) continue;
      if (candidate > endsAt) continue;
      if (candidate < startsAt) continue;
      candidates.push(candidate);
    }
  }

  return candidates.length > 0 ? new Date(Math.min(...candidates.map((candidate) => candidate.getTime()))) : null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function wasScheduledOn(commitment: Commitment, day: Date): boolean {
  if (commitment.status === 'cancelled') return false;
  if (!commitment.days.includes(day.getDay())) return false;

  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  return new Date(commitment.startsAt) <= dayEnd && new Date(commitment.endsAt) >= dayStart;
}

export interface CalendarDay {
  date: Date;
  scheduled: boolean;
}

export function buildCalendar(commitments: Commitment[], today: Date, days = 28): CalendarDay[] {
  const base = startOfDay(today);
  const calendar: CalendarDay[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(base.getTime() - offset * 24 * 60 * 60 * 1000);
    calendar.push({
      date,
      scheduled: commitments.some((commitment) => wasScheduledOn(commitment, date))
    });
  }

  return calendar;
}

// Dias programados consecutivos hasta ayer. Los dias sin compromiso no cuentan ni rompen la racha.
export function currentStreak(commitments: Commitment[], today: Date, maxDays = 365): number {
  if (commitments.length === 0) return 0;

  const base = startOfDay(today);
  const earliestStart = Math.min(...commitments.map((c) => new Date(c.startsAt).getTime()));
  let streak = 0;

  for (let offset = 1; offset <= maxDays; offset++) {
    const day = new Date(base.getTime() - offset * 24 * 60 * 60 * 1000);
    if (day.getTime() < startOfDay(new Date(earliestStart)).getTime()) break;
    if (commitments.some((commitment) => wasScheduledOn(commitment, day))) {
      streak++;
    }
  }

  return streak;
}

export function commitmentStats(commitments: Commitment[], now: Date) {
  const active = commitments.filter((commitment) => commitment.status === 'active');
  return {
    total: commitments.length,
    running: active.filter((commitment) => new Date(commitment.endsAt) >= now).length,
    completed: active.filter((commitment) => new Date(commitment.endsAt) < now).length,
    streak: currentStreak(commitments, now)
  };
}
