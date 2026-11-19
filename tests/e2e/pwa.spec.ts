import { expect, test } from '@playwright/test';
import { PREVIEW_URL } from '../../playwright.config.ts';

/**
 * Runs against a real production build: the only one with a service worker,
 * and the one that gets installed to the Dock.
 */
test.describe('production build', () => {
  test.use({ baseURL: PREVIEW_URL });

  test('serves an installable manifest', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const manifest = await (await request.get(new URL(href!, PREVIEW_URL).href)).json();
    expect(manifest).toMatchObject({
      name: 'Task Tracker',
      short_name: 'Tasks',
      display: 'standalone',
    });
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain('512x512');
    expect(
      manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable'),
    ).toBe(true);

    for (const icon of manifest.icons as { src: string }[]) {
      const response = await request.get(new URL(icon.src, PREVIEW_URL).href);
      expect(response.status(), icon.src).toBe(200);
    }
  });

  test('registers a service worker and loads offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      undefined,
      { timeout: 20_000 },
    );

    await context.setOffline(true);
    await page.reload();
    // The shell renders from the precache; the gate screen is the real entry.
    await expect(page.getByRole('heading')).toBeVisible();
    await context.setOffline(false);
  });

  test('does not expose the test store seam in a production build', async ({ page }) => {
    await page.goto('/?e2e=1');
    await expect(page.getByRole('heading', { name: 'Task Tracker' })).toBeVisible();
    expect(await page.evaluate(() => '__taskTracker' in window)).toBe(false);
    // Without a seam it falls back to the real file store, so the gate shows.
    await expect(page.getByRole('button', { name: /task file/i })).toBeVisible();
  });
});
