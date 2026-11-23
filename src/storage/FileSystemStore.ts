import { emptyTaskFile, type TaskFile } from '../types.ts';
import { parseTaskFile, serializeTaskFile } from '../schema.ts';
import {
  DEFAULT_FILE_NAME,
  type ConnectMode,
  type LoadResult,
  type SaveResult,
  type StoreDescription,
  type StoreStatus,
  type TaskStore,
} from './TaskStore.ts';
import {
  browserPickers,
  supportsFileSystemAccess,
  type FsaFileHandle,
  type Pickers,
} from './fsa.ts';

export interface HandleStorage {
  save(handle: FsaFileHandle): Promise<void>;
  load(): Promise<FsaFileHandle | null>;
  clear(): Promise<void>;
}

interface Stamp {
  lastModified: number;
  revision: number;
}

/**
 * Reads and writes the user's JSON task file through the File System Access
 * API, remembering the chosen file so later sessions need only one click.
 */
export class FileSystemStore implements TaskStore {
  #handle: FsaFileHandle | null = null;
  readonly #handles: HandleStorage;
  readonly #pickers: Pickers;
  #status: StoreStatus;
  /** A file picked to be created, still waiting for its first document. */
  #unwritten = false;
  /** State of the file as of the last successful read or write. */
  #stamp: Stamp | null = null;

  constructor(handles: HandleStorage, pickers: Pickers = browserPickers()) {
    this.#handles = handles;
    this.#pickers = pickers;
    this.#status = this.#supported() ? 'disconnected' : 'unsupported';
  }

  #supported(): boolean {
    return supportsFileSystemAccess(this.#pickers);
  }

  status(): StoreStatus {
    return this.#status;
  }

  describe(): StoreDescription | null {
    return this.#handle ? { name: this.#handle.name } : null;
  }

  async init(): Promise<StoreStatus> {
    if (this.#status === 'unsupported') return this.#status;
    const handle = await this.#handles.load();
    if (!handle) return (this.#status = 'disconnected');
    this.#handle = handle;
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return (this.#status = permission === 'granted' ? 'ready' : 'needs-permission');
  }

  async connect(mode: ConnectMode): Promise<StoreStatus> {
    if (this.#status === 'unsupported') return this.#status;

    // A remembered file only needs its permission re-granted.
    if (mode === 'open' && this.#handle) {
      if (!(await this.#grantReadWrite(this.#handle))) return (this.#status = 'needs-permission');
      await this.#initNewFile(this.#handle);
      return (this.#status = 'ready');
    }

    const handle: FsaFileHandle | undefined =
      mode === 'create'
        ? await this.#pickers.showSaveFilePicker!({
            suggestedName: DEFAULT_FILE_NAME,
            types: [{ description: 'Task Tracker file', accept: { 'application/json': ['.json'] } }],
          })
        : (
            await this.#pickers.showOpenFilePicker!({
              multiple: false,
              types: [
                { description: 'Task Tracker file', accept: { 'application/json': ['.json'] } },
              ],
            })
          )[0];

    if (!handle) return this.#status;

    // Adopt and remember the handle before asking about permission. The
    // picker already consumed the user's gesture, so a readwrite grant may
    // have to wait for a fresh click; remembering the file first is what lets
    // the gate offer that click instead of re-opening the picker.
    this.#handle = handle;
    this.#stamp = null;
    this.#unwritten = mode === 'create';
    await this.#handles.save(handle);

    if (!(await this.#grantReadWrite(handle))) return (this.#status = 'needs-permission');
    await this.#initNewFile(handle);
    return (this.#status = 'ready');
  }

  /** A freshly created file is empty; give it a valid document immediately. */
  async #initNewFile(handle: FsaFileHandle): Promise<void> {
    if (!this.#unwritten) return;
    this.#unwritten = false;
    if ((await handle.getFile()).size === 0) await this.#write(emptyTaskFile());
  }

  /**
   * Readwrite permission on a just-picked handle. The picker usually grants it
   * outright, so ask first; only fall back to requesting, which needs a user
   * gesture the picker has already spent and so may be refused outright.
   */
  async #grantReadWrite(handle: FsaFileHandle): Promise<boolean> {
    if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    try {
      return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
    } catch {
      // No transient user activation left; the gate asks for another click.
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.#handle = null;
    this.#stamp = null;
    this.#unwritten = false;
    await this.#handles.clear();
    this.#status = this.#supported() ? 'disconnected' : 'unsupported';
  }

  async load(): Promise<LoadResult> {
    const file = await this.#file();
    const text = await file.text();
    const { file: parsed, problems } = parseTaskFile(text);
    this.#stamp = { lastModified: file.lastModified, revision: parsed.revision };
    return { file: parsed, problems };
  }

  async save(file: TaskFile): Promise<SaveResult> {
    const current = await this.#file();
    const stamp = this.#stamp;
    const changedOutside =
      stamp !== null &&
      current.lastModified !== stamp.lastModified &&
      (await this.#revisionOf(current)) !== stamp.revision;

    if (changedOutside) {
      const { file: conflict } = parseTaskFile(await current.text());
      return { ok: false, conflict };
    }
    return this.overwrite(file);
  }

  async overwrite(file: TaskFile): Promise<SaveResult> {
    return { ok: true, file: await this.#write(file) };
  }

  async #write(file: TaskFile): Promise<TaskFile> {
    const handle = this.#requireHandle();
    const next: TaskFile = { ...file, revision: file.revision + 1, updatedAt: Date.now() };
    const writable = await handle.createWritable();
    try {
      await writable.write(serializeTaskFile(next));
    } finally {
      await writable.close();
    }
    this.#stamp = { lastModified: (await handle.getFile()).lastModified, revision: next.revision };
    return next;
  }

  async #revisionOf(file: File): Promise<number> {
    try {
      return parseTaskFile(await file.text()).file.revision;
    } catch {
      // An unreadable file is treated as an outside change.
      return Number.NaN;
    }
  }

  async #file(): Promise<File> {
    return this.#requireHandle().getFile();
  }

  #requireHandle(): FsaFileHandle {
    if (!this.#handle) throw new Error('No task file is connected.');
    return this.#handle;
  }
}
