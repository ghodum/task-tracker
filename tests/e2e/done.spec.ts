import { expect, test } from '@playwright/test';
import { cardTitles, expectSaved, openApp, readFile, tab, task } from './helpers.ts';

test('completing a task moves it out of its quadrant and into Done', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'Finish me', urgent: true, important: true }),
      task({ title: 'Stay open', urgent: true, important: true }),
    ],
  });

  await page.getByRole('checkbox', { name: 'Complete Finish me' }).click();

  await expect(cardTitles(page)).toHaveText(['Stay open']);
  await expect(tab(page, /Done/)).toContainText('1');

  await tab(page, /Done/).click();
  await expect(cardTitles(page)).toHaveText(['Finish me']);
  await expect(page.getByText('Today', { exact: true })).toBeVisible();

  await expect
    .poll(async () => (await readFile(page)).tasks.find((t) => t.title === 'Finish me')?.done)
    .toBe(true);
});

test('re-opening a task puts it back on top of its quadrant', async ({ page }) => {
  await openApp(page, {
    tab: 'done',
    tasks: [
      task({ title: 'Completed', urgent: true, important: true, done: true, completedAt: 1 }),
      task({ title: 'Resident', urgent: true, important: true, order: 0 }),
    ],
  });

  await page.getByRole('checkbox', { name: 'Reopen Completed' }).click();
  await expect(page.getByText('Nothing completed yet.')).toBeVisible();

  await tab(page, /Do ·/).click();
  await expect(cardTitles(page)).toHaveText(['Completed', 'Resident']);
});

test('groups completed tasks into Today and Earlier', async ({ page }) => {
  const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await openApp(page, {
    tab: 'done',
    tasks: [
      task({ title: 'Today task', done: true, completedAt: Date.now() }),
      task({ title: 'Old task', done: true, completedAt: lastWeek }),
    ],
  });

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Earlier' })).toBeVisible();
  await expect(cardTitles(page)).toHaveText(['Today task', 'Old task']);
});

test('deletes a completed task from the file', async ({ page }) => {
  await openApp(page, {
    tab: 'done',
    tasks: [task({ title: 'Archived', done: true, completedAt: Date.now() })],
  });

  await page.getByRole('button', { name: 'Delete Archived' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText('Nothing completed yet.')).toBeVisible();
  await expectSaved(page, []);
});
