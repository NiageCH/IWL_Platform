import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/**
 * El PDF del NDA firmado: el texto que se firmó y, en la última página, el
 * rastro de las dos firmas.
 *
 * El rastro es lo que hace que una firma electrónica simple sirva de algo:
 * quién firmó, con qué correo, cuándo —en hora de Madrid y en UTC, para que
 * no haya duda de zona—, desde qué IP y con qué navegador, sobre qué
 * versión del texto y con qué hash. El hash permite demostrar qué texto
 * exacto se firmó aunque la plantilla cambie después.
 *
 * Sin base de datos: recibe los datos y devuelve los bytes. Así se prueba
 * solo, y el rastro se puede leer sin abrir el PDF.
 */

export interface FirmaNda {
  nombre: string;
  correo: string | null;
  /** ISO */
  cuando: string;
  ip: string | null;
  navegador: string | null;
}

export interface DatosNda {
  candidatura: string;
  candidaturaId: string;
  texto: string;
  version: string | number;
  hash: string;
  ella: FirmaNda;
  iwl: FirmaNda;
  /** ISO, cuándo se genera el documento */
  generado: string;
}

function hora(iso: string, zona: "Europe/Madrid" | "UTC"): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: zona,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Las líneas del rastro, tal como salen en la última página */
export function lineasRastro(d: DatosNda): string[] {
  const firma = (rotulo: string, f: FirmaNda) => [
    rotulo,
    `  Nombre: ${f.nombre}`,
    `  Correo: ${f.correo ?? "—"}`,
    `  Fecha y hora (Madrid): ${hora(f.cuando, "Europe/Madrid")}`,
    `  Fecha y hora (UTC): ${hora(f.cuando, "UTC")}`,
    `  IP: ${f.ip ?? "—"}`,
    `  Navegador: ${f.navegador ?? "—"}`,
    "",
  ];
  return [
    `Candidatura: ${d.candidatura} (${d.candidaturaId})`,
    `Plantilla del NDA: versión ${d.version}`,
    `Hash SHA-256 del texto firmado: ${d.hash}`,
    "",
    ...firma("Firma de la candidata", d.ella),
    ...firma("Contrafirma de Inception Woman Lab", d.iwl),
    `Documento generado: ${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    "Firma electrónica simple, registrada por la plataforma de Inception Woman Lab.",
  ];
}

/**
 * Helvetica solo sabe dibujar el juego latino (WinAnsi): tildes, eñes,
 * comillas angulares, sí; un emoji o un ideograma, no, y pdf-lib lanza.
 * Lo que no sabe dibujar se cambia por «?» en vez de romper el documento.
 */
function apto(fuente: PDFFont, texto: string): string {
  let salida = "";
  for (const c of texto.replace(/\t/g, "    ")) {
    try {
      fuente.widthOfTextAtSize(c, 10);
      salida += c;
    } catch {
      salida += "?";
    }
  }
  return salida;
}

function partir(fuente: PDFFont, texto: string, tamano: number, ancho: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of texto.split(/\r?\n/)) {
    if (!parrafo.trim()) {
      lineas.push("");
      continue;
    }
    let actual = "";
    for (const palabra of parrafo.split(/\s+/)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tamano) > ancho && actual) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

export async function generarPdfNda(d: DatosNda): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`NDA · ${d.candidatura}`);
  pdf.setAuthor("Inception Woman Lab");
  pdf.setCreator("Plataforma IWL");

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const margen = 56;
  const ancho = A4[0] - margen * 2;
  const tinta = rgb(0.09, 0.09, 0.11);

  let pagina = pdf.addPage(A4);
  let y = A4[1] - margen;

  const escribir = (texto: string, fuente: PDFFont, tamano: number, interlineado = 1.45) => {
    for (const linea of partir(fuente, apto(fuente, texto), tamano, ancho)) {
      if (y < margen + tamano) {
        pagina = pdf.addPage(A4);
        y = A4[1] - margen;
      }
      pagina.drawText(linea, { x: margen, y, size: tamano, font: fuente, color: tinta });
      y -= tamano * interlineado;
    }
  };

  escribir("Acuerdo de confidencialidad (NDA)", negrita, 16);
  escribir(d.candidatura, normal, 11);
  y -= 8;
  escribir(d.texto, normal, 10);

  // El rastro, siempre en su propia página: la última
  pagina = pdf.addPage(A4);
  y = A4[1] - margen;
  escribir("Rastro de las firmas", negrita, 14);
  y -= 6;
  for (const linea of lineasRastro(d)) escribir(linea || " ", normal, 9.5, 1.5);

  return pdf.save();
}
