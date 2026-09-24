import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de interfaz.
 *
 * Comprueban lo que ve cada persona en pantalla, no lo que devuelve la base:
 * eso ya lo cubren los tests de RLS. Criterio de aceptación §11: el
 * aislamiento se prueba con tests de RLS *y* de interfaz.
 *
 * Necesitan Supabase local levantado con los datos semilla.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // La vista de fundadora tiene que ser usable en móvil (§11)
      name: "movil",
      use: { ...devices["Pixel 7"] },
      testMatch: /movil\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/entrar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
