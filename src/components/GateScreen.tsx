import { DEFAULT_FILE_NAME, type StoreStatus } from '../storage/TaskStore.ts';

interface Props {
  status: StoreStatus;
  fileName: string | null;
  busy: boolean;
  error: string | null;
  onOpen: () => void;
  onCreate: () => void;
}

/**
 * Shown until the task file is readable. Chrome requires a user gesture to
 * re-grant access to a remembered file, so there is always something to click.
 */
export function GateScreen({ status, fileName, busy, error, onOpen, onCreate }: Props) {
  if (status === 'unsupported') {
    return (
      <main className="gate">
        <h1 className="gate-title">Task Tracker needs Chrome or Edge</h1>
        <p className="gate-body">
          Your tasks live in a JSON file on this Mac, which needs the File System Access API.
          Safari and Firefox do not support it yet. Open this app in Chrome or Edge to continue.
        </p>
      </main>
    );
  }

  const remembered = status === 'needs-permission';

  return (
    <main className="gate">
      <h1 className="gate-title">Task Tracker</h1>
      {remembered ? (
        <p className="gate-body">
          Your tasks are in <strong>{fileName ?? DEFAULT_FILE_NAME}</strong>. Your browser needs
          one click to let this app read and write it again.
        </p>
      ) : (
        <p className="gate-body">
          Your tasks live in a JSON file you own — by default <strong>{DEFAULT_FILE_NAME}</strong>{' '}
          in your home folder. Open an existing file, or create a new one to start.
        </p>
      )}

      {error && (
        <p className="gate-error" role="alert">
          {error}
        </p>
      )}

      <div className="gate-actions">
        <button type="button" className="btn btn-primary" onClick={onOpen} disabled={busy}>
          {remembered ? 'Reconnect task file' : 'Open task file…'}
        </button>
        {!remembered && (
          <button type="button" className="btn" onClick={onCreate} disabled={busy}>
            Create new file…
          </button>
        )}
      </div>
    </main>
  );
}
