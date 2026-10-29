/**
 * Compañías que cambiaron de identificador.
 *
 * El identificador va en la dirección, así que renombrar una compañía rompe
 * todo enlace que alguien tenga guardado: un marcador, un correo con el
 * enlace a su ficha, un documento que la cita. Quien lo abra se encontraría
 * un 404 —que es lo que devuelve el cerrojo de la ficha cuando no reconoce
 * el identificador— y no tendría manera de adivinar el nombre nuevo.
 *
 * El viejo se queda apuntado aquí y el proxy lleva de uno al otro
 * conservando la subpágina, así que `/cartera/roster/tecnico` acaba en
 * `/cartera/siren/tecnico` y no en la portada.
 *
 * Vive en código y no en la base porque son renombrados puntuales y
 * decididos: si algún día son muchos, su sitio es una columna.
 */
export const RENOMBRES: Record<string, string> = {
  "terral-barria": "la-pepi",
  roster: "siren",
};

/**
 * La dirección a la que lleva una ruta de compañía con el identificador
 * viejo, o `null` si no hay nada que redirigir.
 */
export function rutaRenombrada(ruta: string): string | null {
  const partes = ruta.split("/");

  // ["", "cartera", "<slug>", ...resto]
  if (partes[1] !== "cartera" || !partes[2]) return null;

  const nuevo = RENOMBRES[partes[2]];
  if (!nuevo) return null;

  partes[2] = nuevo;
  return partes.join("/");
}
