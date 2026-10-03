import { defineConfig } from "@playwright/test";

/**
 * E2E runs against servers that are already up:
 *   backend  : http://127.0.0.1:8000 (uvicorn)
 *   frontend : http://localhost:3000 (next start)
 * Locally both are usually running; in CI the workflow starts them first
 * (no webServer block on purpose — the backend needs the Python venv).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
});
