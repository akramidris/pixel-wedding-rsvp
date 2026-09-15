import { defineConfig } from '@playwright/test';
const production = process.env.TEST_PRODUCTION === '1';
const path = production ? process.env.PAGES_BASE_PATH || '/' : '/';
const baseURL = production ? `http://127.0.0.1:4175${path}` : 'http://127.0.0.1:5173/';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  // Rendering and touch tests share the GPU; serial workers avoid WebGL contention.
  workers: 1,
  timeout: 60000,
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 1080 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Only the isolated development test server receives a fake backend URL.
    // HTTP fixtures intercept it; no test identity is baked into deployment.
    env: production
      ? undefined
      : {
          VITE_SUPABASE_URL: 'https://wedding.test.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_fixture_not_a_real_key',
        },
    command: production
      ? 'npm run preview -- --port 4175 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
});
