import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:8788',
    /* 既存テストは日本語UIを前提とするため、ブラウザ言語を日本語に固定する */
    locale: 'ja-JP',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: !process.env.CI,
  },
})
