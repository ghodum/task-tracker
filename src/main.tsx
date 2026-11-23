import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';
import { FileSystemStore } from './storage/FileSystemStore.ts';
import { createE2eStore, type E2eMode } from './storage/e2e.ts';
import { clearFileHandle, loadFileHandle, saveFileHandle } from './storage/handleDb.ts';
import type { TaskStore } from './storage/TaskStore.ts';

/** The real store, or a test seam when a dev build is asked for one. */
function createStore(): TaskStore {
  const mode = new URLSearchParams(location.search).get('e2e');
  if (import.meta.env.DEV && (mode === '1' || mode === 'opfs' || mode === 'opfs-prompt')) {
    return createE2eStore(mode as E2eMode);
  }
  return new FileSystemStore({
    save: saveFileHandle,
    load: loadFileHandle,
    clear: clearFileHandle,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={createStore()} />
  </StrictMode>,
);
