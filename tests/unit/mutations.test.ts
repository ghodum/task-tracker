import { describe, expect, it } from 'vitest';
import {
  addTask,
  completedTasks,
  deleteTask,
  jumpTask,
  moveTask,
  nudgeTask,
  openCounts,
  setDone,
  setDueDate,
  setQuadrant,
  tasksInQuadrant,
  updateTask,
} from '../../src/mutations.ts';
import { quadrantOf } from '../../src/quadrants.ts';
import { emptyTaskFile, type TaskFile } from '../../src/types.ts';
import { makeTask } from './factories.ts';

const NOW = 1_800_000_000_000;

const fileOf = (...tasks: ReturnType<typeof makeTask>[]): TaskFile => ({
  ...emptyTaskFile(NOW),
  tasks,
});

const titles = (file: TaskFile, quadrant: 'q1' | 'q2' | 'q3' | 'q4') =>
  tasksInQuadrant(file, quadrant).map((t) => t.title);

describe('addTask', () => {
  it('derives the flags from the chosen quadrant', () => {
    const file = addTask(emptyTaskFile(NOW), { title: 'Fix prod', quadrant: 'q1' }, NOW, 'a');
    expect(file.tasks[0]).toMatchObject({
      id: 'a',
      title: 'Fix prod',
      urgent: true,
      important: true,
      done: false,
      completedAt: null,
      createdAt: NOW,
    });
    expect(quadrantOf(file.tasks[0])).toBe('q1');
  });

  it('trims the title and notes and defaults the optional fields', () => {
    const file = addTask(emptyTaskFile(NOW), { title: '  Spaces  ', quadrant: 'q4' }, NOW, 'a');
    expect(file.tasks[0].title).toBe('Spaces');
    expect(file.tasks[0].notes).toBe('');
    expect(file.tasks[0].dueDate).toBeNull();
  });

  it('puts each new task on top of its own quadrant only', () => {
    let file = addTask(emptyTaskFile(NOW), { title: 'First', quadrant: 'q2' }, NOW, 'a');
    file = addTask(file, { title: 'Second', quadrant: 'q2' }, NOW, 'b');
    file = addTask(file, { title: 'Elsewhere', quadrant: 'q3' }, NOW, 'c');
    expect(titles(file, 'q2')).toEqual(['Second', 'First']);
    expect(titles(file, 'q3')).toEqual(['Elsewhere']);
  });
});

describe('updateTask', () => {
  it('edits fields in place without moving the task', () => {
    const file = fileOf(
      makeTask({ id: 'a', title: 'Old', order: 2, urgent: false, important: true }),
      makeTask({ id: 'b', title: 'Other', order: 1, urgent: false, important: true }),
    );
    const next = updateTask(
      file,
      'a',
      { title: 'New', notes: ' note ', dueDate: '2026-03-04', quadrant: 'q2' },
      NOW,
    );
    expect(next.tasks[0]).toMatchObject({
      title: 'New',
      notes: 'note',
      dueDate: '2026-03-04',
      order: 2,
      updatedAt: NOW,
    });
    expect(titles(next, 'q2')).toEqual(['Other', 'New']);
  });

  it('re-tops the task when the quadrant changes', () => {
    const file = fileOf(
      makeTask({ id: 'a', title: 'Mover', order: 5, urgent: false, important: true }),
      makeTask({ id: 'b', title: 'Sitting in q1', order: 0, urgent: true, important: true }),
    );
    const next = updateTask(file, 'a', { title: 'Mover', quadrant: 'q1' }, NOW);
    expect(titles(next, 'q1')).toEqual(['Mover', 'Sitting in q1']);
    expect(titles(next, 'q2')).toEqual([]);
  });

  it('ignores an unknown id', () => {
    const file = fileOf(makeTask({ id: 'a' }));
    expect(updateTask(file, 'nope', { title: 'x', quadrant: 'q1' }, NOW)).toBe(file);
  });
});

describe('setQuadrant', () => {
  it('moves the task to the top of the target quadrant', () => {
    const file = fileOf(
      makeTask({ id: 'a', title: 'Mover', urgent: false, important: false, order: 9 }),
      makeTask({ id: 'b', title: 'Resident', urgent: true, important: true, order: 0 }),
    );
    const next = setQuadrant(file, 'a', 'q1', NOW);
    expect(titles(next, 'q1')).toEqual(['Mover', 'Resident']);
    expect(titles(next, 'q4')).toEqual([]);
    expect(next.tasks[0]).toMatchObject({ urgent: true, important: true, updatedAt: NOW });
  });

  it('is a no-op for the same quadrant or an unknown id', () => {
    const file = fileOf(makeTask({ id: 'a', urgent: true, important: true }));
    expect(setQuadrant(file, 'a', 'q1', NOW)).toBe(file);
    expect(setQuadrant(file, 'nope', 'q2', NOW)).toBe(file);
  });
});

describe('setDone', () => {
  it('completes a task, removing it from its quadrant', () => {
    const file = fileOf(makeTask({ id: 'a', title: 'Finish', urgent: true, important: true }));
    const next = setDone(file, 'a', true, NOW);
    expect(titles(next, 'q1')).toEqual([]);
    expect(completedTasks(next).map((t) => t.title)).toEqual(['Finish']);
    expect(next.tasks[0].completedAt).toBe(NOW);
  });

  it('re-opens a task on top of its quadrant and clears the completion time', () => {
    const file = fileOf(
      makeTask({ id: 'a', title: 'Back', done: true, completedAt: NOW, order: 9 }),
      makeTask({ id: 'b', title: 'Resident', order: 0 }),
    );
    const next = setDone(file, 'a', false, NOW);
    expect(next.tasks[0].completedAt).toBeNull();
    expect(titles(next, 'q2')).toEqual(['Back', 'Resident']);
  });

  it('is a no-op when already in that state, or for an unknown id', () => {
    const file = fileOf(makeTask({ id: 'a', done: false }));
    expect(setDone(file, 'a', false, NOW)).toBe(file);
    expect(setDone(file, 'nope', true, NOW)).toBe(file);
  });
});

describe('completedTasks', () => {
  it('orders by completion time, newest first', () => {
    const file = fileOf(
      makeTask({ id: 'a', title: 'Older', done: true, completedAt: 1 }),
      makeTask({ id: 'b', title: 'Newer', done: true, completedAt: 2 }),
      makeTask({ id: 'c', title: 'Open' }),
    );
    expect(completedTasks(file).map((t) => t.title)).toEqual(['Newer', 'Older']);
  });
});

describe('openCounts', () => {
  it('counts only open tasks, per quadrant', () => {
    const file = fileOf(
      makeTask({ urgent: true, important: true }),
      makeTask({ urgent: true, important: true, done: true, completedAt: 1 }),
      makeTask({ urgent: false, important: false }),
    );
    expect(openCounts(file)).toEqual({ q1: 1, q2: 0, q3: 0, q4: 1 });
  });
});

describe('setDueDate', () => {
  it('sets a due date on a task that had none', () => {
    const file = fileOf(makeTask({ id: 'a' }));
    const next = setDueDate(file, 'a', '2026-11-20', NOW);
    expect(next.tasks[0]).toMatchObject({ dueDate: '2026-11-20', updatedAt: NOW });
  });

  it('changes and clears an existing due date', () => {
    const file = fileOf(makeTask({ id: 'a', dueDate: '2026-11-20' }));
    expect(setDueDate(file, 'a', '2026-12-01', NOW).tasks[0].dueDate).toBe('2026-12-01');
    expect(setDueDate(file, 'a', null, NOW).tasks[0].dueDate).toBeNull();
  });

  it('leaves everything else about the task alone', () => {
    const file = fileOf(
      makeTask({ id: 'a', title: 'Keep me', order: 7, urgent: true, important: false }),
    );
    const next = setDueDate(file, 'a', '2026-11-20', NOW);
    expect(next.tasks[0]).toMatchObject({ title: 'Keep me', order: 7, urgent: true });
    expect(quadrantOf(next.tasks[0])).toBe('q3');
  });

  it('refuses an impossible date', () => {
    const file = fileOf(makeTask({ id: 'a', dueDate: null }));
    expect(setDueDate(file, 'a', '2026-02-30', NOW)).toBe(file);
    expect(setDueDate(file, 'a', 'tomorrow', NOW)).toBe(file);
  });

  it('is a no-op for an unchanged date or an unknown id', () => {
    const file = fileOf(makeTask({ id: 'a', dueDate: '2026-11-20' }));
    expect(setDueDate(file, 'a', '2026-11-20', NOW)).toBe(file);
    expect(setDueDate(file, 'nope', '2026-11-20', NOW)).toBe(file);
  });
});

describe('deleteTask', () => {
  it('removes the task and leaves the others alone', () => {
    const file = fileOf(makeTask({ id: 'a' }), makeTask({ id: 'b' }));
    expect(deleteTask(file, 'a').tasks.map((t) => t.id)).toEqual(['b']);
    expect(deleteTask(file, 'nope').tasks).toHaveLength(2);
  });
});

describe('moveTask / nudgeTask / jumpTask', () => {
  const three = () =>
    fileOf(
      makeTask({ id: 'a', title: 'A', order: 0 }),
      makeTask({ id: 'b', title: 'B', order: 1 }),
      makeTask({ id: 'c', title: 'C', order: 2 }),
    );

  it('reorders within the quadrant by index', () => {
    expect(titles(moveTask(three(), 'c', 0, NOW), 'q2')).toEqual(['C', 'A', 'B']);
    expect(titles(moveTask(three(), 'a', 2, NOW), 'q2')).toEqual(['B', 'C', 'A']);
  });

  it('nudges one step at a time and stops at the ends', () => {
    expect(titles(nudgeTask(three(), 'a', 1, NOW), 'q2')).toEqual(['B', 'A', 'C']);
    expect(titles(nudgeTask(three(), 'c', -1, NOW), 'q2')).toEqual(['A', 'C', 'B']);
    expect(titles(nudgeTask(three(), 'a', -1, NOW), 'q2')).toEqual(['A', 'B', 'C']);
    expect(titles(nudgeTask(three(), 'c', 1, NOW), 'q2')).toEqual(['A', 'B', 'C']);
  });

  it('jumps a task to either end in one move', () => {
    expect(titles(jumpTask(three(), 'c', 'top', NOW), 'q2')).toEqual(['C', 'A', 'B']);
    expect(titles(jumpTask(three(), 'a', 'bottom', NOW), 'q2')).toEqual(['B', 'C', 'A']);
    expect(titles(jumpTask(three(), 'b', 'top', NOW), 'q2')).toEqual(['B', 'A', 'C']);
    expect(titles(jumpTask(three(), 'b', 'bottom', NOW), 'q2')).toEqual(['A', 'C', 'B']);
  });

  it('leaves the file alone when the task is already at that end', () => {
    const file = three();
    expect(jumpTask(file, 'a', 'top', NOW)).toBe(file);
    expect(jumpTask(file, 'c', 'bottom', NOW)).toBe(file);

    const only = fileOf(makeTask({ id: 'a', order: 0 }));
    expect(jumpTask(only, 'a', 'top', NOW)).toBe(only);
    expect(jumpTask(only, 'a', 'bottom', NOW)).toBe(only);
  });

  it('keeps everything but order and updatedAt', () => {
    const file = three();
    const before = file.tasks.find((t) => t.id === 'c')!;
    const moved = jumpTask(file, 'c', 'top', NOW).tasks.find((t) => t.id === 'c')!;
    expect({ ...moved, order: before.order, updatedAt: before.updatedAt }).toEqual(before);
    expect(moved.updatedAt).toBe(NOW);
  });

  it('ignores completed and unknown tasks', () => {
    const file = fileOf(makeTask({ id: 'a', done: true, completedAt: 1 }));
    expect(moveTask(file, 'a', 0, NOW)).toBe(file);
    expect(nudgeTask(file, 'a', 1, NOW)).toBe(file);
    expect(jumpTask(file, 'a', 'top', NOW)).toBe(file);
    expect(moveTask(file, 'nope', 0, NOW)).toBe(file);
    expect(nudgeTask(file, 'nope', 1, NOW)).toBe(file);
    expect(jumpTask(file, 'nope', 'bottom', NOW)).toBe(file);
  });
});
