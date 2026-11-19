export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

export interface Task {
  id: string;
  title: string;
  notes: string;
  /** 'YYYY-MM-DD' in the user's local calendar, or null when undated. */
  dueDate: string | null;
  urgent: boolean;
  important: boolean;
  done: boolean;
  completedAt: number | null;
  /** Ascending sort key within the task's quadrant. */
  order: number;
  createdAt: number;
  updatedAt: number;
}

export const SCHEMA_VERSION = 1;

export interface TaskFile {
  schemaVersion: typeof SCHEMA_VERSION;
  /** Bumped on every write; used to detect edits made outside this app. */
  revision: number;
  updatedAt: number;
  tasks: Task[];
}

export function emptyTaskFile(now = Date.now()): TaskFile {
  return { schemaVersion: SCHEMA_VERSION, revision: 0, updatedAt: now, tasks: [] };
}
