/**
 * La guía de cada rol (REVISION, 13 nov). El texto vive en
 * `contenido/guia/<fichero>.md`, para corregirlo sin tocar código; aquí,
 * qué fichero toca a cada rol y cómo se lee.
 *
 * Se lee un Markdown corto a propósito —títulos, párrafos, listas,
 * negrita, código y enlaces—, sin librería: es todo lo que la guía
 * necesita, y se pinta con componentes nuestros, no con HTML a pelo.
 */

export const FICHERO_GUIA: Record<string, string> = {
  admin_iwl: "direccion",
  equipo_iwl: "equipo",
  mentor: "mentor",
  revisor_niage: "revisor",
  fundadora: "fundadora",
  lector_externo: "lector",
  candidata: "candidata",
};

export type Trozo =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; texto: string }
  | { tipo: "codigo"; texto: string }
  | { tipo: "enlace"; texto: string; href: string };

export type BloqueGuia =
  | { tipo: "titulo"; nivel: 1 | 2 | 3; texto: string }
  | { tipo: "parrafo"; trozos: Trozo[] }
  | { tipo: "lista"; ordenada: boolean; items: Trozo[][] };

/** Negrita, código y enlaces, en una línea */
export function leerLinea(linea: string): Trozo[] {
  const trozos: Trozo[] = [];
  const patron = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let desde = 0;
  for (const m of linea.matchAll(patron)) {
    if (m.index > desde) trozos.push({ tipo: "texto", texto: linea.slice(desde, m.index) });
    if (m[1] !== undefined) trozos.push({ tipo: "negrita", texto: m[1] });
    else if (m[2] !== undefined) trozos.push({ tipo: "codigo", texto: m[2] });
    else trozos.push({ tipo: "enlace", texto: m[3], href: m[4] });
    desde = m.index + m[0].length;
  }
  if (desde < linea.length) trozos.push({ tipo: "texto", texto: linea.slice(desde) });
  return trozos;
}

export function leerGuia(md: string): BloqueGuia[] {
  const bloques: BloqueGuia[] = [];
  let parrafo: string[] = [];
  let lista: { ordenada: boolean; items: string[] } | null = null;

  const cerrar = () => {
    if (parrafo.length) bloques.push({ tipo: "parrafo", trozos: leerLinea(parrafo.join(" ")) });
    if (lista) bloques.push({ tipo: "lista", ordenada: lista.ordenada, items: lista.items.map(leerLinea) });
    parrafo = [];
    lista = null;
  };

  for (const cruda of md.replace(/\r\n/g, "\n").split("\n")) {
    const linea = cruda.trimEnd();
    const titulo = /^(#{1,3})\s+(.*)$/.exec(linea);
    const vineta = /^\s*[-*]\s+(.*)$/.exec(linea);
    const numero = /^\s*\d+\.\s+(.*)$/.exec(linea);

    if (!linea.trim()) {
      cerrar();
    } else if (titulo) {
      cerrar();
      bloques.push({ tipo: "titulo", nivel: titulo[1].length as 1 | 2 | 3, texto: titulo[2].trim() });
    } else if (vineta || numero) {
      const ordenada = Boolean(numero);
      if (parrafo.length || (lista && lista.ordenada !== ordenada)) cerrar();
      lista ??= { ordenada, items: [] };
      lista.items.push((vineta ?? numero)![1]);
    } else if (lista && /^\s+\S/.test(cruda)) {
      // La continuación de un punto, sangrada
      lista.items[lista.items.length - 1] += ` ${linea.trim()}`;
    } else {
      if (lista) cerrar();
      parrafo.push(linea.trim());
    }
  }
  cerrar();
  return bloques;
}
