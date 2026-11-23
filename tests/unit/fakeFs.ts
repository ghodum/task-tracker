import type { FsaFileHandle, PermissionState, Pickers, FsaWritable } from '../../src/storage/fsa.ts';
import type { HandleStorage } from '../../src/storage/FileSystemStore.ts';

/** An in-memory stand-in for a real file handle, with controllable permission. */
export class FakeFileHandle implements FsaFileHandle {
  text: string;
  lastModified = 1_000;
  permission: PermissionState;
  /** What requestPermission() will resolve to. */
  grantOnRequest: PermissionState = 'granted';
  requests = 0;
  /**
   * Refuse the next permission request, the way Chrome does when the file
   * picker has already consumed the user's gesture.
   */
  refuseNextRequest = false;

  constructor(
    readonly name = 'task-tracker-task.json',
    options: { text?: string; permission?: PermissionState } = {},
  ) {
    this.text = options.text ?? '';
    this.permission = options.permission ?? 'granted';
  }

  getFile = async (): Promise<File> =>
    ({
      lastModified: this.lastModified,
      size: this.text.length,
      text: async () => this.text,
    }) as unknown as File;

  createWritable = async (): Promise<FsaWritable> => {
    let buffer = '';
    return {
      write: async (data: string) => {
        buffer += data;
      },
      close: async () => {
        this.text = buffer;
        this.lastModified += 1_000;
      },
    };
  };

  async queryPermission(): Promise<PermissionState> {
    return this.permission;
  }

  async requestPermission(): Promise<PermissionState> {
    this.requests += 1;
    if (this.refuseNextRequest) {
      this.refuseNextRequest = false;
      throw new DOMException('User activation is required to request permissions.', 'SecurityError');
    }
    this.permission = this.grantOnRequest;
    return this.permission;
  }

  /** Simulate an edit made in a text editor while the app is open. */
  editOutside(text: string): void {
    this.text = text;
    this.lastModified += 5_000;
  }
}

export class FakeHandleStorage implements HandleStorage {
  handle: FsaFileHandle | null = null;

  constructor(handle: FsaFileHandle | null = null) {
    this.handle = handle;
  }

  async save(handle: FsaFileHandle): Promise<void> {
    this.handle = handle;
  }

  async load(): Promise<FsaFileHandle | null> {
    return this.handle;
  }

  async clear(): Promise<void> {
    this.handle = null;
  }
}

export function fakePickers(handle: FsaFileHandle): Pickers & { opens: number; saves: number } {
  const pickers = {
    opens: 0,
    saves: 0,
    async showOpenFilePicker() {
      pickers.opens += 1;
      return [handle];
    },
    async showSaveFilePicker() {
      pickers.saves += 1;
      return handle;
    },
  };
  return pickers;
}
