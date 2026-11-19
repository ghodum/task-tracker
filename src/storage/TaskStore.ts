import type { TaskFile } from '../types.ts';

export type StoreStatus =
  /** The browser has no File System Access API. */
  | 'unsupported'
  /** No task file chosen yet. */
  | 'disconnected'
  /** A file is remembered but the browser needs a click to re-grant access. */
  | 'needs-permission'
  | 'ready';

export type ConnectMode =
  /** Use the remembered file, re-granting permission if needed. */
  | 'open'
  /** Always show the open picker, even if a file is remembered. */
  | 'pick'
  /** Show the save picker and start a new file. */
  | 'create';

export type SaveResult =
  | { ok: true; file: TaskFile }
  /** The file changed outside the app; nothing was written. */
  | { ok: false; conflict: TaskFile };

export interface LoadResult {
  file: TaskFile;
  problems: string[];
}

export interface StoreDescription {
  name: string;
}

export interface TaskStore {
  /** Restore a remembered file, if any, without prompting. */
  init(): Promise<StoreStatus>;
  status(): StoreStatus;
  /** Prompt for a file, or re-request permission on the remembered one. */
  connect(mode: ConnectMode): Promise<StoreStatus>;
  /** Forget the current file. Never deletes it. */
  disconnect(): Promise<void>;
  load(): Promise<LoadResult>;
  /** Write the file, unless it changed underneath since the last read. */
  save(file: TaskFile): Promise<SaveResult>;
  /** Write the file unconditionally, discarding outside edits. */
  overwrite(file: TaskFile): Promise<SaveResult>;
  describe(): StoreDescription | null;
}

export const DEFAULT_FILE_NAME = 'task-tracker-task.json';
