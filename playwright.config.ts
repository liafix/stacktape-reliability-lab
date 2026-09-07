import { defineConfig } from '@playwright/test';

const LOOPBACK_BASE_URL = 'http://127.0.0.1:4317';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 15_000,
  expect: {
    timeout: 5_000
  },
  reporter: 'line',
  outputDir: 'test-results/playwright',
  use: {
    baseURL: LOOPBACK_BASE_URL,
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'npm run fixture:start',
    url: `${LOOPBACK_BASE_URL}/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      FIXTURE_HOST: '127.0.0.1',
      FIXTURE_PORT: '4317',
      FIXTURE_FAULT_MODE: 'none',
      FIXTURE_SLOW_MS: '150',
      FIXTURE_INTERMITTENT_EVERY: '3',
      FIXTURE_SHUTDOWN_DELAY_MS: '200'
    }
  }
});
