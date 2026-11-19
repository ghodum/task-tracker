import { expect, type Page } from '@playwright/test';
import type { Task, TaskFile } from '../../src/types.ts';

export const SEED_KEY = 'task-tracker:e2e-file';

let seq = 0;

/** A valid task; only the fields a test cares about need to be given. */
export function task(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `seed-${seq}`,
    title: `Seed task ${seq}`,
    notes: '',
    dueDate: null,
    urgent: false,
    important: true,
    done: false,
    completedAt: null,
    order: seq,
    createdAt: 1_700_000_000_000 + seq,
    updatedAt: 1_700_000_000_000 + seq,
    ...overrides,
  };
}

export function taskFile(tasks: Task[] = [], revision = 1): TaskFile {
  return { schemaVersion: 1, revision, updatedAt: 1_700_000_000_000, tasks };
}

/** Open the app with the in-memory store seeded with `text` (or a task file). */
export async function openApp(
  page: Page,
  options: { tasks?: Task[]; text?: string; tab?: string } = {},
): Promise<void> {
  const text = options.text ?? JSON.stringify(taskFile(options.tasks ?? []), null, 2);
  await page.addInitScript(
    ([key, value, tab]) => {
      // Runs on every navigation, so only seed the first load; later loads
      // must see whatever the app has written.
      if (localStorage.getItem(key as string) === null) {
        localStorage.setItem(key as string, value as string);
      }
      if (tab && localStorage.getItem('task-tracker:tab') === null) {
        localStorage.setItem('task-tracker:tab', tab as string);
      }
    },
    [SEED_KEY, text, options.tab ?? 'q1'] as const,
  );
  await page.goto('/?e2e=1');
  await expect(page.getByRole('heading', { name: 'Task Tracker' })).toBeVisible();
}

/**
 * The current contents of the app's task "file". A read can briefly fail while
 * the app holds the file open for writing, so it is retried.
 */
export async function readFile(page: Page): Promise<TaskFile> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const text = await page.evaluate(() => {
        const harness = (window as unknown as { __taskTracker: { read(): Promise<string> } })
          .__taskTracker;
        return harness.read();
      });
      return JSON.parse(text) as TaskFile;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(50);
    }
  }
  throw lastError;
}

/** Simulate an edit made to the file outside the app. */
export async function writeFileOutside(page: Page, file: TaskFile): Promise<void> {
  await page.evaluate(
    (text) => {
      const harness = (window as unknown as { __taskTracker: { write(t: string): Promise<void> } })
        .__taskTracker;
      return harness.write(text);
    },
    `${JSON.stringify(file, null, 2)}\n`,
  );
}

export function tab(page: Page, name: RegExp | string) {
  return page.getByRole('tab', { name });
}

export function cardTitles(page: Page) {
  return page.getByTestId('task-card').locator('.card-title');
}

/** Wait for the debounced save to land. */
export async function expectSaved(page: Page, titles: string[]): Promise<void> {
  await expect
    .poll(async () => (await readFile(page)).tasks.map((t) => t.title).sort())
    .toEqual([...titles].sort());
}

/**
 * Open the app on the real FileSystemStore, backed by a real browser file
 * handle (origin private file system) instead of a picked file.
 */
export async function openRealFileApp(
  page: Page,
  options: { file?: TaskFile; text?: string } = {},
): Promise<void> {
  await page.goto('/?e2e=opfs');
  if (options.file || options.text) {
    await writeFileOutside(page, options.file ?? taskFile());
    if (options.text !== undefined) {
      await page.evaluate(
        (text) =>
          (
            window as unknown as { __taskTracker: { write(t: string): Promise<void> } }
          ).__taskTracker.write(text),
        options.text,
      );
    }
  }
  await page.getByRole('button', { name: 'Open task file…' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
}

/** Reconnect to the same file in a fresh session, as a restart would. */
export async function reconnect(page: Page): Promise<void> {
  await page.reload();
  await page.getByRole('button', { name: 'Open task file…' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
}
