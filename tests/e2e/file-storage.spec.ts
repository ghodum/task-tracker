import { expect, test } from '@playwright/test';
import {
  cardTitles,
  openRealFileApp,
  readFile,
  reconnect,
  tab,
  task,
  taskFile,
} from './helpers.ts';

/**
 * These tests drive the production FileSystemStore against a real browser file
 * handle, so the read, write and revision paths are the real ones. The native
 * file picker itself cannot be automated; it is covered by the unit tests in
 * tests/unit/filesystem-store.test.ts.
 */
test('loads tasks that were already in the file', async ({ page }) => {
  await openRealFileApp(page, {
    file: taskFile([
      task({ title: 'From the file', urgent: true, important: true }),
      task({ title: 'Also from the file', urgent: false, important: true }),
    ]),
  });

  await expect(cardTitles(page)).toHaveText(['From the file']);
  await tab(page, /Decide ·/).click();
  await expect(cardTitles(page)).toHaveText(['Also from the file']);
});

test('writes a new task into the file and bumps the revision', async ({ page }) => {
  await openRealFileApp(page, { file: taskFile([], 4) });

  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Written to disk');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect.poll(async () => (await readFile(page)).tasks.length).toBe(1);
  const file = await readFile(page);
  expect(file.tasks[0]).toMatchObject({ title: 'Written to disk', urgent: true, important: true });
  expect(file.revision).toBeGreaterThan(4);
  expect(file.schemaVersion).toBe(1);
});

test('the file stays pretty-printed so it can be edited by hand', async ({ page }) => {
  await openRealFileApp(page, { file: taskFile() });
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Readable');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (window as unknown as { __taskTracker: { read(): Promise<string> } }).__taskTracker.read(),
      ),
    )
    .toContain('\n  "tasks": [');
});

test('a later session sees the same tasks from the same file', async ({ page }) => {
  await openRealFileApp(page, { file: taskFile() });
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Across sessions');
  await page.getByRole('button', { name: 'Add task' }).last().click();
  await expect.poll(async () => (await readFile(page)).tasks.length).toBe(1);

  // A reload drops the in-memory session, as quitting the app would.
  await reconnect(page);
  await expect(cardTitles(page)).toHaveText(['Across sessions']);
});

test('picks up an outside edit when reloaded from the settings panel', async ({ page }) => {
  await openRealFileApp(page, {
    file: taskFile([task({ title: 'Original', urgent: true, important: true })]),
  });

  await page.evaluate(
    (text) =>
      (
        window as unknown as { __taskTracker: { write(t: string): Promise<void> } }
      ).__taskTracker.write(text),
    `${JSON.stringify(
      taskFile([{ ...task({ title: 'Edited elsewhere', urgent: true, important: true }) }], 9),
      null,
      2,
    )}\n`,
  );

  await page.getByRole('button', { name: 'Task file settings' }).click();
  await page.getByRole('button', { name: 'Reload from file' }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(cardTitles(page)).toHaveText(['Edited elsewhere']);
});
