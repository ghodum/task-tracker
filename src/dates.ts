/** Today as 'YYYY-MM-DD' in local time. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isDueToday(dueDate: string | null, today = todayISO()): boolean {
  return dueDate !== null && dueDate === today;
}

export function isOverdue(dueDate: string | null, today = todayISO()): boolean {
  return dueDate !== null && dueDate < today;
}

export type DueStatus = 'none' | 'overdue' | 'today' | 'upcoming';

export function dueStatus(dueDate: string | null, today = todayISO()): DueStatus {
  if (dueDate === null) return 'none';
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
}

/** Short human label for a card badge: 'Overdue', 'Today', 'Tomorrow' or 'Mar 4'. */
export function formatDue(dueDate: string, today = todayISO()): string {
  const status = dueStatus(dueDate, today);
  if (status === 'overdue') return 'Overdue';
  if (status === 'today') return 'Today';
  if (dueDate === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = dueDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = String(y) === today.slice(0, 4);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return todayISO(date);
}
