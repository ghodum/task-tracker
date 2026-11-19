import { expect, test } from '@playwright/test';
import { cardTitles, openApp, readFile, tab, task } from './helpers.ts';

test('each tab shows only its own quadrant', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'Crisis', urgent: true, important: true }),
      task({ title: 'Planning', urgent: false, important: true }),
      task({ title: 'Interruption', urgent: true, important: false }),
      task({ title: 'Busywork', urgent: false, important: false }),
    ],
  });

  await expect(cardTitles(page)).toHaveText(['Crisis']);
  await tab(page, /Decide ·/).click();
  await expect(cardTitles(page)).toHaveText(['Planning']);
  await tab(page, /Delegate ·/).click();
  await expect(cardTitles(page)).toHaveText(['Interruption']);
  await tab(page, /Delete ·/).click();
  await expect(cardTitles(page)).toHaveText(['Busywork']);
});

test('open counts on the tabs reflect the tasks', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'Crisis', urgent: true, important: true }),
      task({ title: 'Another crisis', urgent: true, important: true }),
      task({ title: 'Finished', urgent: true, important: true, done: true, completedAt: 1 }),
      task({ title: 'Planning', urgent: false, important: true }),
    ],
  });

  await expect(tab(page, /Do ·/)).toContainText('2');
  await expect(tab(page, /Decide ·/)).toContainText('1');
  await expect(tab(page, /Delegate ·/)).toContainText('0');
  await expect(tab(page, /Done/)).toContainText('1');
});

test('the quadrant picker moves a task to another tab, on top', async ({ page }) => {
  await openApp(page, {
    tasks: [
      task({ title: 'Mover', urgent: true, important: true }),
      task({ title: 'Resident', urgent: false, important: true, order: 0 }),
    ],
  });

  await page.getByRole('button', { name: 'Change quadrant of Mover' }).click();
  await page
    .getByRole('radio', { name: /Not Urgent & Important/ })
    .first()
    .click();

  await expect(cardTitles(page)).toHaveCount(0);
  await expect(tab(page, /Do ·/)).toContainText('0');

  await tab(page, /Decide ·/).click();
  await expect(cardTitles(page)).toHaveText(['Mover', 'Resident']);

  await expect
    .poll(async () => {
      const file = await readFile(page);
      return file.tasks.find((t) => t.title === 'Mover');
    })
    .toMatchObject({ urgent: false, important: true });
});

test('editing a task to a new quadrant moves it', async ({ page }) => {
  await openApp(page, { tasks: [task({ title: 'Reclassify me', urgent: true, important: true })] });

  await page.getByRole('button', { name: 'Edit Reclassify me' }).click();
  await page.getByRole('radio', { name: /Not Urgent & Not Important/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(cardTitles(page)).toHaveCount(0);
  await tab(page, /Delete ·/).click();
  await expect(cardTitles(page)).toHaveText(['Reclassify me']);
});

test('tabs are navigable with the arrow keys', async ({ page }) => {
  await openApp(page, { tasks: [task({ title: 'Crisis', urgent: true, important: true })] });

  await tab(page, /Do ·/).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, /Decide ·/)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(tab(page, /Do ·/)).toHaveAttribute('aria-selected', 'true');
  // Wraps backwards to the last tab.
  await page.keyboard.press('ArrowLeft');
  await expect(tab(page, /Done/)).toHaveAttribute('aria-selected', 'true');
});

test('remembers the active tab across a reload', async ({ page }) => {
  await openApp(page, { tasks: [task({ title: 'Planning', urgent: false, important: true })] });
  await tab(page, /Decide ·/).click();
  await page.reload();
  await expect(tab(page, /Decide ·/)).toHaveAttribute('aria-selected', 'true');
  await expect(cardTitles(page)).toHaveText(['Planning']);
});
