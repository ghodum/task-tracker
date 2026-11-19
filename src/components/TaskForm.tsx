import { useId, useState } from 'react';
import { Modal } from './Modal.tsx';
import { QuadrantPicker } from './QuadrantPicker.tsx';
import { quadrantOf } from '../quadrants.ts';
import type { TaskInput } from '../mutations.ts';
import type { QuadrantId, Task } from '../types.ts';

interface Props {
  /** Absent when adding a task. */
  task?: Task;
  defaultQuadrant: QuadrantId;
  onSubmit: (input: TaskInput) => void;
  onClose: () => void;
}

/** Add/edit form. The same shape is used for both so the fields never drift. */
export function TaskForm({ task, defaultQuadrant, onSubmit, onClose }: Props) {
  const ids = useId();
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [quadrant, setQuadrant] = useState<QuadrantId>(
    task ? quadrantOf(task) : defaultQuadrant,
  );
  const [touched, setTouched] = useState(false);

  const trimmed = title.trim();
  const invalid = trimmed === '';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;
    onSubmit({ title: trimmed, notes, dueDate: dueDate === '' ? null : dueDate, quadrant });
    onClose();
  };

  return (
    <Modal title={task ? 'Edit task' : 'Add task'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field" htmlFor={`${ids}-title`}>
          <span className="field-label">Title</span>
          <input
            id={`${ids}-title`}
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
            aria-invalid={touched && invalid}
            placeholder="What needs doing?"
          />
        </label>
        {touched && invalid && (
          <p className="field-error" role="alert">
            A title is required.
          </p>
        )}

        <label className="field" htmlFor={`${ids}-notes`}>
          <span className="field-label">Notes</span>
          <textarea
            id={`${ids}-notes`}
            className="input"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional detail"
          />
        </label>

        <label className="field field-inline" htmlFor={`${ids}-due`}>
          <span className="field-label">Due date</span>
          <input
            id={`${ids}-due`}
            className="input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <QuadrantPicker value={quadrant} onChange={setQuadrant} idPrefix={ids} />

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {task ? 'Save' : 'Add task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
