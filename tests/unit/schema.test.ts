import { describe, expect, it } from 'vitest';
import { parseTaskFile, serializeTaskFile } from '../../src/schema.ts';
import { SCHEMA_VERSION, emptyTaskFile } from '../../src/types.ts';
import { makeTask } from './factories.ts';

const NOW = 1_800_000_000_000;

const fileWith = (tasks: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ schemaVersion: SCHEMA_VERSION, revision: 3, updatedAt: NOW, tasks, ...extra });

describe('parseTaskFile', () => {
  it('treats an empty or whitespace-only file as an empty task list', () => {
    expect(parseTaskFile('', NOW).file).toEqual(emptyTaskFile(NOW));
    expect(parseTaskFile('   \n', NOW).file.tasks).toEqual([]);
  });

  it('round-trips a serialized file', () => {
    const original = { ...emptyTaskFile(NOW), tasks: [makeTask({ title: 'Write PRD' })] };
    const { file, problems } = parseTaskFile(serializeTaskFile(original), NOW);
    expect(problems).toEqual([]);
    expect(file).toEqual(original);
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseTaskFile('not json', NOW)).toThrow(/not valid JSON/);
  });

  it('rejects JSON that is not a task file', () => {
    expect(() => parseTaskFile('[1,2,3]', NOW)).toThrow(/Task Tracker structure/);
  });

  it('rejects a file from a newer schema version', () => {
    expect(() => parseTaskFile(fileWith([], { schemaVersion: 99 }), NOW)).toThrow(/newer version/);
  });

  it('fills in defaults for sparse hand-written tasks', () => {
    const { file, problems } = parseTaskFile(
      fileWith([{ id: 'a', title: 'Call the bank' }]),
      NOW,
    );
    expect(problems).toEqual([]);
    expect(file.tasks[0]).toEqual({
      id: 'a',
      title: 'Call the bank',
      notes: '',
      dueDate: null,
      urgent: false,
      important: false,
      done: false,
      completedAt: null,
      order: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('keeps good records and reports bad ones', () => {
    const { file, problems } = parseTaskFile(
      fileWith([
        { id: 'good', title: 'Keep me' },
        { title: 'No id' },
        { id: 'blank', title: '   ' },
        { id: 'baddate', title: 'Bad date', dueDate: '2026-02-30' },
        { id: 'good', title: 'Duplicate id' },
      ]),
      NOW,
    );
    expect(file.tasks.map((t) => t.id)).toEqual(['good']);
    expect(problems).toHaveLength(4);
    expect(problems[1]).toMatch(/no title/);
    expect(problems[3]).toMatch(/duplicate id/i);
  });

  it('preserves the revision so outside edits can be detected', () => {
    expect(parseTaskFile(fileWith([]), NOW).file.revision).toBe(3);
  });

  it('gives a completed task a completion time and clears a stale one', () => {
    const { file } = parseTaskFile(
      fileWith([
        { id: 'a', title: 'Done without timestamp', done: true },
        { id: 'b', title: 'Open with stale timestamp', done: false, completedAt: 123 },
      ]),
      NOW,
    );
    expect(file.tasks[0].completedAt).toBe(NOW);
    expect(file.tasks[1].completedAt).toBeNull();
  });
});

describe('serializeTaskFile', () => {
  it('writes indented JSON with a trailing newline so the file stays readable', () => {
    const text = serializeTaskFile(emptyTaskFile(NOW));
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "schemaVersion": 1');
  });
});
