import { defineConfig } from '@playwright/test';

const supabasePort = 54329;
const appPort = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${appPort}`,
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/mock-supabase.cjs',
      url: `http://localhost:${supabasePort}/auth/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${appPort}`,
      url: `http://localhost:${appPort}/forgot-password`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${supabasePort}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'pw-test-anon-key',
        PW_E2E: '1',
      },
    },
  ],
});
