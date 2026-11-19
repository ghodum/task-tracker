# Task Tracker

A personal task tracker that enforces the Covey / Eisenhower quadrant method,
running as an installable PWA on macOS. Tasks live in a **single JSON file the
user owns** (by default `task-tracker-task.json` in their home folder), so the
app can be installed on another machine, pointed at the same file, and show the
same tasks.

## Hard rules

1. **The JSON file is the only store of task data.** IndexedDB holds the file
   handle and app settings — never a copy of the tasks. Do not add a task
   cache; if the file cannot be read, the app shows the gate screen instead.
2. **Quadrants are derived, never stored.** A task carries `urgent` and
   `important`; the quadrant comes from `quadrantOf()` in `src/quadrants.ts`.
   That file is the only place the four combinations may be spelled out.
3. **Mutations are pure functions.** All task changes live in
   `src/mutations.ts` as `(TaskFile, …) => TaskFile`. Components never edit
   tasks inline; `src/store.ts` applies a mutation and persists the result.
4. **Everything above persistence talks to the `TaskStore` interface**
   (`src/storage/TaskStore.ts`). Nothing else may touch the File System Access
   API.
5. **Every change ships with tests.** Logic gets a Vitest test; anything a user
   can see or click gets a Playwright test. The coverage gate must stay green.
6. **The file is hand-editable.** Keep it pretty-printed, keep `schemaVersion`
   honest, and keep bad records survivable — report and skip, never discard the
   whole file.

## Guides

| Document | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Module map, data flow, the storage seam, why File System Access and not a sidecar or Tauri |
| [DATA-MODEL.md](DATA-MODEL.md) | `Task` and `TaskFile` schemas, the file format, ordering keys, versioning and conflict rules |
| [TESTING.md](TESTING.md) | How to run each suite, the `?e2e=` seams, how to cover a new change |
| [UI-CONVENTIONS.md](UI-CONVENTIONS.md) | Component patterns, CSS tokens, accessibility requirements |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev workflow, commands, definition of done |
| [README.md](README.md) | What the app is and how to install it on a Mac |

## Commands

```bash
npm run dev            # dev server (the only build with the ?e2e= test seam)
npm run build          # typecheck + production build (PWA, service worker)
npm run preview        # serve the production build
npm run typecheck      # tsc --noEmit
npm run lint           # oxlint
npm run test           # Vitest unit tests
npm run test:coverage  # Vitest with the coverage gate
npm run test:e2e       # Playwright (starts both servers itself)
npm run test:all       # coverage gate + Playwright
```

## Known constraints

- **Chrome or Edge only.** The File System Access API is unavailable in Safari
  and Firefox; the app detects this and says so rather than failing.
- **One click per session.** The browser requires a user gesture to re-grant
  access to a remembered file, which is why the gate screen exists.
- **The native file picker cannot be automated.** It is covered by unit tests
  against a fake handle; the browser suite uses real file handles from the
  origin private file system instead. See TESTING.md.
