import { TaskCard } from './TaskCard.tsx';
import { quadrantMeta } from '../quadrants.ts';
import { isOverdue } from '../dates.ts';
import type { QuadrantId, Task } from '../types.ts';

interface Props {
  quadrant: QuadrantId;
  tasks: Task[];
  onAdd: () => void;
  onToggleDone: (id: string, done: boolean) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetQuadrant: (id: string, quadrant: QuadrantId) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onNudge: (id: string, delta: -1 | 1) => void;
  onMove: (id: string, toIndex: number) => void;
}

export function TaskList({
  quadrant,
  tasks,
  onAdd,
  onToggleDone,
  onSetDueDate,
  onSetQuadrant,
  onEdit,
  onDelete,
  onNudge,
  onMove,
}: Props) {
  const meta = quadrantMeta(quadrant);
  const overdue = tasks.filter((task) => isOverdue(task.dueDate)).length;

  return (
    <section
      className="panel"
      role="tabpanel"
      id={`panel-${quadrant}`}
      aria-labelledby={`tab-${quadrant}`}
    >
      <header className="panel-head">
        <div>
          <h2 className="panel-title">{meta.label}</h2>
          <p className="panel-blurb">{meta.blurb}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          Add task
        </button>
      </header>

      {overdue > 0 && (
        <p className="panel-alert">
          {overdue} overdue {overdue === 1 ? 'task' : 'tasks'} in this quadrant.
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="empty">Nothing here. {meta.short === 'Delete' ? 'Good.' : 'Add a task to get started.'}</p>
      ) : (
        <ul className="cards">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              count={tasks.length}
              onToggleDone={(done) => onToggleDone(task.id, done)}
              onSetDueDate={(dueDate) => onSetDueDate(task.id, dueDate)}
              onSetQuadrant={(next) => onSetQuadrant(task.id, next)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
              onNudge={(delta) => onNudge(task.id, delta)}
              onDropOn={(fromId) => onMove(fromId, index)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
