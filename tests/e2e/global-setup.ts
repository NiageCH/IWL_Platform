import { chromium } from "@playwright/test";
import { desarchivarCompanias } from "../preparar-base";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Arranque de las pruebas de interfaz.
 *
 * Dos cosas antes de empezar.
 *
 * Una, desarchivar las compañías de demostración: una instalación de trabajo
 * las archiva desde su seed local y las pruebas se apoyan en ellas. El
 * porqué está en `tests/preparar-base.ts`.
 *
 * Y dos, visitar las páginas principales una vez. En desarrollo Next las
 * compila la primera vez que alguien las pide, y esa espera se la comía la
 * primera prueba que tocara cada ruta: fallaba una de cada varias pasadas,
 * siempre en un sitio distinto, y nunca al ejecutarla en aislamiento. No es
 * un problema del producto —en producción está todo compilado— pero sí de
 * unas pruebas que no se pueden creer.
 *
 * **Y hay que visitarlas con sesión.** La primera versión de esto las pedía
 * con un `fetch` sin cookies: todas devolvían la redirección a `/entrar` y
 * la página de verdad no llegaba a compilarse nunca. Parecía que calentaba y
 * no calentaba nada; los plantones de treinta segundos siguieron saliendo,
 * solo que más de tarde en tarde y por eso más difíciles de atribuir.
 */
const RUTAS = [
  "/cartera",
  "/embudo",
  "/embudo/00000000-0000-0000-0005-000000000001",
  "/comparativa",
  "/admin/companias",
  "/admin/personas",
  "/admin/rutas",
  "/admin/evaluacion",
  "/admin/programa",
  "/perfil",
  "/cartera/marea-clinica",
  "/cartera/marea-clinica/tecnico",
  "/cartera/marea-clinica/diligencia",
  "/cartera/marea-clinica/plan",
  "/cartera/marea-clinica/kpi",
  "/cartera/marea-clinica/ruta",
  "/cartera/marea-clinica/programa",
  "/cartera/marea-clinica/aportacion",
];

/** Las de la compañía, que son otro grupo de rutas y otro layout */
const RUTAS_FUNDADORA = [
  "/proyecto",
  "/proyecto/tecnico",
  "/proyecto/diligencia",
  "/proyecto/plan",
  "/proyecto/kpi",
  "/proyecto/ruta",
  "/proyecto/programa",
  "/proyecto/aportacion",
];

export default async function prepararBase() {
  await desarchivarCompanias();

  const base = process.env.BASE_URL ?? "http://localhost:3000";

  // Las que no necesitan sesión: la entrada y el formulario de candidatura
  for (const ruta of ["/entrar", "/presentarse"]) {
    await fetch(`${base}${ruta}`, { redirect: "manual" }).catch(
      () => undefined,
    );
  }

  const navegador = await chromium.launch();

  try {
    for (const [usuario, rutas] of [
      [USUARIOS.admin, RUTAS],
      [USUARIOS.fundadoraMarea, RUTAS_FUNDADORA],
    ] as const) {
      const contexto = await navegador.newContext({ baseURL: base });
      const pagina = await contexto.newPage();

      await entrarComo(pagina, usuario, "/");

      /*
       * De una en una, no en paralelo: pedirlas todas a la vez pone a Next a
       * compilar quince páginas al mismo tiempo y tarda más que en fila.
       */
      for (const ruta of rutas) {
        await pagina
          .goto(ruta, { waitUntil: "domcontentloaded", timeout: 120_000 })
          .catch(() => undefined);
      }

      await contexto.close();
    }
  } finally {
    await navegador.close();
  }
}
