import { expect, test } from '@playwright/test';
import { cardTitles, openApp, tab, task } from './helpers.ts';

test('the tab bar is a single tab stop with the selected tab focusable', async ({ page }) => {
  await openApp(page, { tasks: [task({ title: 'Crisis', urgent: true, important: true })] });

  await expect(tab(page, /Do ·/)).toHaveAttribute('tabindex', '0');
  await expect(tab(page, /Decide ·/)).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-q1');
});

test('the add form traps focus and can be driven from the keyboard alone', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByLabel('Title')).toBeFocused();

  await page.keyboard.type('Keyboard only');
  // Shift+Tab from the first field wraps to the last control in the dialog.
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Add task' }).last()).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(cardTitles(page)).toHaveText(['Keyboard only']);
});

test('closing a dialog returns focus to the control that opened it', async ({ page }) => {
  await openApp(page, { tasks: [task({ title: 'Focus me', urgent: true, important: true })] });

  const editButton = page.getByRole('button', { name: 'Edit Focus me' });
  await editButton.click();
  await page.keyboard.press('Escape');
  await expect(editButton).toBeFocused();
});

test('every card action has an accessible name', async ({ page }) => {
  await openApp(page, {
    tasks: [task({ title: 'Labelled', urgent: true, important: true, notes: 'detail' })],
  });

  for (const name of [
    'Complete Labelled',
    'Move Labelled to top',
    'Move Labelled up',
    'Move Labelled down',
    'Move Labelled to bottom',
    'Change quadrant of Labelled',
    'Set a due date for Labelled',
    'Edit Labelled',
    'Delete Labelled',
  ]) {
    await expect(page.getByRole(name.startsWith('Complete') ? 'checkbox' : 'button', { name })).toHaveCount(1);
  }
});
