import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './scripts',
  testMatch: ['verificar-csp.ts'],
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: { headless: true },
})
