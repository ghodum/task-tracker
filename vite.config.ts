import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Task Tracker',
        short_name: 'Tasks',
        description: 'Covey quadrant task tracker backed by your own JSON file.',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#f6f7f9',
        theme_color: '#1f2933',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Covered by the Playwright suite rather than by unit tests.
        'src/main.tsx',
        'src/App.tsx',
        'src/components/**',
        // Test-only seam, and a thin IndexedDB wrapper the browser suite drives.
        'src/storage/e2e.ts',
        'src/storage/handleDb.ts',
        'src/**/*.d.ts',
      ],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
      reporter: ['text', 'html'],
    },
  },
});
