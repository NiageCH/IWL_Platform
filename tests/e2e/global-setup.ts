import { desarchivarCompanias } from "../preparar-base";

/**
 * Arranque de las pruebas de interfaz.
 *
 * Comparte con las de RLS la preparación de la base: las dos se apoyan en
 * las compañías de demostración, que una instalación de trabajo archiva
 * desde su seed local. El porqué está en `tests/preparar-base.ts`.
 */
export default function prepararBase() {
  return desarchivarCompanias();
}
