import { emptyTaskFile, type TaskFile } from '../types.ts';
import { parseTaskFile, serializeTaskFile } from '../schema.ts';
import {
  type ConnectMode,
  type LoadResult,
  type SaveResult,
  type StoreDescription,
  type StoreStatus,
  type TaskStore,
} from './TaskStore.ts';

/**
 * A TaskStore backed by an in-memory string instead of a real file. Used by
 * unit tests and, via `?e2e=1`, by the Playwright UI suite so the native file
 * picker never has to appear.
 */
export class MemoryStore implements TaskStore {
  #text: string;
  #status: StoreStatus;
  #revisionAtRead: number | null = null;
  #name = 'memory-tasks.json';

  readonly #onChange: ((text: string) => void) | undefined;

  readonly #onConnect: ((mode: ConnectMode) => StoreStatus | void) | undefined;

  constructor(
    options: {
      text?: string;
      status?: StoreStatus;
      name?: string;
      onChange?: (text: string) => void;
      /** Lets a test model a pick: swap the text, or withhold permission. */
      onConnect?: (mode: ConnectMode) => StoreStatus | void;
    } = {},
  ) {
    this.#text = options.text ?? serializeTaskFile(emptyTaskFile());
    this.#status = options.status ?? 'ready';
    if (options.name !== undefined) this.#name = options.name;
    this.#onChange = options.onChange;
    this.#onConnect = options.onConnect;
  }

  /** The current file contents, as a test would read them from disk. */
  get text(): string {
    return this.#text;
  }

  /** Simulate an edit made outside the app. */
  setText(text: string): void {
    this.#text = text;
  }

  /** Simulate the user pointing the app at a different file. */
  setFile(text: string, name: string): void {
    this.#text = text;
    this.#name = name;
    this.#revisionAtRead = null;
  }

  status(): StoreStatus {
    return this.#status;
  }

  describe(): StoreDescription | null {
    return this.#status === 'ready' ? { name: this.#name } : null;
  }

  async init(): Promise<StoreStatus> {
    return this.#status;
  }

  async connect(mode: ConnectMode): Promise<StoreStatus> {
    return (this.#status = this.#onConnect?.(mode) ?? 'ready');
  }

  async disconnect(): Promise<void> {
    this.#status = 'disconnected';
  }

  async load(): Promise<LoadResult> {
    const { file, problems } = parseTaskFile(this.#text);
    this.#revisionAtRead = file.revision;
    return { file, problems };
  }

  async save(file: TaskFile): Promise<SaveResult> {
    const { file: onDisk } = parseTaskFile(this.#text);
    if (this.#revisionAtRead !== null && onDisk.revision !== this.#revisionAtRead) {
      return { ok: false, conflict: onDisk };
    }
    return this.overwrite(file);
  }

  async overwrite(file: TaskFile): Promise<SaveResult> {
    const next: TaskFile = { ...file, revision: file.revision + 1, updatedAt: Date.now() };
    this.#text = serializeTaskFile(next);
    this.#revisionAtRead = next.revision;
    this.#onChange?.(this.#text);
    return { ok: true, file: next };
  }
}
