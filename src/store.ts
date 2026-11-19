import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuadrantId, TaskFile } from './types.ts';
import { emptyTaskFile } from './types.ts';
import * as mutate from './mutations.ts';
import type { TaskInput } from './mutations.ts';
import type { ConnectMode, StoreStatus, TaskStore } from './storage/TaskStore.ts';

const SAVE_DELAY_MS = 300;

export interface TaskTrackerState {
  status: StoreStatus;
  file: TaskFile;
  /** Name of the connected file, for the header and settings. */
  fileName: string | null;
  /** Repairs the loader had to make to a hand-edited file. */
  problems: string[];
  /** Set when the file changed outside the app and a write was refused. */
  conflict: TaskFile | null;
  error: string | null;
  busy: boolean;
}

export interface TaskTrackerActions {
  connect(mode: ConnectMode): Promise<void>;
  disconnect(): Promise<void>;
  reload(): Promise<void>;
  addTask(input: TaskInput): void;
  updateTask(id: string, input: TaskInput): void;
  setQuadrant(id: string, quadrant: QuadrantId): void;
  setDone(id: string, done: boolean): void;
  setDueDate(id: string, dueDate: string | null): void;
  deleteTask(id: string): void;
  moveTask(id: string, toIndex: number): void;
  nudgeTask(id: string, delta: -1 | 1): void;
  /** Conflict resolution: take the file's version, or keep ours. */
  resolveWithFile(): Promise<void>;
  resolveWithMine(): Promise<void>;
  dismissProblems(): void;
  dismissError(): void;
}

/**
 * Owns the task file in memory and keeps the user's JSON file in step with it.
 * Every mutation is applied optimistically and then written (debounced); a
 * refused write surfaces as `conflict` for the user to resolve.
 */
export function useTaskTracker(store: TaskStore): [TaskTrackerState, TaskTrackerActions] {
  const [status, setStatus] = useState<StoreStatus>(store.status());
  const [file, setFile] = useState<TaskFile>(() => emptyTaskFile());
  const [fileName, setFileName] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [conflict, setConflict] = useState<TaskFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  /** Latest state to write; read by the debounced flush. */
  const pending = useRef<TaskFile | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  const describe = useCallback(() => setFileName(store.describe()?.name ?? null), [store]);

  const loadFromStore = useCallback(async () => {
    setBusy(true);
    try {
      const result = await store.load();
      setFile(result.file);
      setProblems(result.problems);
      setConflict(null);
      setError(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }, [store]);

  const flush = useCallback(async function flushPending(): Promise<void> {
    if (saving.current) return;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    saving.current = true;
    try {
      const result = await store.save(next);
      if (result.ok) {
        // Adopt the written revision so the next save is not a false conflict.
        setFile((current) => (current === next ? result.file : { ...current, ...revision(result.file) }));
      } else {
        setConflict(result.conflict);
      }
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      saving.current = false;
      if (pending.current) await flushPending();
    }
  }, [store]);

  const schedule = useCallback(
    (next: TaskFile) => {
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  /** Apply a pure mutation, then persist the result. */
  const apply = useCallback(
    (mutation: (current: TaskFile) => TaskFile) => {
      setFile((current) => {
        const next = mutation(current);
        if (next !== current) schedule(next);
        return next;
      });
    },
    [schedule],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const initial = await store.init();
      if (cancelled) return;
      setStatus(initial);
      describe();
      if (initial === 'ready') await loadFromStore();
      else setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [store, describe, loadFromStore]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const actions = useMemo<TaskTrackerActions>(
    () => ({
      async connect(mode) {
        setBusy(true);
        try {
          const next = await store.connect(mode);
          setStatus(next);
          describe();
          if (next === 'ready') await loadFromStore();
        } catch (cause) {
          // An abandoned file picker is a normal outcome, not an error.
          if (!isAbort(cause)) setError(messageOf(cause));
        } finally {
          setBusy(false);
        }
      },
      async disconnect() {
        await store.disconnect();
        setStatus(store.status());
        setFile(emptyTaskFile());
        setProblems([]);
        setConflict(null);
        describe();
      },
      reload: loadFromStore,
      addTask: (input) => apply((current) => mutate.addTask(current, input)),
      updateTask: (id, input) => apply((current) => mutate.updateTask(current, id, input)),
      setQuadrant: (id, quadrant) => apply((current) => mutate.setQuadrant(current, id, quadrant)),
      setDone: (id, done) => apply((current) => mutate.setDone(current, id, done)),
      setDueDate: (id, dueDate) => apply((current) => mutate.setDueDate(current, id, dueDate)),
      deleteTask: (id) => apply((current) => mutate.deleteTask(current, id)),
      moveTask: (id, toIndex) => apply((current) => mutate.moveTask(current, id, toIndex)),
      nudgeTask: (id, delta) => apply((current) => mutate.nudgeTask(current, id, delta)),
      async resolveWithFile() {
        pending.current = null;
        if (timer.current) clearTimeout(timer.current);
        await loadFromStore();
      },
      async resolveWithMine() {
        const mine = conflict ? { ...file, revision: conflict.revision } : file;
        setConflict(null);
        try {
          const result = await store.overwrite(mine);
          if (result.ok) setFile(result.file);
        } catch (cause) {
          setError(messageOf(cause));
        }
      },
      dismissProblems: () => setProblems([]),
      dismissError: () => setError(null),
    }),
    [store, apply, describe, loadFromStore, conflict, file],
  );

  return [{ status, file, fileName, problems, conflict, error, busy }, actions];
}

function revision(file: TaskFile): Pick<TaskFile, 'revision' | 'updatedAt'> {
  return { revision: file.revision, updatedAt: file.updatedAt };
}

function isAbort(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'AbortError';
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong.';
}
