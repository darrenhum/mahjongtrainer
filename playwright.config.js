import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173/mahjongtrainer/',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'python3 -m http.server 4173 --directory ..',
    url: 'http://localhost:4173/mahjongtrainer/',
    reuseExistingServer: !process.env.CI,
  },
});
