import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  workers: 2,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    geolocation: { latitude: 35.8063, longitude: 137.2440 },
    permissions: ['geolocation'],
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node tools/serve.js',
    env: { PORT: '4173' },
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
