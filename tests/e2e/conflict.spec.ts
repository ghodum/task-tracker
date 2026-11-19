import { expect, test } from '@playwright/test';
import { cardTitles, openRealFileApp, readFile, task, taskFile } from './helpers.ts';

/** Make an outside edit to the real file the app is using. */
async function editOutside(page: import('@playwright/test').Page, title: string) {
  await page.evaluate(
    (text) =>
      (
        window as unknown as { __taskTracker: { write(t: string): Promise<void> } }
      ).__taskTracker.write(text),
    `${JSON.stringify(taskFile([task({ title, urgent: true, important: true })], 99), null, 2)}\n`,
  );
}

test('refuses the write and offers to reload when the file changed underneath', async ({
  page,
}) => {
  await openRealFileApp(page, {
    file: taskFile([task({ title: 'Mine', urgent: true, important: true })], 2),
  });

  await editOutside(page, 'Theirs');

  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('My new task');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  const dialog = page.getByRole('dialog', { name: 'The task file changed' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('1 tasks');

  // Nothing was written while the conflict was open.
  expect((await readFile(page)).tasks.map((t) => t.title)).toEqual(['Theirs']);

  await page.getByRole('button', { name: 'Reload from file' }).click();
  await expect(dialog).toBeHidden();
  await expect(cardTitles(page)).toHaveText(['Theirs']);
});

test('can overwrite the outside edit with the local version', async ({ page }) => {
  await openRealFileApp(page, {
    file: taskFile([task({ title: 'Mine', urgent: true, important: true })], 2),
  });

  await editOutside(page, 'Theirs');

  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('My new task');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect(page.getByRole('dialog', { name: 'The task file changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Overwrite with my changes' }).click();

  await expect(cardTitles(page)).toHaveText(['My new task', 'Mine']);
  await expect
    .poll(async () => (await readFile(page)).tasks.map((t) => t.title).sort())
    .toEqual(['Mine', 'My new task']);
});

test('saves normally again after a conflict is resolved', async ({ page }) => {
  await openRealFileApp(page, {
    file: taskFile([task({ title: 'Mine', urgent: true, important: true })], 2),
  });
  await editOutside(page, 'Theirs');

  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Rejected write');
  await page.getByRole('button', { name: 'Add task' }).last().click();
  await page.getByRole('button', { name: 'Reload from file' }).click();

  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Accepted write');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect
    .poll(async () => (await readFile(page)).tasks.map((t) => t.title).sort())
    .toEqual(['Accepted write', 'Theirs']);
});
