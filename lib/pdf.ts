import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/**
 * Un documento firmado, en PDF: el texto y, en la última página, el rastro
 * de las firmas. Lo comparten el NDA y el acta de comité.
 *
 * Sin base de datos: recibe el texto y las líneas del rastro y devuelve
 * los bytes. Lo que cada documento dice en su rastro lo decide su módulo.
 */

const MADRID = "Europe/Madrid";

/** Fecha y hora completas, en Madrid o en UTC, para que no haya duda de zona */
export function hora(iso: string, zona: "Europe/Madrid" | "UTC" = MADRID): string {
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

export interface FirmaNda {
  nombre: string;
  correo: string | null;
  /** ISO */
  cuando: string;
  ip: string | null;
  navegador: string | null;
}

/** Las líneas de una firma en el rastro: lo mismo para el NDA y para el acta */
export function lineasFirma(rotulo: string, f: FirmaNda): string[] {
  return [
    rotulo,
    `  Nombre: ${f.nombre}`,
    `  Correo: ${f.correo ?? "—"}`,
    `  Fecha y hora (Madrid): ${hora(f.cuando, "Europe/Madrid")}`,
    `  Fecha y hora (UTC): ${hora(f.cuando, "UTC")}`,
    `  IP: ${f.ip ?? "—"}`,
    `  Navegador: ${f.navegador ?? "—"}`,
    "",
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

export async function documentoFirmado(d: {
  titulo: string;
  subtitulo: string;
  texto: string;
  tituloRastro: string;
  rastro: string[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${d.titulo} · ${d.subtitulo}`);
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

  escribir(d.titulo, negrita, 16);
  escribir(d.subtitulo, normal, 11);
  y -= 8;
  escribir(d.texto, normal, 10);

  // El rastro, siempre en su propia página: la última
  pagina = pdf.addPage(A4);
  y = A4[1] - margen;
  escribir(d.tituloRastro, negrita, 14);
  y -= 6;
  for (const linea of d.rastro) escribir(linea || " ", normal, 9.5, 1.5);

  return pdf.save();
}
