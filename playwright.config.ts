import { defineConfig } from '@playwright/test';
const production = process.env.TEST_PRODUCTION === '1';
const path = production ? process.env.PAGES_BASE_PATH || '/' : '/';
const baseURL = production ? `http://127.0.0.1:4175${path}` : 'http://127.0.0.1:5173/';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 60000,
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 1080 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: production
      ? 'npm run preview -- --port 4175 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: !production && !process.env.CI,
  },
});
