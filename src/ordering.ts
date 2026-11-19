import type { Task } from './types.ts';

const GAP = 1;

/** Sort key that places a new task above everything in `siblings`. */
export function orderForTop(siblings: readonly Task[]): number {
  if (siblings.length === 0) return 0;
  return Math.min(...siblings.map((t) => t.order)) - GAP;
}

/** Sort key that places a task below everything in `siblings`. */
export function orderForBottom(siblings: readonly Task[]): number {
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((t) => t.order)) + GAP;
}

export function byOrder(a: Task, b: Task): number {
  if (a.order !== b.order) return a.order - b.order;
  // Stable tie-break for hand-edited files where orders collide.
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

/**
 * Sort key that moves `id` to position `toIndex` within `ordered` (a list
 * already sorted by `byOrder`), using the midpoint of its new neighbours.
 */
export function orderForMove(
  ordered: readonly Task[],
  id: string,
  toIndex: number,
): number | null {
  const from = ordered.findIndex((t) => t.id === id);
  if (from === -1) return null;
  const without = ordered.filter((t) => t.id !== id);
  const target = Math.max(0, Math.min(toIndex, without.length));
  if (without.length === 0) return ordered[from].order;
  const before = without[target - 1];
  const after = without[target];
  if (!before) return without[0].order - GAP;
  if (!after) return without[without.length - 1].order + GAP;
  if (before.order === after.order) return before.order;
  return (before.order + after.order) / 2;
}
