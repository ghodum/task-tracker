import { z } from 'zod';
import { SCHEMA_VERSION, emptyTaskFile, type Task, type TaskFile } from './types.ts';
import { isValidDueDate } from './dates.ts';

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  notes: z.string().default(''),
  dueDate: z
    .string()
    .refine(isValidDueDate, 'dueDate must be a real YYYY-MM-DD date')
    .nullable()
    .default(null),
  urgent: z.boolean().default(false),
  important: z.boolean().default(false),
  done: z.boolean().default(false),
  completedAt: z.number().nullable().default(null),
  order: z.number().default(0),
  createdAt: z.number().default(0),
  updatedAt: z.number().default(0),
});

const fileSchema = z.object({
  schemaVersion: z.number(),
  revision: z.number().min(0).default(0),
  updatedAt: z.number().default(0),
  tasks: z.array(z.unknown()).default([]),
});

export interface ParseResult {
  file: TaskFile;
  /** One message per record or field this parse had to repair or drop. */
  problems: string[];
}

/** Hook for future schema bumps. Unknown future versions are rejected. */
function migrate(version: number): void {
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `This file was written by a newer version of Task Tracker (schema ${version}).`,
    );
  }
}

/**
 * Parse the JSON text of a task file. The file is hand-editable, so a bad
 * record is reported and skipped rather than failing the whole load.
 */
export function parseTaskFile(text: string, now = Date.now()): ParseResult {
  const trimmed = text.trim();
  if (trimmed === '') return { file: emptyTaskFile(now), problems: [] };

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    throw new Error('The task file is not valid JSON.');
  }

  const outer = fileSchema.safeParse(raw);
  if (!outer.success) throw new Error('The task file is missing its Task Tracker structure.');
  migrate(outer.data.schemaVersion);

  const problems: string[] = [];
  const tasks: Task[] = [];
  const seen = new Set<string>();

  outer.data.tasks.forEach((entry, index) => {
    const parsed = taskSchema.safeParse(entry);
    if (!parsed.success) {
      problems.push(`Task ${index + 1} was skipped: ${describeIssues(parsed.error)}`);
      return;
    }
    const task = parsed.data;
    if (task.title.trim() === '') {
      problems.push(`Task ${index + 1} was skipped: it has no title.`);
      return;
    }
    if (seen.has(task.id)) {
      problems.push(`Task ${index + 1} was skipped: duplicate id ${task.id}.`);
      return;
    }
    seen.add(task.id);
    tasks.push({
      ...task,
      createdAt: task.createdAt || now,
      updatedAt: task.updatedAt || now,
      completedAt: task.done ? (task.completedAt ?? now) : null,
    });
  });

  return {
    file: {
      schemaVersion: SCHEMA_VERSION,
      revision: outer.data.revision,
      updatedAt: outer.data.updatedAt || now,
      tasks,
    },
    problems,
  };
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'record'} ${issue.message.toLowerCase()}`)
    .join('; ');
}

/** Pretty-printed so the file stays readable and diffable by hand. */
export function serializeTaskFile(file: TaskFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}
