import { quadrantMeta, quadrantOf } from '../quadrants.ts';
import { todayISO } from '../dates.ts';
import type { Task } from '../types.ts';

interface Props {
  tasks: Task[];
  onReopen: (id: string) => void;
  onDelete: (task: Task) => void;
}

function completedOnToday(task: Task): boolean {
  if (task.completedAt === null) return false;
  return todayISO(new Date(task.completedAt)) === todayISO();
}

export function DoneList({ tasks, onReopen, onDelete }: Props) {
  const today = tasks.filter(completedOnToday);
  const earlier = tasks.filter((task) => !completedOnToday(task));

  const group = (label: string, items: Task[]) =>
    items.length === 0 ? null : (
      <div className="done-group" key={label}>
        <h3 className="done-group-title">{label}</h3>
        <ul className="cards">
          {items.map((task) => (
            <li className="card card-done" key={task.id} data-testid="task-card" data-task-id={task.id}>
              <div className="card-main">
                <label className="card-check">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => onReopen(task.id)}
                    aria-label={`Reopen ${task.title}`}
                  />
                </label>
                <div className="card-body">
                  <p className="card-title">{task.title}</p>
                  <div className="card-meta">
                    <span className={`badge badge-quadrant ${quadrantOf(task)}`}>
                      {quadrantMeta(quadrantOf(task)).short}
                    </span>
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Delete ${task.title}`}
                    onClick={() => onDelete(task)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className="panel" role="tabpanel" id="panel-done" aria-labelledby="tab-done">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">Done</h2>
          <p className="panel-blurb">Completed tasks, newest first. Un-tick one to put it back.</p>
        </div>
      </header>
      {tasks.length === 0 ? (
        <p className="empty">Nothing completed yet.</p>
      ) : (
        <>
          {group('Today', today)}
          {group('Earlier', earlier)}
        </>
      )}
    </section>
  );
}
