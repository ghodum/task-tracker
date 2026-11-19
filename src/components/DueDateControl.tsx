import { useEffect, useId, useRef, useState } from 'react';
import { dueStatus, formatDue } from '../dates.ts';

interface Props {
  taskTitle: string;
  dueDate: string | null;
  onChange: (dueDate: string | null) => void;
}

/**
 * The due-date badge doubles as the editor: clicking it opens a date field on
 * the card, so a date can be set, changed or cleared without the edit form.
 */
export function DueDateControl({ taskTitle, dueDate, onChange }: Props) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  /** Set when the editor closes by choice, so focus goes back to the badge. */
  const restoreFocus = useRef(false);
  const status = dueStatus(dueDate);

  useEffect(() => {
    if (editing) {
      input.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      // The badge is only re-rendered once editing is false.
      trigger.current?.focus();
    }
  }, [editing]);

  const close = () => {
    restoreFocus.current = true;
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        ref={trigger}
        className={dueDate ? `badge badge-${status} badge-button` : 'link'}
        data-testid={dueDate ? 'due-badge' : 'due-add'}
        aria-label={
          dueDate ? `Change due date of ${taskTitle}` : `Set a due date for ${taskTitle}`
        }
        onClick={() => setEditing(true)}
      >
        {dueDate ? formatDue(dueDate) : 'Add date'}
      </button>
    );
  }

  return (
    <span className="due-edit">
      <label className="visually-hidden" htmlFor={id}>
        Due date for {taskTitle}
      </label>
      <input
        id={id}
        ref={input}
        type="date"
        className="input input-date"
        value={dueDate ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          onChange(value === '' ? null : value);
          close();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
        onBlur={(event) => {
          // Keep the field open while the Clear button inside takes focus, and
          // do not steal focus back from wherever the user tabbed to.
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
            setEditing(false);
          }
        }}
      />
      {dueDate && (
        <button
          type="button"
          className="link"
          aria-label={`Clear due date of ${taskTitle}`}
          onClick={() => {
            onChange(null);
            close();
          }}
        >
          Clear
        </button>
      )}
    </span>
  );
}
