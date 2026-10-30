/**
 * Las secciones de navegación y el tono de su icono.
 *
 * Vive aquí y no junto a `<NavSecciones>` porque ese fichero es `"use
 * client"`, y **de un módulo de cliente no se puede llamar a una función
 * desde el servidor**: Next lo rechaza en ejecución, no al compilar, así
 * que la pantalla se cae con un error de servidor y el tipado no avisa.
 *
 * El mismo fichero ya documentaba esa frontera para los componentes. La
 * lección es que vale igual para una función suelta.
 */
export const NOMBRES_SECCION = [
  "cartera",
  "embudo",
  "comparativa",
  "administracion",
  "resumen",
  "ruta",
  "programa",
  "aportacion",
  "tecnico",
  "diligencia",
  "plan",
  "kpi",
  "companias",
  "personas",
  "evaluacion",
  "umbrales",
] as const;

export type NombreIcono = (typeof NOMBRES_SECCION)[number];

/*
 * Los iconos de sección iban en cuatro tonos decorativos —cielo, lila,
 * menta, durazno— para que una fila de ocho pestañas no fuera una fila de
 * ocho grises. Se retiraron el 30 de octubre, por decisión de Rodrigo: con
 * los cinco estados en pantalla, un color que no significa nada compite
 * justo con el que sí.
 *
 * No queda función que los devuelva. `.icono-seccion` ya cae al gris
 * secundario cuando nadie le pasa `--tono`, así que el icono va en gris sin
 * que nadie se lo diga.
 */
