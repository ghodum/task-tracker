import { defineConfig, devices } from '@playwright/test';

export const DEV_URL = 'http://localhost:5174';
export const PREVIEW_URL = 'http://localhost:4174';

/**
 * The UI suite runs against the dev server, which is the only build that
 * carries the `?e2e=` store seam. The PWA/offline suite runs against a real
 * production preview build. See TESTING.md.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: DEV_URL,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium' }],
  webServer: [
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
