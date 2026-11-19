# Testing

Two suites, both required to be green:

| Command | What it runs |
| --- | --- |
| `npm run test` | Vitest unit tests (`tests/unit`) |
| `npm run test:coverage` | The same, with the coverage gate |
| `npm run test:e2e` | Playwright (`tests/e2e`); starts the dev and preview servers itself |
| `npm run test:all` | Both |

Useful variants: `npm run test:watch`, `npx vitest run tests/unit/schema.test.ts`,
`npx playwright test conflict`, `npx playwright test --ui`,
`npx playwright test -g "reorder"`.

## Unit tests (Vitest, jsdom)

| File | Covers |
| --- | --- |
| `quadrants.test.ts` | The four quadrant mappings and their round trip |
| `dates.test.ts` | Local calendar days, overdue/today, label formatting |
| `ordering.test.ts` | Top/bottom/midpoint sort keys, tie-breaks |
| `schema.test.ts` | Parsing, defaults, repairs, version refusal, serialization |
| `mutations.test.ts` | Every pure task mutation, including `setDueDate` and its rejection of impossible dates, and `jumpTask`'s no-op at an end |
| `tabs.test.ts` | The tab list and the stored-tab guard |
| `filesystem-store.test.ts` | `FileSystemStore` against a fake file handle: permissions, read, write, revision conflict |
| `store.test.ts` | `useTaskTracker`: load, debounced save, conflict handling, error paths |

Helpers: `factories.ts` (`makeTask`) and `fakeFs.ts` (`FakeFileHandle`,
`FakeHandleStorage`, `fakePickers`). Prefer them over hand-rolled fixtures.

The coverage gate (`vite.config.ts`) is 90% lines/functions/statements and 85%
branches over `src/`, excluding `App.tsx`, `components/**` and `main.tsx`
(covered by Playwright) and the test-only `storage/e2e.ts` plus the thin
`storage/handleDb.ts` IndexedDB wrapper.

## End-to-end tests (Playwright, Chromium)

The native file picker cannot be automated, so the app exposes two seams —
**only in a dev build**, guarded by `import.meta.env.DEV` in `src/main.tsx`:

- **`?e2e=1`** — a `MemoryStore` whose text is kept in `localStorage`, so a
  test can seed a file, act, reload, and still see its writes. Used by the UI
  specs through `openApp()` in `tests/e2e/helpers.ts`.
- **`?e2e=opfs`** — the real `FileSystemStore`, against a real browser file
  handle from the origin private file system. This exercises the production
  read/write/permission/conflict code. Used through `openRealFileApp()`.

Both expose `window.__taskTracker` with `read()` and `write()`, which is how a
test inspects "the file" or simulates an edit made outside the app. The
production build has no seam at all — `pwa.spec.ts` asserts that.

| Spec | Covers |
| --- | --- |
| `crud.spec.ts` | Add, validate, edit, notes, delete with confirmation, persistence across reload |
| `quadrants.spec.ts` | Per-tab filtering, counts, the quadrant picker, editing across quadrants, arrow-key tabs, remembered tab |
| `reorder.spec.ts` | Move up/down, jump to top/bottom, disabled ends, drag-and-drop, persistence |
| `done.spec.ts` | Complete, re-open, Today/Earlier grouping, delete |
| `due-dates.spec.ts` | Overdue/Today/Tomorrow badges, quadrant alert, tab dot, and editing a due date on the card (set, change, clear, Escape, focus return) |
| `gate.spec.ts` | Gate screen, creating a file, hand-edit repair reporting, invalid JSON, disconnect |
| `file-storage.spec.ts` | Real file handles: load, write, pretty-printing, a later session, reload from settings |
| `conflict.spec.ts` | Refused write, reload, overwrite, saving normally afterwards |
| `a11y.spec.ts` | Tab-stop behaviour, focus trap, focus restoration, accessible names |
| `pwa.spec.ts` | Production build: manifest, icons, service worker, offline load, no test seam |

Notes for writing specs:

- Query by role and accessible name. Card controls are labelled with the task
  title (`Edit Buy milk`), which keeps the tests readable and the UI accessible.
- Use `click()`, not `check()`/`uncheck()`, on a control that disappears as a
  result (completing a task, picking a quadrant) — Playwright would otherwise
  wait forever for the element to settle.
- Saves are debounced: assert through `expectSaved()` or `expect.poll` with
  `readFile()`, never a bare timeout.
- Each test gets a fresh browser context, so the memory seed and the OPFS file
  start empty.

## Covering a change

- New or changed logic in `src/*.ts` → a unit test in the matching file.
- Anything a user sees or clicks → a Playwright spec, exercised the way a
  person would (roles and names, not CSS selectors).
- A change to reading or writing the file → a case in `filesystem-store.test.ts`
  **and** one in `file-storage.spec.ts` or `conflict.spec.ts`.
- A new schema field → a `schema.test.ts` case that loads a file without it.
