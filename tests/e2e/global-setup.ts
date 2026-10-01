import { desarchivarCompanias } from "../preparar-base";

/**
 * Arranque de las pruebas de interfaz.
 *
 * Una sola cosa: desarchivar las compañías de demostración. Una instalación
 * de trabajo las archiva desde su seed local y las pruebas se apoyan en
 * ellas; el porqué está en `tests/preparar-base.ts`.
 *
 * Aquí hubo durante un tiempo un calentamiento que abría un navegador,
 * entraba y visitaba veintitantas rutas antes de empezar. Existía porque
 * `next dev` compila cada página la primera vez que alguien la pide, y esa
 * espera se la comía la primera prueba que tocara cada ruta.
 *
 * Ya no hace falta: las pruebas corren contra una compilación de
 * producción, donde no hay nada que compilar sobre la marcha. Quitar la
 * causa salió más barato que seguir sosteniendo el remedio, que además
 * había que acordarse de ampliar cada vez que aparecía una ruta nueva.
 */
export default async function prepararBase() {
  await desarchivarCompanias();
}
