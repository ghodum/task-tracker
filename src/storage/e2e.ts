import { FileSystemStore, type HandleStorage } from './FileSystemStore.ts';
import { MemoryStore } from './MemoryStore.ts';
import { DEFAULT_FILE_NAME, type TaskStore } from './TaskStore.ts';
import type { FsaFileHandle, Pickers } from './fsa.ts';

/**
 * Test seams for the Playwright suite, loaded only in development builds.
 *
 * - `?e2e=1` uses a MemoryStore whose contents live in localStorage, so the UI
 *   suite can seed a file, reload the page and see the writes persist without
 *   a native picker.
 * - `?e2e=opfs` uses the real FileSystemStore against a real file handle from
 *   the origin private file system, which exercises the production read, write
 *   and conflict paths. (The native picker itself cannot be automated; it is
 *   covered by unit tests with a fake handle.)
 */
const SEED_KEY = 'task-tracker:e2e-file';
const OPFS_FILE = 'e2e-task-tracker-task.json';

export type E2eMode = '1' | 'opfs';

export function createE2eStore(mode: E2eMode): TaskStore {
  if (mode === 'opfs') return createOpfsStore();
  return createMemoryStore();
}

function createMemoryStore(): TaskStore {
  const seeded = localStorage.getItem(SEED_KEY);
  const store = new MemoryStore({
    ...(seeded === null ? {} : { text: seeded }),
    onChange: (text) => localStorage.setItem(SEED_KEY, text),
  });
  expose({ store, read: async () => store.text, write: async (text) => store.setText(text) });
  return store;
}

function createOpfsStore(): TaskStore {
  const handle = async (): Promise<FsaFileHandle> => {
    const root = await navigator.storage.getDirectory();
    return (await root.getFileHandle(OPFS_FILE, {
      create: true,
    })) as unknown as FsaFileHandle;
  };

  let remembered: FsaFileHandle | null = null;
  const handles: HandleStorage = {
    async save(next) {
      remembered = next;
    },
    async load() {
      return remembered;
    },
    async clear() {
      remembered = null;
    },
  };

  const pickers: Pickers = {
    async showOpenFilePicker() {
      return [await handle()];
    },
    async showSaveFilePicker() {
      return handle();
    },
  };

  const store = new FileSystemStore(handles, pickers);
  expose({
    store,
    name: OPFS_FILE,
    async read() {
      return (await (await handle()).getFile()).text();
    },
    async write(text) {
      const writable = await (await handle()).createWritable();
      await writable.write(text);
      await writable.close();
    },
  });
  return store;
}

/** Hooks Playwright uses to read and write the "file" the app is using. */
interface Harness {
  store: TaskStore;
  name?: string;
  read(): Promise<string>;
  write(text: string): Promise<void>;
}

function expose(harness: Harness): void {
  (window as unknown as { __taskTracker: Harness }).__taskTracker = harness;
}

export function defaultFileName(): string {
  return DEFAULT_FILE_NAME;
}
