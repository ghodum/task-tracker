import type { QuadrantId, Task, TaskFile } from './types.ts';
import { flagsFor, quadrantOf } from './quadrants.ts';
import { isValidDueDate } from './dates.ts';
import { byOrder, orderForMove, orderForTop } from './ordering.ts';

export interface TaskInput {
  title: string;
  notes?: string;
  dueDate?: string | null;
  quadrant: QuadrantId;
}

/** Open tasks in one quadrant, in display order. */
export function tasksInQuadrant(file: TaskFile, quadrant: QuadrantId): Task[] {
  return file.tasks
    .filter((task) => !task.done && quadrantOf(task) === quadrant)
    .sort(byOrder);
}

/** Completed tasks, most recently completed first. */
export function completedTasks(file: TaskFile): Task[] {
  return file.tasks
    .filter((task) => task.done)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function openCounts(file: TaskFile): Record<QuadrantId, number> {
  const counts = { q1: 0, q2: 0, q3: 0, q4: 0 };
  for (const task of file.tasks) {
    if (!task.done) counts[quadrantOf(task)] += 1;
  }
  return counts;
}

function withTasks(file: TaskFile, tasks: Task[]): TaskFile {
  return { ...file, tasks };
}

function replace(file: TaskFile, id: string, update: (task: Task) => Task): TaskFile {
  return withTasks(
    file,
    file.tasks.map((task) => (task.id === id ? update(task) : task)),
  );
}

export function addTask(
  file: TaskFile,
  input: TaskInput,
  now = Date.now(),
  id = crypto.randomUUID(),
): TaskFile {
  const task: Task = {
    id,
    title: input.title.trim(),
    notes: input.notes?.trim() ?? '',
    dueDate: input.dueDate ?? null,
    ...flagsFor(input.quadrant),
    done: false,
    completedAt: null,
    order: orderForTop(tasksInQuadrant(file, input.quadrant)),
    createdAt: now,
    updatedAt: now,
  };
  return withTasks(file, [...file.tasks, task]);
}

/** Apply edits from the task form. Changing quadrant re-tops the task. */
export function updateTask(
  file: TaskFile,
  id: string,
  input: TaskInput,
  now = Date.now(),
): TaskFile {
  const existing = file.tasks.find((task) => task.id === id);
  if (!existing) return file;
  const movedQuadrant = quadrantOf(existing) !== input.quadrant;
  return replace(file, id, (task) => ({
    ...task,
    title: input.title.trim(),
    notes: input.notes?.trim() ?? '',
    dueDate: input.dueDate ?? null,
    ...flagsFor(input.quadrant),
    order: movedQuadrant ? orderForTop(tasksInQuadrant(file, input.quadrant)) : task.order,
    updatedAt: now,
  }));
}

export function setQuadrant(
  file: TaskFile,
  id: string,
  quadrant: QuadrantId,
  now = Date.now(),
): TaskFile {
  const existing = file.tasks.find((task) => task.id === id);
  if (!existing || quadrantOf(existing) === quadrant) return file;
  const order = orderForTop(tasksInQuadrant(file, quadrant));
  return replace(file, id, (task) => ({ ...task, ...flagsFor(quadrant), order, updatedAt: now }));
}

/**
 * Toggle completion. Re-opening a task puts it back on top of its quadrant so
 * it cannot hide under months of older work.
 */
export function setDone(file: TaskFile, id: string, done: boolean, now = Date.now()): TaskFile {
  const existing = file.tasks.find((task) => task.id === id);
  if (!existing || existing.done === done) return file;
  const order = done ? existing.order : orderForTop(tasksInQuadrant(file, quadrantOf(existing)));
  return replace(file, id, (task) => ({
    ...task,
    done,
    completedAt: done ? now : null,
    order,
    updatedAt: now,
  }));
}

/** Set or clear a task's due date without touching anything else. */
export function setDueDate(
  file: TaskFile,
  id: string,
  dueDate: string | null,
  now = Date.now(),
): TaskFile {
  const existing = file.tasks.find((task) => task.id === id);
  if (!existing || existing.dueDate === dueDate) return file;
  if (dueDate !== null && !isValidDueDate(dueDate)) return file;
  return replace(file, id, (task) => ({ ...task, dueDate, updatedAt: now }));
}

export function deleteTask(file: TaskFile, id: string): TaskFile {
  return withTasks(
    file,
    file.tasks.filter((task) => task.id !== id),
  );
}

/** Move a task to `toIndex` within its own quadrant. */
export function moveTask(file: TaskFile, id: string, toIndex: number, now = Date.now()): TaskFile {
  const existing = file.tasks.find((task) => task.id === id);
  if (!existing || existing.done) return file;
  const ordered = tasksInQuadrant(file, quadrantOf(existing));
  const order = orderForMove(ordered, id, toIndex);
  if (order === null || order === existing.order) return file;
  return replace(file, id, (task) => ({ ...task, order, updatedAt: now }));
}

/** Move a task one step up or down within its quadrant (keyboard path). */
export function nudgeTask(file: TaskFile, id: string, delta: -1 | 1, now = Date.now()): TaskFile {
  const existing = file.tasks.find((task) => task.id === id);
  if (!existing || existing.done) return file;
  const ordered = tasksInQuadrant(file, quadrantOf(existing));
  const from = ordered.findIndex((task) => task.id === id);
  const to = from + delta;
  if (to < 0 || to >= ordered.length) return file;
  return moveTask(file, id, to, now);
}
