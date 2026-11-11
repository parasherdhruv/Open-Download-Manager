import { defineConfig } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4173';

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  forbidOnly: true,
  fullyParallel: false,
  outputDir: 'test-results',
  reporter: [['line']],
  retries: 0,
  testDir: './e2e',
  timeout: 15_000,
  use: {
    actionTimeout: 5_000,
    baseURL: localOrigin,
    browserName: 'chromium',
    navigationTimeout: 10_000,
    screenshot: 'off',
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'corepack pnpm run build && corepack pnpm exec vite preview',
    reuseExistingServer: false,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 60_000,
    url: localOrigin,
  },
  workers: 1,
});
