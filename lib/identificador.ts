/**
 * El identificador de una compañía en la plataforma, y su web.
 *
 * Son dos cosas distintas que el formulario de firma pedía en un solo
 * campo, rotulado «Dirección web». Rodrigo escribió `siren.es` —que es lo
 * que cualquiera entiende por dirección web— y el formulario lo rechazó
 * sin decir por qué. El identificador no se le pide a nadie: sale del
 * nombre. La web es otro campo y acepta como se escriba.
 *
 * Funciones puras: las usan la acción y el formulario, y se prueban solas.
 */

/** Lo que admite la base como identificador: minúsculas, números y guiones */
export const FORMA_IDENTIFICADOR = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * El identificador que sale de un nombre: «Siren» → `siren`,
 * «La Pepi, S.L.» → `la-pepi-s-l`, «Ñandú Óptica» → `nandu-optica`.
 */
export function identificadorDe(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * El primero libre: `siren`, y si está cogido `siren-2`, `siren-3`…
 *
 * Se resuelve aquí y no dejando que la base falle por el índice único,
 * porque ese fallo llega como «Ya existe un registro para ese valor», que
 * no dice qué valor ni qué hacer.
 */
export function primeroLibre(base: string, ocupados: Iterable<string>): string {
  const cogidos = new Set(ocupados);
  if (!cogidos.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base}-${n}`;
    if (!cogidos.has(candidato)) return candidato;
  }
}

/**
 * La web como se escriba —`siren.es`, `www.siren.es`, `https://siren.es/`—
 * se guarda como dirección completa: `https://siren.es`.
 *
 * Devuelve `null` si está vacía y lanza si no es una web, con el mensaje
 * que se enseña debajo del campo.
 */
export function normalizarWeb(texto: string | null | undefined): string | null {
  const limpio = (texto ?? "").trim();
  if (!limpio) return null;

  const conEsquema = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    throw new Error("Eso no parece una web. Escríbela como siren.es o www.siren.es.");
  }

  // Un dominio de verdad lleva al menos un punto: `siren` a secas es un error de tecleo
  if (!url.hostname.includes(".") || /\s/.test(limpio)) {
    throw new Error("Eso no parece una web. Escríbela como siren.es o www.siren.es.");
  }

  const ruta = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.hostname.toLowerCase()}${ruta}${url.search}`;
}
