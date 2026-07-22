import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests that drive the real app in Chromium — covering the
 * CodeMirror editor, keyboard flow, and persistence that jsdom can't exercise.
 * Runs against the Vite dev server (which uses StrictMode, the harder path for
 * the focus behaviour).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
