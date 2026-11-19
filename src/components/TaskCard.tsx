import { useState } from 'react';
import { QuadrantPicker } from './QuadrantPicker.tsx';
import { DueDateControl } from './DueDateControl.tsx';
import { quadrantOf } from '../quadrants.ts';
import type { QuadrantId, Task } from '../types.ts';

interface Props {
  task: Task;
  index: number;
  count: number;
  onToggleDone: (done: boolean) => void;
  onSetDueDate: (dueDate: string | null) => void;
  onSetQuadrant: (quadrant: QuadrantId) => void;
  onEdit: () => void;
  onDelete: () => void;
  onNudge: (delta: -1 | 1) => void;
  onDropOn: (fromId: string) => void;
}

export function TaskCard({
  task,
  index,
  count,
  onToggleDone,
  onSetDueDate,
  onSetQuadrant,
  onEdit,
  onDelete,
  onNudge,
  onDropOn,
}: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <li
      className={`card ${dragOver ? 'is-drag-over' : ''}`}
      data-testid="task-card"
      data-task-id={task.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const fromId = event.dataTransfer.getData('text/plain');
        if (fromId && fromId !== task.id) onDropOn(fromId);
      }}
    >
      <div className="card-main">
        <label className="card-check">
          <input
            type="checkbox"
            checked={task.done}
            onChange={(event) => onToggleDone(event.target.checked)}
            aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          />
        </label>

        <div className="card-body">
          <p className="card-title">{task.title}</p>
          <div className="card-meta">
            <DueDateControl
              taskTitle={task.title}
              dueDate={task.dueDate}
              onChange={onSetDueDate}
            />
            {task.notes && (
              <button
                type="button"
                className="link"
                aria-expanded={showNotes}
                onClick={() => setShowNotes((open) => !open)}
              >
                {showNotes ? 'Hide notes' : 'Notes'}
              </button>
            )}
          </div>
          {showNotes && task.notes && <p className="card-notes">{task.notes}</p>}
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={`Move ${task.title} up`}
            disabled={index === 0}
            onClick={() => onNudge(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Move ${task.title} down`}
            disabled={index === count - 1}
            onClick={() => onNudge(1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-expanded={showPicker}
            aria-label={`Change quadrant of ${task.title}`}
            onClick={() => setShowPicker((open) => !open)}
          >
            ⠿
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Edit ${task.title}`}
            onClick={onEdit}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Delete ${task.title}`}
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="card-picker">
          <QuadrantPicker
            value={quadrantOf(task)}
            label="Move to"
            idPrefix={task.id}
            onChange={(quadrant) => {
              setShowPicker(false);
              onSetQuadrant(quadrant);
            }}
          />
        </div>
      )}
    </li>
  );
}
