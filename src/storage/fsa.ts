/**
 * Minimal typings for the File System Access API. The DOM lib does not
 * describe the picker functions or handle permissions, so the app depends on
 * this narrow surface instead — which also makes the store easy to fake.
 */
export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface FsaWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface FsaFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FsaWritable>;
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

export interface FilePickerType {
  description?: string;
  accept: Record<string, string[]>;
}

export interface Pickers {
  showOpenFilePicker?(options?: {
    multiple?: boolean;
    types?: FilePickerType[];
  }): Promise<FsaFileHandle[]>;
  showSaveFilePicker?(options?: {
    suggestedName?: string;
    types?: FilePickerType[];
  }): Promise<FsaFileHandle>;
}

export function browserPickers(): Pickers {
  return globalThis as unknown as Pickers;
}

export function supportsFileSystemAccess(pickers: Pickers = browserPickers()): boolean {
  return (
    typeof pickers.showOpenFilePicker === 'function' &&
    typeof pickers.showSaveFilePicker === 'function'
  );
}
