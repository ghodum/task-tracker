import { expect, test } from '@playwright/test';
import { cardTitles, expectSaved, openApp, readFile, tab, task } from './helpers.ts';

test('adds a task to the active quadrant and writes it to the file', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Fix the build');
  await page.getByLabel('Notes').fill('Broken since the upgrade');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect(cardTitles(page)).toHaveText(['Fix the build']);
  await expectSaved(page, ['Fix the build']);

  const file = await readFile(page);
  expect(file.tasks[0]).toMatchObject({
    title: 'Fix the build',
    notes: 'Broken since the upgrade',
    urgent: true,
    important: true,
    done: false,
  });
});

test('requires a title', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('   ');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect(page.getByRole('alert')).toHaveText('A title is required.');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('closes the form on Escape without adding anything', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Never saved');
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Nothing here.')).toBeVisible();
});

test('edits a task, keeping its position', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'Top', urgent: true, important: true, order: 0 }),
      task({ title: 'Middle', urgent: true, important: true, order: 1 }),
      task({ title: 'Bottom', urgent: true, important: true, order: 2 }),
    ],
  });

  await page.getByRole('button', { name: 'Edit Middle' }).click();
  await page.getByLabel('Title').fill('Middle, renamed');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(cardTitles(page)).toHaveText(['Top', 'Middle, renamed', 'Bottom']);
  await expectSaved(page, ['Top', 'Middle, renamed', 'Bottom']);
});

test('shows and hides notes', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Has notes', notes: 'The detail', urgent: true, important: true })],
  });

  await expect(page.getByText('The detail')).toBeHidden();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByText('The detail')).toBeVisible();
  await page.getByRole('button', { name: 'Hide notes' }).click();
  await expect(page.getByText('The detail')).toBeHidden();
});

test('deletes a task only after confirmation', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Doomed', urgent: true, important: true })],
  });

  await page.getByRole('button', { name: 'Delete Doomed' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(cardTitles(page)).toHaveText(['Doomed']);

  await page.getByRole('button', { name: 'Delete Doomed' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByTestId('task-card')).toHaveCount(0);
  await expectSaved(page, []);
});

test('keeps tasks across a reload, from the file alone', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Survives a reload');
  await page.getByRole('button', { name: 'Add task' }).last().click();
  await expectSaved(page, ['Survives a reload']);

  await page.reload();
  await expect(cardTitles(page)).toHaveText(['Survives a reload']);
  await expect(tab(page, /Do ·/)).toContainText('1');
});
