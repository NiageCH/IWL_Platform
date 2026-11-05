/** Dónde escuchan las pruebas. No es 3000: ahí vive `npm run dev` */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";

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
  /*
   * Una instalación de trabajo archiva las compañías de demostración desde su
   * seed local. Las pruebas se apoyan en ellas, así que las desarchivan antes
   * de empezar.
   */
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  /*
   * Dos motores, y los dos son principales.
   *
   * Rodrigo revisa en Safari y las fundadoras entran desde Mac y desde
   * iPhone. Durante un tiempo la suite solo corrió en Chromium, y eso
   * convirtió a Safari en un sitio donde los fallos se descubren
   * mirando: cuatro síntomas de una revisión no se reproducían aquí
   * porque aquí no se miraba.
   *
   * WebKit es el motor de Safari. No es Safari —no comparte su caché ni
   * sus extensiones— pero sí su maquetación y su CSS, que es donde
   * aparecen estas diferencias.
   */
  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "escritorio-safari",
      use: { ...devices["Desktop Safari"] },
    },
    {
      // La vista de fundadora tiene que ser usable en móvil (§11)
      name: "movil",
      use: { ...devices["Pixel 7"] },
      testMatch: /movil\.spec\.ts/,
    },
    {
      // Y en iPhone, que es desde donde van a entrar la mitad
      name: "movil-safari",
      use: { ...devices["iPhone 14"] },
      testMatch: /movil\.spec\.ts/,
    },
  ],
  /*
   * Las pruebas corren contra una compilación de producción, en su propio
   * puerto, y nunca contra `next dev`.
   *
   * Con el servidor de desarrollo pasaban dos cosas, las dos malas. Una,
   * que Next compila cada página la primera vez que alguien la pide, y esa
   * espera se la comía la primera prueba que tocara cada ruta: hacía falta
   * un calentamiento que visitara veintitantas rutas con sesión antes de
   * empezar. Y dos, que un `next dev` de varias horas se degrada: la misma
   * suite pasaba de 2,5 a 9 minutos y empezaba a fallar en sitios distintos
   * en cada pasada, siempre apuntando a lo último que se hubiera tocado.
   *
   * Contra una compilación no hay nada que compilar sobre la marcha ni
   * estado que se ensucie, y además se prueba lo que de verdad se publica.
   * Cuesta una compilación —unos cuarenta segundos— al empezar.
   *
   * En su propio puerto para no pelearse con el `npm run dev` que suele
   * estar abierto mientras se trabaja.
   */
  webServer: {
    // El puerto sale de BASE_URL: dos copias de trabajo pueden probar a la vez
    command: `npm run build && npx next start --port ${new URL(BASE).port || 3100}`,
    url: `${BASE}/entrar`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
