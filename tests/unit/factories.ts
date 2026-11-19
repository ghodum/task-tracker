import type { Task } from '../../src/types.ts';

let counter = 0;

/** A valid task with overridable fields, for tests that only care about a few. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1;
  const now = 1_700_000_000_000 + counter;
  return {
    id: `task-${counter}`,
    title: `Task ${counter}`,
    notes: '',
    dueDate: null,
    urgent: false,
    important: true,
    done: false,
    completedAt: null,
    order: counter,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
