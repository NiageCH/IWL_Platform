/**
 * Los datos de la sociedad, en un solo sitio: el membrete de cada documento
 * los lee de aquí. Son los del registro mercantil, públicos.
 */
export const SOCIEDAD = {
  nombre: "Inception Woman Lab, S.L.",
  nif: "B27646559",
  domicilio: "Ancha del Carmen 32, 29002 Málaga",
} as const;

/** La línea del membrete, bajo la marca en la primera página */
export const MEMBRETE = `${SOCIEDAD.nombre.toUpperCase()} · NIF ${SOCIEDAD.nif} · ${SOCIEDAD.domicilio}`;
