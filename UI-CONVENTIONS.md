# UI conventions

## Component rules

- Components in `src/components/` are presentational. They receive data and
  callbacks; they never import a store, mutate tasks, or touch the file.
- `App.tsx` owns "what is on screen": the active tab and which dialog is open.
  Task state belongs to `useTaskTracker`.
- Derive, don't duplicate. Quadrant membership, counts and ordering come from
  `src/mutations.ts` and `src/quadrants.ts` on render.
- Every dialog is built on `Modal`, which traps focus, closes on Escape and
  returns focus to whatever opened it. Do not hand-roll a dialog.
- `Confirm` guards anything destructive. Deleting a task always confirms.
- **Edit in place where a single field is involved.** `DueDateControl` is the
  pattern: the badge is the button, clicking it swaps in the field, and the
  change commits immediately. The edit form is for editing a task as a whole,
  not for changing one value. A control like this restores focus to its
  trigger when it closes by choice (commit, Clear, Escape) but not when the
  user tabs away — see the `restoreFocus` ref in `DueDateControl.tsx`.

## Layout

The app is a single column, max 820px, designed for a standalone window as
narrow as ~420px. The tab bar wraps; the panel header stacks below 560px.

Tabs are a real `role="tablist"`: one tab stop, arrow keys move between
quadrants, `aria-selected` marks the current one, and each panel is a
`role="tabpanel"` labelled by its tab.

## Styling

One stylesheet, `src/styles.css`. No UI framework, no CSS-in-JS.

- Colours are tokens on `:root`, redefined for dark mode under
  `@media (prefers-color-scheme: dark)` (guarded by
  `:root:not([data-theme='light'])`) and again under `:root[data-theme='dark']`.
  Never hardcode a colour in a component.
- The quadrant accents are `--q1` … `--q4`. A quadrant-coloured element gets
  the quadrant id as a class (`.tab.q1`, `.picker-cell.q2`) and uses
  `currentcolor`, so adding a quadrant-tinted element needs no new tokens.
- Class names are flat and descriptive (`card-title`, `panel-head`,
  `tab-count`). State is a `is-` prefix (`is-active`, `is-selected`,
  `is-drag-over`).
- Reusable pieces: `.btn` (+ `.btn-primary`, `.btn-danger`, `.btn-quiet`),
  `.icon-btn`, `.link`, `.badge`, `.card`, `.panel`, `.input`, `.field`.

## Accessibility requirements

These are tested in `tests/e2e/a11y.spec.ts`; keep them true.

- Every icon-only control has an `aria-label` that names its task, e.g.
  `Edit Buy milk`, `Move Buy milk up`, `Complete Buy milk`. This is both an
  accessibility requirement and how the tests find things. In-place editors
  follow the same rule on all three states: `Set a due date for Buy milk`,
  `Change due date of Buy milk`, `Clear due date of Buy milk`, and the field
  itself is labelled `Due date for Buy milk` (visually hidden).
- Drag-and-drop always has a keyboard equivalent — the ↑/↓ buttons, disabled at
  the ends of the list.
- The quadrant picker is a `fieldset`/`legend` with real radio inputs, so it
  works with a keyboard and a screen reader even though it is drawn as a grid.
- Form fields are wrapped in a `<label>` with a real `htmlFor`; errors use
  `role="alert"` and `aria-invalid`.
- Focus is always visible: `:focus-visible` gets a 2px accent outline. Do not
  remove it.
- Status messages use `role="status"` (file repairs) or `role="alert"`
  (failures), and both can be dismissed.

## Copy

Plain, specific, and about the user's file: "Your tasks are in
`task-tracker-task.json`", "Nothing has been written, so pick which version to
keep". Empty states say what to do next. No exclamation marks, no cheerleading.
