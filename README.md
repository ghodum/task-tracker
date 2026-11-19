# Task Tracker

A Covey / Eisenhower quadrant task tracker that runs as an installable app on
your Mac and keeps your tasks in a JSON file you own.

- **Four quadrant tabs** — Do, Decide, Delegate, Delete — plus Done. Every task
  is urgent-or-not and important-or-not, and lives in exactly one tab.
- **Your file, your data.** Tasks are stored in a single JSON file (by default
  `task-tracker-task.json` in your home folder). No account, no server, no
  telemetry. Point another machine at the same file — a synced folder, say — and
  you have the same list there.
- **Offline.** It is a PWA with its own Dock icon and window; the data is a
  local file, so there is nothing to be offline from.

## Install on a Mac

```bash
npm install
npm run build
npm run preview      # http://localhost:4173
```

Open that URL in **Chrome or Edge**, then install the app from the address bar
(⋮ → Cast, save and share → Install page as app). Launch it from the Dock.

On first run, click **Create new file…** and save `task-tracker-task.json` in
your home folder — or **Open task file…** to use an existing one. Your browser
asks for permission once per session; the app remembers the file itself.

Chrome and Edge only: Safari and Firefox do not support the File System Access
API, which is what lets the app read and write your own file.

## Using it

- **Add task** on any quadrant tab creates a task there. Title, notes and a due
  date are all optional except the title.
- The **⠿ button** on a card opens the 2×2 picker to move a task to another
  quadrant; **↑ / ↓** reorder within a quadrant, and cards can be dragged.
- Ticking a task moves it to **Done**, where it can be un-ticked or deleted.
- Overdue and due-today tasks are badged, and a tab shows a dot when something
  in it is overdue.
- The **file name button** in the header opens the task file settings: reload,
  change file, create a new one, or disconnect.

If the file changes underneath the app — another machine, or your text editor —
the app refuses to overwrite it and asks whether to reload or keep your version.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, [CLAUDE.md](CLAUDE.md)
for the project rules, and [ARCHITECTURE.md](ARCHITECTURE.md),
[DATA-MODEL.md](DATA-MODEL.md), [TESTING.md](TESTING.md),
[UI-CONVENTIONS.md](UI-CONVENTIONS.md) for the details.
