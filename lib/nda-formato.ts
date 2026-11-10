/**
 * El formato del NDA: las marcas de la plantilla y lo que significan.
 *
 * La plantilla se escribe con una lista cerrada de marcas —título, rótulos
 * de sección, cláusulas numeradas, expositivos, listas, negrita y bloques de
 * firma— y este intérprete la convierte en piezas. Las mismas piezas pinta
 * el PDF y las pinta la pantalla en la que ella lee antes de firmar: un
 * solo intérprete, para que lo que ve y lo que firma coincidan.
 *
 * El formato solo cambia cómo se pinta. Lo firmado sigue siendo el texto
 * completado, con sus marcas, y el hash se calcula sobre ese texto.
 *
 * Ninguna marca usa corchetes: un corchete sigue siendo un hueco sin
 * rellenar, y con uno la plantilla no se envía.
 */

export interface Tramo {
  texto: string;
  negrita: boolean;
}

export type Pieza =
  | { tipo: "titulo"; texto: string }
  | { tipo: "seccion"; texto: string }
  | { tipo: "clausula"; numero: string; titulo: string }
  | { tipo: "parrafo"; tramos: Tramo[] }
  | { tipo: "expositivo"; numero: string; tramos: Tramo[] }
  | { tipo: "lista"; letra: string; tramos: Tramo[] }
  /** Uno o varios bloques de firma seguidos: van en columnas, de dos en dos */
  | { tipo: "firmas"; bloques: Tramo[][][] };

/** Las marcas, tal como se explican en la pantalla de la plantilla */
export const MARCAS: { marca: string; que: string }[] = [
  { marca: "# Título", que: "Título del documento. Uno solo, al principio" },
  { marca: "### REUNIDOS", que: "Rótulo de sección, sin número: REUNIDOS, EXPONEN, CLÁUSULAS, FIRMAS" },
  { marca: "## 01 TÍTULO", que: "Cláusula: el número cuelga a la izquierda y el título va en caja alta" },
  { marca: "I.  II.  III.", que: "Al principio de un párrafo: expositivo con su número romano colgado" },
  { marca: "a)  b)  c)", que: "Al principio de un párrafo: elemento de lista con sangría francesa" },
  { marca: "**texto**", que: "Negrita" },
  {
    marca: "::: firma … :::",
    que: "Un bloque de firma; cada línea de dentro es una línea del bloque. Dos seguidos van en dos columnas",
  },
  { marca: "Línea en blanco", que: "Separa los párrafos. Nada más: sin enlaces, sin imágenes, sin tablas" },
];

const TITULO = /^#\s+(.+)$/;
const SECCION = /^###\s+(.+)$/;
const CLAUSULA = /^##\s+(\d{1,3})\s+(.+)$/;
const ABRE_FIRMA = /^:::\s*firma\s*$/;
const CIERRA = /^:::\s*$/;
const EXPOSITIVO = /^([IVXLC]+)\.\s+/;
const LISTA = /^([a-z])\)\s+/;

/** La negrita dentro de un párrafo. Un `**` sin pareja se queda como texto */
export function tramos(texto: string): Tramo[] {
  const partes = texto.split("**");
  if (partes.length % 2 === 0) return [{ texto, negrita: false }];
  return partes
    .map((t, i) => ({ texto: t, negrita: i % 2 === 1 }))
    .filter((t) => t.texto.length > 0);
}

function parrafo(lineas: string[]): Pieza | null {
  const texto = lineas.map((l) => l.trim()).filter(Boolean).join(" ");
  // Un párrafo que se queda vacío —un bloque condicional que no tocaba— no existe
  if (!texto) return null;
  const romano = texto.match(EXPOSITIVO);
  if (romano) return { tipo: "expositivo", numero: `${romano[1]}.`, tramos: tramos(texto.slice(romano[0].length)) };
  const letra = texto.match(LISTA);
  if (letra) return { tipo: "lista", letra: `${letra[1]})`, tramos: tramos(texto.slice(letra[0].length)) };
  return { tipo: "parrafo", tramos: tramos(texto) };
}

/**
 * Las piezas de un texto. No falla nunca: una marca mal formada se pinta
 * como texto. Que no se pueda guardar así lo dice `erroresFormato`.
 */
export function interpretarNda(texto: string): Pieza[] {
  const piezas: Pieza[] = [];
  let pendiente: string[] = [];
  let firma: string[] | null = null;

  const soltar = () => {
    const p = parrafo(pendiente);
    pendiente = [];
    if (p) piezas.push(p);
  };
  const ponerFirma = (lineas: string[]) => {
    const bloque = lineas.map((l) => l.trim()).filter(Boolean).map(tramos);
    if (!bloque.length) return;
    const ultima = piezas[piezas.length - 1];
    if (ultima?.tipo === "firmas") ultima.bloques.push(bloque);
    else piezas.push({ tipo: "firmas", bloques: [bloque] });
  };

  for (const cruda of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const linea = cruda.trim();
    if (firma) {
      if (CIERRA.test(linea)) {
        ponerFirma(firma);
        firma = null;
      } else {
        firma.push(linea);
      }
      continue;
    }
    if (!linea) {
      soltar();
      continue;
    }
    if (ABRE_FIRMA.test(linea)) {
      soltar();
      firma = [];
      continue;
    }
    const seccion = linea.match(SECCION);
    const clausula = linea.match(CLAUSULA);
    const titulo = linea.match(TITULO);
    if (seccion || clausula || titulo) {
      soltar();
      if (seccion) piezas.push({ tipo: "seccion", texto: seccion[1].trim() });
      else if (clausula) piezas.push({ tipo: "clausula", numero: clausula[1], titulo: clausula[2].trim() });
      else if (titulo) piezas.push({ tipo: "titulo", texto: titulo[1].trim() });
      continue;
    }
    pendiente.push(linea);
  }
  if (firma) ponerFirma(firma);
  soltar();
  return piezas;
}

/** El título del documento, si lo tiene: va en la cabecera del PDF */
export function tituloDe(piezas: Pieza[]): string | null {
  const t = piezas.find((p) => p.tipo === "titulo");
  return t && t.tipo === "titulo" ? t.texto : null;
}

const recorte = (l: string) => (l.length > 50 ? `${l.slice(0, 50)}…` : l);

/**
 * Lo que no vale del formato de una plantilla. Vacío si se puede guardar.
 * Se mira sobre la plantilla, con sus marcadores todavía sin rellenar: las
 * marcas no dependen de los datos de nadie.
 */
export function erroresFormato(texto: string): string[] {
  const errores: string[] = [];
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  let titulos = 0;
  let primera = true;
  let abierta = false;
  let parrafoActual: string[] = [];

  const cerrarParrafo = () => {
    const p = parrafoActual.join(" ");
    parrafoActual = [];
    if ((p.match(/\*\*/g) ?? []).length % 2 === 1) {
      errores.push(`Una negrita «**» sin cerrar en «${recorte(p)}»`);
    }
  };

  for (const l of lineas) {
    if (abierta) {
      if (CIERRA.test(l)) abierta = false;
      else if (l.startsWith(":::")) errores.push(`Un bloque «::: firma» se abre dentro de otro: ciérralo antes con «:::»`);
      else if ((l.match(/\*\*/g) ?? []).length % 2 === 1) errores.push(`Una negrita «**» sin cerrar en «${recorte(l)}»`);
      continue;
    }
    if (!l) {
      cerrarParrafo();
      continue;
    }
    if (l.startsWith(":::")) {
      cerrarParrafo();
      if (ABRE_FIRMA.test(l)) abierta = true;
      else if (CIERRA.test(l)) errores.push("Un «:::» cierra un bloque de firma que no estaba abierto");
      else errores.push(`«${recorte(l)}» no es un bloque que la plataforma conozca: el único es «::: firma»`);
      primera = false;
      continue;
    }
    if (l.startsWith("#")) {
      cerrarParrafo();
      if (/^#{4,}/.test(l)) {
        errores.push(`«${recorte(l)}»: con cuatro «#» o más no es una marca. Una sección lleva «###», una cláusula «##» y el título «#»`);
      } else if (!/^#{1,3}\s/.test(l)) {
        errores.push(`«${recorte(l)}»: después de las «#» va un espacio`);
      } else if (TITULO.test(l)) {
        titulos++;
        if (titulos === 2) errores.push("Hay más de un título «# …»: el documento lleva uno solo, al principio");
        else if (!primera) errores.push("El título «# …» va al principio del documento");
      } else if (/^##\s/.test(l) && !CLAUSULA.test(l)) {
        errores.push(`«${recorte(l)}»: una cláusula lleva su número, así: «## 01 TÍTULO»`);
      }
      primera = false;
      continue;
    }
    if (l.startsWith("|")) {
      errores.push(`«${recorte(l)}»: las tablas no se pueden usar. Para las firmas, «::: firma»`);
    }
    parrafoActual.push(l);
    primera = false;
  }
  cerrarParrafo();
  if (abierta) errores.push("Falta cerrar un «::: firma» con «:::»");
  return [...new Set(errores)];
}

/**
 * Si la plantilla no lleva marcas, no es una plantilla con formato: es el
 * texto copiado de una vista que ya lo pintaba. La versión 4 se guardó así
 * —sin un «#» ni una línea en blanco— y el PDF salió en un bloque corrido
 * sin que nada lo dijera (REVISION, 10 nov). Se mira al guardar.
 */
export function faltanMarcas(texto: string): string | null {
  const lineas = texto.replace(/\r\n?/g, "\n").trim().split("\n");
  const empieza = /^#\s/.test(lineas[0] ?? "");
  const clausulas = lineas.some((l) => /^##\s/.test(l.trim()));
  if (empieza && clausulas) return null;
  return "La plantilla no lleva las marcas de formato (# título, ## cláusulas). Cópiala desde el fichero .md abierto como texto, no desde una vista previa.";
}
