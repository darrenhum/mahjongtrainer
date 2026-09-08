import { defineConfig } from '@playwright/test';

const basePath = process.env.PLAYWRIGHT_BASE_PATH ?? '/mahjongtrainer/';
const normalizedBasePath = basePath === '/' ? '/' : `/${basePath.replace(/^\/|\/$/g, '')}/`;
const baseURL = `http://localhost:4173${normalizedBasePath}`;

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `python3 -m http.server 4173 --directory ${normalizedBasePath === '/' ? '.' : '..'}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
