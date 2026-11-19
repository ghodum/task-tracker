import { expect, test } from '@playwright/test';
import { openApp, tab, task } from './helpers.ts';

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
