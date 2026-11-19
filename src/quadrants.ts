import type { QuadrantId, Task } from './types.ts';

export interface QuadrantMeta {
  id: QuadrantId;
  urgent: boolean;
  important: boolean;
  /** Full Covey label, e.g. 'Urgent & Important'. */
  label: string;
  /** The action the quadrant implies, e.g. 'Do'. */
  short: string;
  blurb: string;
}

export const QUADRANTS: readonly QuadrantMeta[] = [
  {
    id: 'q1',
    urgent: true,
    important: true,
    label: 'Urgent & Important',
    short: 'Do',
    blurb: 'Crises and deadlines. Handle these now.',
  },
  {
    id: 'q2',
    urgent: false,
    important: true,
    label: 'Not Urgent & Important',
    short: 'Decide',
    blurb: 'The work that actually moves things. Schedule it.',
  },
  {
    id: 'q3',
    urgent: true,
    important: false,
    label: 'Urgent & Not Important',
    short: 'Delegate',
    blurb: 'Interruptions and other people’s priorities. Delegate or trim.',
  },
  {
    id: 'q4',
    urgent: false,
    important: false,
    label: 'Not Urgent & Not Important',
    short: 'Delete',
    blurb: 'Busywork and distractions. Drop them.',
  },
];

export const QUADRANT_IDS: readonly QuadrantId[] = QUADRANTS.map((q) => q.id);

export function quadrantOf(task: Pick<Task, 'urgent' | 'important'>): QuadrantId {
  if (task.important) return task.urgent ? 'q1' : 'q2';
  return task.urgent ? 'q3' : 'q4';
}

export function flagsFor(id: QuadrantId): { urgent: boolean; important: boolean } {
  const meta = quadrantMeta(id);
  return { urgent: meta.urgent, important: meta.important };
}

export function quadrantMeta(id: QuadrantId): QuadrantMeta {
  const meta = QUADRANTS.find((q) => q.id === id);
  if (!meta) throw new Error(`Unknown quadrant: ${id}`);
  return meta;
}

export function isQuadrantId(value: unknown): value is QuadrantId {
  return typeof value === 'string' && QUADRANT_IDS.includes(value as QuadrantId);
}
