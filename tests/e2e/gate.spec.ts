import { expect, test } from '@playwright/test';
import { cardTitles, task, taskFile } from './helpers.ts';

/**
 * The gate screen is what the real app shows before a file is connected, so
 * these tests use the OPFS-backed store (real FileSystemStore) rather than the
 * in-memory seam.
 */
test('offers to open or create a file, then shows the tasks', async ({ page }) => {
  await page.goto('/?e2e=opfs');

  await expect(page.getByRole('heading', { name: 'Task Tracker' })).toBeVisible();
  await expect(page.getByText('task-tracker-task.json')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create new file…' })).toBeVisible();
  // No task UI until a file is connected.
  await expect(page.getByRole('tablist')).toBeHidden();

  await page.getByRole('button', { name: 'Open task file…' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
});

test('asks for one more click when the picker leaves the file unreadable', async ({ page }) => {
  // ?e2e=opfs-prompt picks a file that has no write permission yet, which is
  // what a real picked file looks like: the picker spent the click, so the
  // grant has to wait for another one.
  await page.goto('/?e2e=opfs-prompt');
  await page.getByRole('button', { name: 'Open task file…' }).click();

  await expect(page.getByText('one click to let this app read and write it again')).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();

  await page.getByRole('button', { name: 'Reconnect task file' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
});

test('finishes creating a new file after the extra permission click', async ({ page }) => {
  await page.goto('/?e2e=opfs-prompt');
  await page.getByRole('button', { name: 'Create new file…' }).click();
  await page.getByRole('button', { name: 'Reconnect task file' }).click();

  await expect(page.getByText('Nothing here.')).toBeVisible();
  const text = await page.evaluate(() =>
    (window as unknown as { __taskTracker: { read(): Promise<string> } }).__taskTracker.read(),
  );
  expect(JSON.parse(text)).toMatchObject({ schemaVersion: 1, tasks: [] });
});

test('creating a new file starts an empty, valid task list', async ({ page }) => {
  await page.goto('/?e2e=opfs');
  await page.getByRole('button', { name: 'Create new file…' }).click();

  await expect(page.getByText('Nothing here.')).toBeVisible();
  const text = await page.evaluate(() =>
    (window as unknown as { __taskTracker: { read(): Promise<string> } }).__taskTracker.read(),
  );
  expect(JSON.parse(text)).toMatchObject({ schemaVersion: 1, tasks: [] });
});

test('changing the file from the settings panel asks for its own click', async ({ page }) => {
  await page.goto('/?e2e=opfs-prompt');
  await page.getByRole('button', { name: 'Open task file…' }).click();
  await page.getByRole('button', { name: 'Reconnect task file' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();

  await page.getByRole('button', { name: 'Task file settings' }).click();
  await page.getByRole('button', { name: 'Change file…' }).click();

  // The newly picked file needs a grant of its own, so the gate comes back.
  await expect(page.getByText('one click to let this app read and write it again')).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();

  await page.getByRole('button', { name: 'Reconnect task file' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
});

test('reports records it could not read in a hand-edited file', async ({ page }) => {
  await page.goto('/?e2e=opfs');
  await page.evaluate(
    (text) =>
      (
        window as unknown as { __taskTracker: { write(t: string): Promise<void> } }
      ).__taskTracker.write(text),
    JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      updatedAt: 0,
      tasks: [task({ title: 'Good one', urgent: true, important: true }), { title: 'No id' }],
    }),
  );

  await page.getByRole('button', { name: 'Open task file…' }).click();

  await expect(page.getByRole('status')).toContainText('could not be read');
  await expect(cardTitles(page)).toHaveText(['Good one']);

  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('status')).toBeHidden();
});

test('reports a file that is not valid JSON instead of losing it', async ({ page }) => {
  await page.goto('/?e2e=opfs');
  await page.evaluate(
    (text) =>
      (
        window as unknown as { __taskTracker: { write(t: string): Promise<void> } }
      ).__taskTracker.write(text),
    '{ this is not json',
  );

  await page.getByRole('button', { name: 'Open task file…' }).click();
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
});

test('disconnecting returns to the gate without touching the file', async ({ page }) => {
  await page.goto('/?e2e=opfs');
  await page.evaluate(
    (text) =>
      (
        window as unknown as { __taskTracker: { write(t: string): Promise<void> } }
      ).__taskTracker.write(text),
    `${JSON.stringify(taskFile([task({ title: 'Still here', urgent: true, important: true })]))}\n`,
  );
  await page.getByRole('button', { name: 'Open task file…' }).click();
  await expect(cardTitles(page)).toHaveText(['Still here']);

  await page.getByRole('button', { name: 'Task file settings' }).click();
  await page.getByRole('button', { name: 'Disconnect' }).click();

  await expect(page.getByRole('button', { name: 'Open task file…' })).toBeVisible();
  const text = await page.evaluate(() =>
    (window as unknown as { __taskTracker: { read(): Promise<string> } }).__taskTracker.read(),
  );
  expect(JSON.parse(text).tasks).toHaveLength(1);
});
