import { desarchivarCompanias } from "../preparar-base";

/**
 * Arranque de las pruebas de interfaz.
 *
 * Dos cosas antes de empezar.
 *
 * Una, desarchivar las compañías de demostración: una instalación de trabajo
 * las archiva desde su seed local y las pruebas se apoyan en ellas. El
 * porqué está en `tests/preparar-base.ts`.
 *
 * Y dos, pedir las páginas principales una vez. En desarrollo Next las
 * compila la primera vez que alguien las visita, y esa espera se la comía la
 * primera prueba que tocara cada ruta: fallaba una de cada varias pasadas,
 * siempre en un sitio distinto, y nunca al ejecutarla en aislamiento. No es
 * un problema del producto —en producción está todo compilado— pero sí de
 * unas pruebas que no se pueden creer.
 */
const RUTAS = [
  "/entrar",
  "/cartera",
  "/comparativa",
  "/proyecto",
  "/admin/companias",
  "/admin/personas",
  "/admin/rutas",
  "/admin/evaluacion",
  "/admin/programa",
  "/perfil",
];

export default async function prepararBase() {
  await desarchivarCompanias();

  const base = process.env.BASE_URL ?? "http://localhost:3000";

  /*
   * De una en una, no en paralelo: pedirlas todas a la vez pone a Next a
   * compilar diez páginas al mismo tiempo y tarda más que hacerlo en fila.
   *
   * Sin sesión devuelven una redirección, y da igual: lo que importa es que
   * queden compiladas antes de que empiece la primera prueba.
   */
  for (const ruta of RUTAS) {
    await fetch(`${base}${ruta}`, { redirect: "manual" }).catch(
      () => undefined,
    );
  }
}
