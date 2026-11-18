import { defineConfig } from '@playwright/test'

/*
  End-to-end UI tests (pnpm test:e2e). They drive the real site in Chrome —
  WebGL, GSAP, Lenis and React Router included — and fail on any console
  error or uncaught exception (see e2e/fixtures.ts).
*/
const PORT = 5179

export default defineConfig({
  testDir: 'e2e',
  // WebGL + long scroll scenes: generous per-test budget (includes closing the browser context)
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // the Chrome already installed on the machine (no browser download needed)
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // no video: recording at 1440×900 eats the CPU the WebGL scenes need (the trace has screenshots)
    video: 'off',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  // the production build (served statically, like the real deploy) with the ?map
  // test shortcut enabled via .env.e2e — lighter and steadier than the dev server
  webServer: {
    command: `pnpm exec vite build --mode e2e --outDir dist-e2e && pnpm exec vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
