import { expect, test } from '@playwright/test';
import { cardTitles, openApp, readFile, task } from './helpers.ts';

const three = () => [
  task({ title: 'A', urgent: true, important: true, order: 0 }),
  task({ title: 'B', urgent: true, important: true, order: 1 }),
  task({ title: 'C', urgent: true, important: true, order: 2 }),
];

test('moves a task up and down with the keyboard controls', async ({ page }) => {
  await openApp(page, { tasks: three() });

  await page.getByRole('button', { name: 'Move C up' }).click();
  await expect(cardTitles(page)).toHaveText(['A', 'C', 'B']);

  await page.getByRole('button', { name: 'Move A down' }).click();
  await expect(cardTitles(page)).toHaveText(['C', 'A', 'B']);
});

test('disables the move buttons at the ends of the list', async ({ page }) => {
  await openApp(page, { tasks: three() });

  await expect(page.getByRole('button', { name: 'Move A up' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move C down' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move B up' })).toBeEnabled();
});

test('persists a new order to the file and across a reload', async ({ page }) => {
  await openApp(page, { tasks: three() });

  await page.getByRole('button', { name: 'Move C up' }).click();
  await expect
    .poll(async () => {
      const file = await readFile(page);
      return [...file.tasks].sort((x, y) => x.order - y.order).map((t) => t.title);
    })
    .toEqual(['A', 'C', 'B']);

  await page.reload();
  await expect(cardTitles(page)).toHaveText(['A', 'C', 'B']);
});

test('jumps a task to the top or the bottom in one click', async ({ page }) => {
  await openApp(page, { tasks: three() });

  await page.getByRole('button', { name: 'Move C to top' }).click();
  await expect(cardTitles(page)).toHaveText(['C', 'A', 'B']);

  await page.getByRole('button', { name: 'Move C to bottom' }).click();
  await expect(cardTitles(page)).toHaveText(['A', 'B', 'C']);
});

test('disables the jump buttons at the end they would move to', async ({ page }) => {
  await openApp(page, { tasks: three() });

  await expect(page.getByRole('button', { name: 'Move A to top' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move C to bottom' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move B to top' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Move B to bottom' })).toBeEnabled();
});

test('persists a jump to the file and across a reload', async ({ page }) => {
  await openApp(page, { tasks: three() });

  await page.getByRole('button', { name: 'Move C to top' }).click();
  await expect
    .poll(async () => {
      const file = await readFile(page);
      return [...file.tasks].sort((x, y) => x.order - y.order).map((t) => t.title);
    })
    .toEqual(['C', 'A', 'B']);

  await page.reload();
  await expect(cardTitles(page)).toHaveText(['C', 'A', 'B']);
});

test('reorders by dragging one card onto another', async ({ page }) => {
  await openApp(page, { tasks: three() });

  const cards = page.getByTestId('task-card');
  await cards.nth(2).dragTo(cards.nth(0));

  await expect(cardTitles(page)).toHaveText(['C', 'A', 'B']);
});
