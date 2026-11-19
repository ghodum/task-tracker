import { useMemo, useState } from 'react';
import { QuadrantTabs } from './components/QuadrantTabs.tsx';
import { isTabId, type TabId } from './tabs.ts';
import { TaskList } from './components/TaskList.tsx';
import { DoneList } from './components/DoneList.tsx';
import { GateScreen } from './components/GateScreen.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { ConflictDialog } from './components/ConflictDialog.tsx';
import { TaskForm } from './components/TaskForm.tsx';
import { Confirm } from './components/Confirm.tsx';
import { completedTasks, openCounts, tasksInQuadrant } from './mutations.ts';
import { QUADRANTS } from './quadrants.ts';
import { isOverdue } from './dates.ts';
import { useTaskTracker } from './store.ts';
import type { QuadrantId, Task } from './types.ts';
import type { TaskStore } from './storage/TaskStore.ts';

const TAB_KEY = 'task-tracker:tab';

function rememberedTab(): TabId {
  try {
    const stored = localStorage.getItem(TAB_KEY);
    if (isTabId(stored)) return stored;
  } catch {
    // Storage can be blocked; the default tab is fine.
  }
  return 'q1';
}

interface Props {
  store: TaskStore;
}

export function App({ store }: Props) {
  const [state, actions] = useTaskTracker(store);
  const [tab, setTab] = useState<TabId>(rememberedTab);
  const [showSettings, setShowSettings] = useState(false);
  const [adding, setAdding] = useState<QuadrantId | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const { file } = state;
  const counts = useMemo(() => openCounts(file), [file]);
  const overdue = useMemo(() => {
    const result = { q1: 0, q2: 0, q3: 0, q4: 0 };
    for (const meta of QUADRANTS) {
      result[meta.id] = tasksInQuadrant(file, meta.id).filter((task) => isOverdue(task.dueDate))
        .length;
    }
    return result;
  }, [file]);
  const done = useMemo(() => completedTasks(file), [file]);

  const changeTab = (next: TabId) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // Not worth surfacing; the tab simply will not be remembered.
    }
  };

  if (state.status !== 'ready') {
    return (
      <GateScreen
        status={state.status}
        fileName={state.fileName}
        busy={state.busy}
        error={state.error}
        onOpen={() => void actions.connect('open')}
        onCreate={() => void actions.connect('create')}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-head">
        <h1 className="app-title">Task Tracker</h1>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => setShowSettings(true)}
          aria-label="Task file settings"
        >
          {state.fileName ?? 'Task file'}
        </button>
      </header>

      {state.error && (
        <p className="banner banner-error" role="alert">
          {state.error}
          <button type="button" className="link" onClick={actions.dismissError}>
            Dismiss
          </button>
        </p>
      )}

      {state.problems.length > 0 && (
        <div className="banner banner-warn" role="status">
          <p>Some records in the file could not be read and were left out:</p>
          <ul>
            {state.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
          <button type="button" className="link" onClick={actions.dismissProblems}>
            Dismiss
          </button>
        </div>
      )}

      <QuadrantTabs
        active={tab}
        onChange={changeTab}
        counts={counts}
        overdue={overdue}
        doneCount={done.length}
      />

      {tab === 'done' ? (
        <DoneList
          tasks={done}
          onReopen={(id) => actions.setDone(id, false)}
          onDelete={setDeleting}
        />
      ) : (
        <TaskList
          quadrant={tab}
          tasks={tasksInQuadrant(file, tab)}
          onAdd={() => setAdding(tab)}
          onToggleDone={actions.setDone}
          onSetQuadrant={actions.setQuadrant}
          onEdit={setEditing}
          onDelete={setDeleting}
          onNudge={actions.nudgeTask}
          onMove={actions.moveTask}
        />
      )}

      {adding && (
        <TaskForm
          defaultQuadrant={adding}
          onSubmit={actions.addTask}
          onClose={() => setAdding(null)}
        />
      )}

      {editing && (
        <TaskForm
          task={editing}
          defaultQuadrant={tab === 'done' ? 'q1' : tab}
          onSubmit={(input) => actions.updateTask(editing.id, input)}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <Confirm
          title="Delete task"
          message={`“${deleting.title}” will be removed from your task file. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            actions.deleteTask(deleting.id);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          fileName={state.fileName}
          taskCount={file.tasks.length}
          onReload={() => void actions.reload()}
          onChangeFile={() => {
            setShowSettings(false);
            void actions.connect('pick');
          }}
          onCreateFile={() => {
            setShowSettings(false);
            void actions.connect('create');
          }}
          onDisconnect={() => {
            setShowSettings(false);
            void actions.disconnect();
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {state.conflict && (
        <ConflictDialog
          mine={file}
          theirs={state.conflict}
          onUseFile={() => void actions.resolveWithFile()}
          onUseMine={() => void actions.resolveWithMine()}
        />
      )}
    </div>
  );
}
