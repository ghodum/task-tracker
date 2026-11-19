import { Modal } from './Modal.tsx';
import type { TaskFile } from '../types.ts';

interface Props {
  mine: TaskFile;
  theirs: TaskFile;
  onUseFile: () => void;
  onUseMine: () => void;
}

/** Shown when the task file changed outside the app and a write was refused. */
export function ConflictDialog({ mine, theirs, onUseFile, onUseMine }: Props) {
  return (
    <Modal title="The task file changed" onClose={onUseFile}>
      <p className="modal-body">
        Something else edited your task file since this app read it — another machine, or a text
        editor. Nothing has been written, so pick which version to keep.
      </p>
      <dl className="settings-facts">
        <dt>In the file</dt>
        <dd>{theirs.tasks.length} tasks</dd>
        <dt>In this window</dt>
        <dd>{mine.tasks.length} tasks</dd>
      </dl>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onUseMine}>
          Overwrite with my changes
        </button>
        <button type="button" className="btn btn-primary" onClick={onUseFile}>
          Reload from file
        </button>
      </div>
    </Modal>
  );
}
