import { defineConfig, devices } from '@playwright/test'

// E2E tests run the real app (nuxt dev) against its own throwaway database
// (data/e2e.db), seeded by e2e/global-setup.ts — they never touch your leads.
//
// The browser Maps key in .env is restricted to http://localhost:3000/*, so
// the suite uses port 3000: stop your own `npm run dev` first.
//
// Tests tagged @live call the real Google Places / Geocoding / Gemini APIs
// with the keys in .env and count against the free quotas (a full run uses
// 1 Nearby Search, 2 Geocoding calls and 1–2 Gemini generations).
//   npm run test:e2e           everything
//   npm run test:e2e:offline   skip @live
const PORT = 3000

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Language/time-zone behaviour only, from an English browser in New
      // York. Runs first, on the untouched seed data.
      name: 'en-new-york',
      use: { ...devices['Desktop Chrome'], locale: 'en-US', timezoneId: 'America/New_York', colorScheme: 'dark' },
      grep: /@i18n/,
    },
    {
      name: 'tr-istanbul',
      use: { ...devices['Desktop Chrome'], locale: 'tr-TR', timezoneId: 'Europe/Istanbul', colorScheme: 'light' },
      dependencies: ['en-new-york'],
    },
  ],
  webServer: {
    command: `npx nuxt dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_PATH: 'data/e2e.db', NUXT_DEVTOOLS: 'false' },
  },
})
