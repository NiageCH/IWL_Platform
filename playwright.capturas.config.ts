/**
 * Las capturas para revisar una propuesta, no pruebas (REVISION, 20 y 23
 * nov): `npx playwright test -c playwright.capturas.config.ts`. Dejan las
 * imágenes en `docs/constancia/`. Mismo servidor que la suite de interfaz.
 */
import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/capturas",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  // En castellano: si no, los campos de fecha salen como 04/30/2027
  use: {
    baseURL: BASE,
    navigationTimeout: 30_000,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    launchOptions: { args: ["--lang=es-ES"] },
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start --port ${new URL(BASE).port || 3100}`,
    url: `${BASE}/entrar`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
