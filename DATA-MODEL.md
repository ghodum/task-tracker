# Data model

## The file

One JSON file holds everything. It is pretty-printed with a trailing newline so
it reads and diffs well, and is meant to be editable by hand.

```json
{
  "schemaVersion": 1,
  "revision": 12,
  "updatedAt": 1763500000000,
  "tasks": [
    {
      "id": "0f4c…",
      "title": "Write the quarterly plan",
      "notes": "Outline first",
      "dueDate": "2026-03-04",
      "urgent": false,
      "important": true,
      "done": false,
      "completedAt": null,
      "order": -3,
      "createdAt": 1763400000000,
      "updatedAt": 1763490000000
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Format version. A file from a newer version is refused, not guessed at. |
| `revision` | Incremented on every write. Half of conflict detection. |
| `updatedAt` | When the app last wrote the file. |
| `id` | `crypto.randomUUID()`. Duplicates are reported and skipped on load. |
| `dueDate` | `YYYY-MM-DD` in the user's **local** calendar, or `null`. Never a timestamp — a due date is a day, not an instant. Editable on the card as well as in the edit form; `setDueDate` rejects a date that is not a real calendar day. |
| `urgent`, `important` | The Covey axes. The quadrant is derived from these; it is never stored. |
| `done`, `completedAt` | `completedAt` is set when completing and cleared when re-opening; the loader repairs a mismatch. |
| `order` | Float sort key within the quadrant, ascending. |
| `createdAt`, `updatedAt` | Epoch milliseconds. |

## Quadrants

Defined once, in `src/quadrants.ts`:

| id | urgent | important | Label | Action |
| --- | --- | --- | --- | --- |
| `q1` | ✓ | ✓ | Urgent & Important | Do |
| `q2` | ✗ | ✓ | Not Urgent & Important | Decide |
| `q3` | ✓ | ✗ | Urgent & Not Important | Delegate |
| `q4` | ✗ | ✗ | Not Urgent & Not Important | Delete |

Use `quadrantOf(task)`, `flagsFor(id)`, `quadrantMeta(id)` and `QUADRANTS`.
Never re-test `urgent && important` anywhere else.

## Ordering

`order` is a float so a move costs one write instead of renumbering siblings
(`src/ordering.ts`):

- New task, or a task entering a quadrant: `min(order) - 1` — the top.
- Moved into the middle: the midpoint of its two new neighbours.
- Moved to an end: `±1` past that end.
- Equal orders (possible in a hand-edited file) tie-break on `createdAt`, then
  `id`, so the list never jitters.

Floats do eventually run out of precision after very many midpoint moves
between two adjacent keys. If that ever matters, renumber a quadrant on load;
it has not been needed in practice.

## Loading a hand-edited file

`parseTaskFile` (`src/schema.ts`) is deliberately forgiving about records and
strict about the envelope:

- Not JSON, or not a task-file shape → the whole load fails with a message. The
  file is never overwritten in that state.
- `schemaVersion` greater than the app's → refused, so an older build cannot
  silently drop fields a newer one wrote.
- A task record that is malformed, untitled, or a duplicate `id` → reported in
  `problems` and skipped. The remaining tasks load.
- Missing optional fields → filled with defaults, so `{"id":"a","title":"Buy milk"}`
  is a perfectly valid task to type by hand.

## Changing the schema

1. Add the field to `Task`/`TaskFile` in `src/types.ts`.
2. Give it a default in `src/schema.ts` so older files still load.
3. If the shape changes incompatibly, bump `SCHEMA_VERSION` and handle the old
   version in `migrate()`.
4. Add a `tests/unit/schema.test.ts` case that loads a file written by the
   previous version.

## Conflicts

Writes are refused when the file's `lastModified` **and** `revision` have both
moved since the app last read it; the user then chooses *Reload from file* or
*Overwrite with my changes*. There is no automatic merge: two machines editing
the same file offline is rare for one person, and a silent wrong merge is worse
than a question. Per-task merging by `updatedAt` with tombstones is the obvious
next step if that changes.
