import { Modal } from './Modal.tsx';
import { DEFAULT_FILE_NAME } from '../storage/TaskStore.ts';

interface Props {
  fileName: string | null;
  taskCount: number;
  onChangeFile: () => void;
  onCreateFile: () => void;
  onDisconnect: () => void;
  onReload: () => void;
  onClose: () => void;
}

export function SettingsPanel({
  fileName,
  taskCount,
  onChangeFile,
  onCreateFile,
  onDisconnect,
  onReload,
  onClose,
}: Props) {
  return (
    <Modal title="Task file" onClose={onClose}>
      <dl className="settings-facts">
        <dt>File</dt>
        <dd>{fileName ?? DEFAULT_FILE_NAME}</dd>
        <dt>Tasks</dt>
        <dd>{taskCount}</dd>
      </dl>
      <p className="modal-body">
        This file is the only copy of your tasks. Point another machine at the same file — through
        a synced folder, for instance — to see the same list there.
      </p>
      <div className="settings-actions">
        <button type="button" className="btn" onClick={onReload}>
          Reload from file
        </button>
        <button type="button" className="btn" onClick={onChangeFile}>
          Change file…
        </button>
        <button type="button" className="btn" onClick={onCreateFile}>
          Create new file…
        </button>
        <button type="button" className="btn btn-danger" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
