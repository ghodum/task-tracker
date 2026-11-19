import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTaskTracker } from '../../src/store.ts';
import { MemoryStore } from '../../src/storage/MemoryStore.ts';
import { parseTaskFile, serializeTaskFile } from '../../src/schema.ts';
import { emptyTaskFile, type TaskFile } from '../../src/types.ts';
import type { StoreStatus, TaskStore } from '../../src/storage/TaskStore.ts';
import { makeTask } from './factories.ts';

const seeded = (tasks: ReturnType<typeof makeTask>[], revision = 1): string =>
  serializeTaskFile({ ...emptyTaskFile(1_800_000_000_000), revision, tasks });

async function mount(store: TaskStore) {
  const hook = renderHook(() => useTaskTracker(store));
  await waitFor(() => expect(hook.result.current[0].busy).toBe(false));
  return hook;
}

const titles = (file: TaskFile) => file.tasks.map((task) => task.title);

/** Wait for the debounced save to reach the store. */
const savedTitles = async (store: MemoryStore, expected: string[]) =>
  waitFor(() => expect(titles(parseTaskFile(store.text).file).sort()).toEqual([...expected].sort()));

describe('useTaskTracker', () => {
  it('loads the file on mount', async () => {
    const store = new MemoryStore({ text: seeded([makeTask({ title: 'From the file' })]) });
    const { result } = await mount(store);

    expect(result.current[0].status).toBe('ready');
    expect(titles(result.current[0].file)).toEqual(['From the file']);
    expect(result.current[0].fileName).toBe('memory-tasks.json');
    expect(result.current[0].problems).toEqual([]);
  });

  it('does not load anything until a file is connected', async () => {
    const store = new MemoryStore({ status: 'disconnected' });
    const { result } = await mount(store);
    expect(result.current[0].status).toBe('disconnected');

    await act(async () => {
      await result.current[1].connect('open');
    });
    expect(result.current[0].status).toBe('ready');
  });

  it('surfaces repairs made to a hand-edited file, and can dismiss them', async () => {
    const store = new MemoryStore({
      text: JSON.stringify({ schemaVersion: 1, tasks: [{ title: 'No id' }] }),
    });
    const { result } = await mount(store);
    expect(result.current[0].problems).toHaveLength(1);

    act(() => result.current[1].dismissProblems());
    expect(result.current[0].problems).toEqual([]);
  });

  it('writes every mutation through to the file', async () => {
    const store = new MemoryStore();
    const { result } = await mount(store);

    act(() => result.current[1].addTask({ title: 'Write the PRD', quadrant: 'q2' }));
    await savedTitles(store, ['Write the PRD']);

    const id = result.current[0].file.tasks[0].id;
    act(() => result.current[1].updateTask(id, { title: 'Write the plan', quadrant: 'q2' }));
    await savedTitles(store, ['Write the plan']);

    act(() => result.current[1].setQuadrant(id, 'q1'));
    await waitFor(() =>
      expect(parseTaskFile(store.text).file.tasks[0]).toMatchObject({ urgent: true }),
    );

    act(() => result.current[1].setDueDate(id, '2026-11-20'));
    await waitFor(() =>
      expect(parseTaskFile(store.text).file.tasks[0].dueDate).toBe('2026-11-20'),
    );

    act(() => result.current[1].setDueDate(id, null));
    await waitFor(() => expect(parseTaskFile(store.text).file.tasks[0].dueDate).toBeNull());

    act(() => result.current[1].setDone(id, true));
    await waitFor(() => expect(parseTaskFile(store.text).file.tasks[0].done).toBe(true));

    act(() => result.current[1].deleteTask(id));
    await savedTitles(store, []);
  });

  it('coalesces a burst of edits into the written file', async () => {
    const store = new MemoryStore();
    const saves = vi.spyOn(store, 'save');
    const { result } = await mount(store);

    act(() => {
      result.current[1].addTask({ title: 'One', quadrant: 'q1' });
      result.current[1].addTask({ title: 'Two', quadrant: 'q1' });
      result.current[1].addTask({ title: 'Three', quadrant: 'q1' });
    });

    await savedTitles(store, ['One', 'Two', 'Three']);
    expect(saves.mock.calls.length).toBeLessThan(3);
  });

  it('reorders tasks within a quadrant', async () => {
    const store = new MemoryStore({
      text: seeded([
        makeTask({ id: 'a', title: 'A', order: 0 }),
        makeTask({ id: 'b', title: 'B', order: 1 }),
      ]),
    });
    const { result } = await mount(store);

    act(() => result.current[1].nudgeTask('a', 1));
    await waitFor(() =>
      expect(
        [...parseTaskFile(store.text).file.tasks]
          .sort((x, y) => x.order - y.order)
          .map((t) => t.title),
      ).toEqual(['B', 'A']),
    );

    act(() => result.current[1].moveTask('a', 0));
    await waitFor(() =>
      expect(
        [...parseTaskFile(store.text).file.tasks]
          .sort((x, y) => x.order - y.order)
          .map((t) => t.title),
      ).toEqual(['A', 'B']),
    );
  });

  it('reports a conflict instead of overwriting an outside edit', async () => {
    const store = new MemoryStore({ text: seeded([makeTask({ title: 'Mine' })], 1) });
    const { result } = await mount(store);

    store.setText(seeded([makeTask({ title: 'Theirs' })], 9));
    act(() => result.current[1].addTask({ title: 'My new task', quadrant: 'q1' }));

    await waitFor(() => expect(result.current[0].conflict).not.toBeNull());
    expect(titles(result.current[0].conflict!)).toEqual(['Theirs']);
    expect(titles(parseTaskFile(store.text).file)).toEqual(['Theirs']);
  });

  it('resolves a conflict by reloading the file', async () => {
    const store = new MemoryStore({ text: seeded([makeTask({ title: 'Mine' })], 1) });
    const { result } = await mount(store);
    store.setText(seeded([makeTask({ title: 'Theirs' })], 9));
    act(() => result.current[1].addTask({ title: 'Doomed', quadrant: 'q1' }));
    await waitFor(() => expect(result.current[0].conflict).not.toBeNull());

    await act(async () => {
      await result.current[1].resolveWithFile();
    });

    expect(result.current[0].conflict).toBeNull();
    expect(titles(result.current[0].file)).toEqual(['Theirs']);
  });

  it('resolves a conflict by overwriting the file', async () => {
    const store = new MemoryStore({ text: seeded([makeTask({ title: 'Mine' })], 1) });
    const { result } = await mount(store);
    store.setText(seeded([makeTask({ title: 'Theirs' })], 9));
    act(() => result.current[1].addTask({ title: 'Kept', quadrant: 'q1' }));
    await waitFor(() => expect(result.current[0].conflict).not.toBeNull());

    await act(async () => {
      await result.current[1].resolveWithMine();
    });

    expect(result.current[0].conflict).toBeNull();
    await savedTitles(store, ['Kept', 'Mine']);
  });

  it('reports a failed load and can dismiss the message', async () => {
    const store = new MemoryStore({ text: 'not json' });
    const { result } = await mount(store);

    expect(result.current[0].error).toMatch(/not valid JSON/);
    act(() => result.current[1].dismissError());
    expect(result.current[0].error).toBeNull();
  });

  it('reports a failed save', async () => {
    const store = new MemoryStore();
    vi.spyOn(store, 'save').mockRejectedValue(new Error('Disk is full'));
    const { result } = await mount(store);

    act(() => result.current[1].addTask({ title: 'Unsaveable', quadrant: 'q1' }));
    await waitFor(() => expect(result.current[0].error).toBe('Disk is full'));
  });

  it('ignores an abandoned file picker', async () => {
    const store = new MemoryStore({ status: 'disconnected' });
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    vi.spyOn(store, 'connect').mockRejectedValue(abort);
    const { result } = await mount(store);

    await act(async () => {
      await result.current[1].connect('create');
    });

    expect(result.current[0].error).toBeNull();
    expect(result.current[0].status).toBe('disconnected');
  });

  it('reports a failed connect', async () => {
    const store = new MemoryStore({ status: 'disconnected' });
    vi.spyOn(store, 'connect').mockRejectedValue(new Error('No permission'));
    const { result } = await mount(store);

    await act(async () => {
      await result.current[1].connect('open');
    });

    expect(result.current[0].error).toBe('No permission');
  });

  it('clears the tasks on disconnect', async () => {
    const store = new MemoryStore({ text: seeded([makeTask({ title: 'Mine' })]) });
    const { result } = await mount(store);

    await act(async () => {
      await result.current[1].disconnect();
    });

    expect(result.current[0].status).toBe('disconnected');
    expect(result.current[0].file.tasks).toEqual([]);
    expect(result.current[0].fileName).toBeNull();
    // Disconnecting must not empty the file itself.
    expect(titles(parseTaskFile(store.text).file)).toEqual(['Mine']);
  });

  it('starts on the gate when the browser cannot reach a file at all', async () => {
    const unsupported: TaskStore = {
      init: async () => 'unsupported' as StoreStatus,
      status: () => 'unsupported',
      connect: async () => 'unsupported',
      disconnect: async () => {},
      load: async () => {
        throw new Error('should not be called');
      },
      save: async () => {
        throw new Error('should not be called');
      },
      overwrite: async () => {
        throw new Error('should not be called');
      },
      describe: () => null,
    };
    const { result } = await mount(unsupported);
    expect(result.current[0].status).toBe('unsupported');
  });
});
