import { openDB, type IDBPDatabase } from 'idb';
import type { FsaFileHandle } from './fsa.ts';

const DB_NAME = 'task-tracker';
const DB_VERSION = 1;
const SETTINGS = 'settings';
const FILE_HANDLE_KEY = 'fileHandle';

/**
 * IndexedDB here stores only the file handle and app settings. Task data
 * lives in the user's JSON file and must never be cached here.
 */
function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(SETTINGS)) {
        database.createObjectStore(SETTINGS);
      }
    },
  });
}

export async function saveFileHandle(handle: FsaFileHandle): Promise<void> {
  const database = await db();
  await database.put(SETTINGS, handle, FILE_HANDLE_KEY);
  database.close();
}

export async function loadFileHandle(): Promise<FsaFileHandle | null> {
  try {
    const database = await db();
    const handle = (await database.get(SETTINGS, FILE_HANDLE_KEY)) as
      | FsaFileHandle
      | undefined;
    database.close();
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function clearFileHandle(): Promise<void> {
  try {
    const database = await db();
    await database.delete(SETTINGS, FILE_HANDLE_KEY);
    database.close();
  } catch {
    // A missing database is already the desired state.
  }
}
