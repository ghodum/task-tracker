import { expect, test } from '@playwright/test';
import { openApp, readFile, tab, task } from './helpers.ts';

/** 'YYYY-MM-DD' offset from today, in the browser's local calendar. */
function isoOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

test('badges overdue, today and upcoming due dates', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'Late', urgent: true, important: true, dueDate: isoOffset(-3), order: 0 }),
      task({ title: 'Due now', urgent: true, important: true, dueDate: isoOffset(0), order: 1 }),
      task({ title: 'Soon', urgent: true, important: true, dueDate: isoOffset(1), order: 2 }),
      task({ title: 'Undated', urgent: true, important: true, order: 3 }),
    ],
  });

  const badges = page.getByTestId('due-badge');
  await expect(badges).toHaveText(['Overdue', 'Today', 'Tomorrow']);
  await expect(page.getByText('1 overdue task in this quadrant.')).toBeVisible();
  await expect(page.getByTestId('overdue-q1')).toBeVisible();
});

test('shows no overdue marker when nothing is late', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Soon', urgent: true, important: true, dueDate: isoOffset(2) })],
  });

  await expect(page.getByTestId('overdue-q1')).toBeHidden();
  await expect(page.getByText(/overdue/)).toBeHidden();
  await expect(tab(page, /Do ·/)).toContainText('1');
});

test('sets a due date from the form', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByLabel('Title').fill('Dated task');
  await page.getByLabel('Due date').fill(isoOffset(0));
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect(page.getByTestId('due-badge')).toHaveText('Today');
});

test('sets a due date from the card, without opening the edit form', async ({ page }) => {
  await openApp(page, { tasks: [task({ title: 'Undated', urgent: true, important: true })] });

  await expect(page.getByTestId('due-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'Set a due date for Undated' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByLabel('Due date for Undated').fill(isoOffset(0));
  await expect(page.getByTestId('due-badge')).toHaveText('Today');

  await expect
    .poll(async () => (await readFile(page)).tasks[0].dueDate)
    .toBe(isoOffset(0));
});

test('changes an existing due date from the card', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Dated', urgent: true, important: true, dueDate: isoOffset(5) })],
  });

  await page.getByRole('button', { name: 'Change due date of Dated' }).click();
  await page.getByLabel('Due date for Dated').fill(isoOffset(-1));

  await expect(page.getByTestId('due-badge')).toHaveText('Overdue');
  await expect(page.getByTestId('overdue-q1')).toBeVisible();
  await expect(page.getByText('1 overdue task in this quadrant.')).toBeVisible();
});

test('clears a due date from the card', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Dated', urgent: true, important: true, dueDate: isoOffset(1) })],
  });

  await page.getByRole('button', { name: 'Change due date of Dated' }).click();
  await page.getByRole('button', { name: 'Clear due date of Dated' }).click();

  await expect(page.getByTestId('due-badge')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Set a due date for Dated' })).toBeVisible();
  await expect.poll(async () => (await readFile(page)).tasks[0].dueDate).toBeNull();
});

test('leaves the date alone on Escape and restores focus to the badge', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Dated', urgent: true, important: true, dueDate: isoOffset(1) })],
  });

  const badge = page.getByRole('button', { name: 'Change due date of Dated' });
  await badge.click();
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('due-badge')).toHaveText('Tomorrow');
  await expect(badge).toBeFocused();
});

test('the inline editor does not disturb the rest of the task', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'First', urgent: true, important: true, order: 0, notes: 'keep me' }),
      task({ title: 'Second', urgent: true, important: true, order: 1 }),
    ],
  });

  await page.getByRole('button', { name: 'Set a due date for First' }).click();
  await page.getByLabel('Due date for First').fill(isoOffset(3));

  await expect(page.getByTestId('task-card').locator('.card-title')).toHaveText([
    'First',
    'Second',
  ]);
  const first = (await readFile(page)).tasks.find((t) => t.title === 'First');
  expect(first).toMatchObject({ notes: 'keep me', order: 0, urgent: true, important: true });
});
