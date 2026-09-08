import { defineConfig } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4318';

export default defineConfig({
  testDir: '.',
  testMatch: 'evidence-ui.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 15_000,
  expect: {
    timeout: 5_000
  },
  reporter: 'line',
  outputDir: '../../test-results/p8-evidence-ui',
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'npm run preview:evidence-ui',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      P8_UI_PORT: '4318'
    }
  }
});
