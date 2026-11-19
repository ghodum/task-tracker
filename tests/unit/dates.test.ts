import { describe, expect, it } from 'vitest';
import {
  addDays,
  dueStatus,
  formatDue,
  isDueToday,
  isOverdue,
  isValidDueDate,
  todayISO,
} from '../../src/dates.ts';

const TODAY = '2026-03-04';

describe('todayISO', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(todayISO(new Date(2026, 2, 4))).toBe('2026-03-04');
    expect(todayISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isValidDueDate', () => {
  it('accepts real calendar dates', () => {
    expect(isValidDueDate('2024-02-29')).toBe(true);
  });

  it('rejects malformed and impossible dates', () => {
    expect(isValidDueDate('2026-02-30')).toBe(false);
    expect(isValidDueDate('2026-13-01')).toBe(false);
    expect(isValidDueDate('3/4/2026')).toBe(false);
    expect(isValidDueDate('')).toBe(false);
  });
});

describe('dueStatus', () => {
  it('classifies undated, past, today and future dates', () => {
    expect(dueStatus(null, TODAY)).toBe('none');
    expect(dueStatus('2026-03-03', TODAY)).toBe('overdue');
    expect(dueStatus(TODAY, TODAY)).toBe('today');
    expect(dueStatus('2026-03-05', TODAY)).toBe('upcoming');
  });
});

describe('isOverdue / isDueToday', () => {
  it('treats an undated task as neither', () => {
    expect(isOverdue(null, TODAY)).toBe(false);
    expect(isDueToday(null, TODAY)).toBe(false);
  });

  it('flags past and current days', () => {
    expect(isOverdue('2026-03-03', TODAY)).toBe(true);
    expect(isOverdue(TODAY, TODAY)).toBe(false);
    expect(isDueToday(TODAY, TODAY)).toBe(true);
  });
});

describe('formatDue', () => {
  it('uses relative words for the near term', () => {
    expect(formatDue('2026-03-01', TODAY)).toBe('Overdue');
    expect(formatDue(TODAY, TODAY)).toBe('Today');
    expect(formatDue('2026-03-05', TODAY)).toBe('Tomorrow');
  });

  it('includes the year only for other years', () => {
    expect(formatDue('2026-04-10', TODAY)).not.toMatch(/2026/);
    expect(formatDue('2027-04-10', TODAY)).toMatch(/2027/);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});
