import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { hora, lineasFirma, type FirmaNda } from "@/lib/pdf";
import { interpretarNda, tituloDe, type Pieza, type Tramo } from "@/lib/nda-formato";

export { lineasFirma, type FirmaNda };

/**
 * El PDF del NDA firmado, con el diseño de documentos de IWL: el texto que
 * se firmó, pintado según sus marcas, y en la última página el registro de
 * las dos firmas.
 *
 * El registro es lo que hace que una firma electrónica simple sirva de
 * algo: quién firmó, con qué correo, cuándo —en hora de Madrid y en UTC,
 * para que no haya duda de zona—, desde qué IP y con qué navegador, sobre
 * qué versión del texto y con qué hash. El hash permite demostrar qué texto
 * exacto se firmó aunque la plantilla cambie después.
 *
 * Sin base de datos: recibe los datos y devuelve los bytes. Así se prueba
 * solo, y el registro se puede leer sin abrir el PDF (`lineasRastro`).
 *
 * Las fuentes van incrustadas desde `lib/fuentes/` (licencia OFL): con las
 * estándar de PDF el documento no se parecía al resto de los de IWL.
 */

export interface DatosNda {
  candidatura: string;
  candidaturaId: string;
  /** El texto completado, con sus marcas: el que se firmó */
  texto: string;
  version: string | number;
  /** El hash del texto que firmaron las dos partes: el mismo */
  hash: string;
  ella: FirmaNda;
  iwl: FirmaNda;
  /** ISO, cuándo se genera el documento */
  generado: string;
}

// -----------------------------------------------------------------------------
// El registro de firmas
// -----------------------------------------------------------------------------

type Dato =
  | { tipo: "dato"; etiqueta: string; valor: string; mono?: boolean }
  | { tipo: "firmante"; rotulo: string; firma: FirmaNda }
  | { tipo: "nota"; texto: string };

/** La última de las dos firmas, que da la fecha de efecto */
function ultimaFirma(d: DatosNda): string {
  return new Date(d.ella.cuando) > new Date(d.iwl.cuando) ? d.ella.cuando : d.iwl.cuando;
}

function registro(d: DatosNda): Dato[] {
  return [
    { tipo: "dato", etiqueta: "Candidatura", valor: `${d.candidatura} (${d.candidaturaId})` },
    { tipo: "dato", etiqueta: "Plantilla del NDA", valor: `versión ${d.version}` },
    { tipo: "dato", etiqueta: "Hash SHA-256 del texto firmado por las dos partes", valor: d.hash, mono: true },
    // La fecha de efecto es la de la última firma: aquí, no en el texto
    {
      tipo: "dato",
      etiqueta: "Fecha de efecto, la de la última firma",
      valor: `${hora(ultimaFirma(d), "Europe/Madrid")} (Madrid)`,
    },
    { tipo: "firmante", rotulo: "Firma de la candidata", firma: d.ella },
    { tipo: "firmante", rotulo: "Contrafirma de Inception Woman Lab", firma: d.iwl },
    {
      tipo: "dato",
      etiqueta: "Documento generado",
      valor: `${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    },
    { tipo: "nota", texto: "Firma electrónica simple, registrada por la plataforma de Inception Woman Lab." },
  ];
}

/** Las líneas del registro, en texto: lo mismo que pinta la última página */
export function lineasRastro(d: DatosNda): string[] {
  return registro(d).flatMap((r) => {
    if (r.tipo === "dato") return [`${r.etiqueta}: ${r.valor}`];
    if (r.tipo === "firmante") return ["", ...lineasFirma(r.rotulo, r.firma)];
    return [r.texto];
  });
}

// -----------------------------------------------------------------------------
// El diseño
// -----------------------------------------------------------------------------

const MM = 72 / 25.4;
const A4: [number, number] = [595.28, 841.89];
const SUP = 20 * MM;
const INF = 20 * MM;
const IZQ = 28 * MM;
const DER = 20 * MM;
const ANCHO = A4[0] - IZQ - DER;

const color = (hex: string): RGB =>
  rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const TINTA = color("#18181B");
const GRIS = color("#71717A");
const MAGENTA = color("#FF007A");
const FILETE = color("#E4E4E7");

const CUERPO = 11;
const INTERLINEA = 16.5;

interface Fuentes {
  normal: PDFFont;
  semi: PDFFont;
  negrita: PDFFont;
  mono: PDFFont;
}

const FICHEROS = {
  normal: "Montserrat-Regular.ttf",
  semi: "Montserrat-SemiBold.ttf",
  negrita: "Montserrat-Bold.ttf",
  mono: "RobotoMono-Regular.ttf",
} as const;

let bytesFuentes: Promise<Record<keyof Fuentes, Buffer>> | null = null;

/** Se leen una vez por proceso; `next.config` las incluye en el despliegue */
function leerFuentes() {
  bytesFuentes ??= (async () => {
    const dir = path.join(process.cwd(), "lib", "fuentes");
    const entradas = await Promise.all(
      Object.entries(FICHEROS).map(async ([k, f]) => [k, await readFile(path.join(dir, f))] as const),
    );
    return Object.fromEntries(entradas) as Record<keyof Fuentes, Buffer>;
  })();
  return bytesFuentes;
}

/**
 * Lo que la fuente no sabe dibujar —un emoji, un ideograma— se cambia por
 * «?»: con una fuente incrustada no lanza, dibuja un cuadro vacío, y un
 * cuadro en un documento firmado no dice qué había.
 */
function apto(fuente: PDFFont, texto: string): string {
  const juego = new Set(fuente.getCharacterSet());
  let salida = "";
  for (const c of texto.replace(/\t/g, " ")) salida += juego.has(c.codePointAt(0)!) ? c : "?";
  return salida;
}

interface Trozo {
  texto: string;
  fuente: PDFFont;
  color: RGB;
  tamano: number;
}

/** Parte unos tramos en líneas que caben en `ancho`, sin partir palabras */
function envolver(trozos: Trozo[], ancho: number): Trozo[][] {
  const lineas: Trozo[][] = [];
  let linea: Trozo[] = [];
  let ocupado = 0;
  for (const t of trozos) {
    for (const pieza of apto(t.fuente, t.texto).split(/(\s+)/)) {
      if (!pieza) continue;
      const espacio = /^\s+$/.test(pieza);
      const texto = espacio ? " " : pieza;
      const w = t.fuente.widthOfTextAtSize(texto, t.tamano);
      if (espacio) {
        if (!linea.length) continue;
      } else if (ocupado + w > ancho && linea.length) {
        // El espacio del final de la línea no cuenta
        while (linea.length && linea[linea.length - 1].texto === " ") linea.pop();
        lineas.push(linea);
        linea = [];
        ocupado = 0;
      }
      linea.push({ ...t, texto });
      ocupado += w;
    }
  }
  while (linea.length && linea[linea.length - 1].texto === " ") linea.pop();
  if (linea.length) lineas.push(linea);
  return lineas;
}

class Maqueta {
  paginas: PDFPage[] = [];
  pagina!: PDFPage;
  y = 0;

  constructor(
    private pdf: PDFDocument,
    private f: Fuentes,
  ) {
    this.nueva();
  }

  nueva() {
    this.pagina = this.pdf.addPage(A4);
    this.paginas.push(this.pagina);
    this.y = A4[1] - SUP;
  }

  /** Que quepa `alto` en lo que queda de página; si no, a la siguiente */
  asegurar(alto: number) {
    if (this.y - alto < INF) this.nueva();
  }

  espacio(alto: number) {
    // Al principio de una página, el espacio de antes sobra
    if (this.y < A4[1] - SUP) this.y -= alto;
  }

  trozos(tramos: Tramo[], base: Partial<Trozo> = {}): Trozo[] {
    return tramos.map((t) => ({
      texto: t.texto,
      fuente: t.negrita ? this.f.negrita : this.f.normal,
      color: TINTA,
      tamano: CUERPO,
      ...base,
    }));
  }

  dibujarLinea(linea: Trozo[], x: number, base: number) {
    let cx = x;
    for (const t of linea) {
      this.pagina.drawText(t.texto, { x: cx, y: base, size: t.tamano, font: t.fuente, color: t.color });
      cx += t.fuente.widthOfTextAtSize(t.texto, t.tamano);
    }
  }

  /** Texto con espaciado entre letras, que pdf-lib no hace solo */
  espaciado(texto: string, x: number, base: number, fuente: PDFFont, tamano: number, c: RGB, tracking: number) {
    let cx = x;
    for (const ch of apto(fuente, texto)) {
      this.pagina.drawText(ch, { x: cx, y: base, size: tamano, font: fuente, color: c });
      cx += fuente.widthOfTextAtSize(ch, tamano) + tracking * tamano;
    }
  }

  /** Un párrafo, con su sangría y, si lo lleva, lo que cuelga a la izquierda */
  parrafo(trozos: Trozo[], sangria = 0, colgado?: { texto: string; x: number }, interlinea = INTERLINEA) {
    const lineas = envolver(trozos, ANCHO - sangria);
    lineas.forEach((l, i) => {
      // Que la primera línea no se quede sola al pie
      this.asegurar(i === 0 && lineas.length > 1 ? interlinea * 2 : interlinea);
      const base = this.y - CUERPO;
      if (i === 0 && colgado) {
        this.dibujarLinea([{ texto: colgado.texto, fuente: this.f.normal, color: TINTA, tamano: CUERPO }], colgado.x, base);
      }
      this.dibujarLinea(l, IZQ + sangria, base);
      this.y -= interlinea;
    });
  }

  pieza(p: Pieza) {
    const f = this.f;
    switch (p.tipo) {
      case "titulo": {
        const lineas = envolver([{ texto: p.texto, fuente: f.semi, color: TINTA, tamano: 26 }], ANCHO);
        for (const l of lineas) {
          this.dibujarLinea(l, IZQ, this.y - 26);
          this.y -= 31;
        }
        this.y -= 4;
        // El filete magenta bajo el título: el acabado de la marca, no un dato
        this.pagina.drawRectangle({ x: IZQ, y: this.y - 3 * MM, width: 24 * MM, height: 3 * MM, color: MAGENTA });
        this.y -= 3 * MM + 12 * MM;
        return;
      }
      case "seccion": {
        this.espacio(14);
        // Un rótulo no se queda solo al pie: va con lo que le sigue, sea un
        // párrafo o una cláusula con su filete
        this.asegurar(INTERLINEA * 2 + 6 + 14 + INTERLINEA * 2);
        this.espaciado(p.texto.toLocaleUpperCase("es"), IZQ, this.y - CUERPO, f.semi, CUERPO, TINTA, 0.05);
        this.y -= INTERLINEA + 6;
        return;
      }
      case "clausula": {
        this.espacio(12);
        this.asegurar(14 + INTERLINEA * 3);
        this.pagina.drawLine({
          start: { x: IZQ, y: this.y },
          end: { x: IZQ + ANCHO, y: this.y },
          thickness: 0.5,
          color: MAGENTA,
        });
        this.y -= 10;
        const base = this.y - CUERPO;
        // El número cuelga en el margen, en mono gris
        this.espaciado(p.numero, IZQ - 12 * MM, base + 1.5, f.mono, 7, GRIS, 0.05);
        const titulo = envolver(
          [{ texto: p.titulo.toLocaleUpperCase("es"), fuente: f.semi, color: TINTA, tamano: CUERPO }],
          ANCHO,
        );
        for (const l of titulo) {
          this.dibujarLinea(l, IZQ, this.y - CUERPO);
          this.y -= INTERLINEA;
        }
        this.y -= 4;
        return;
      }
      case "parrafo":
        this.parrafo(this.trozos(p.tramos));
        this.y -= 7;
        return;
      case "expositivo":
        this.parrafo(this.trozos(p.tramos), 10 * MM, { texto: p.numero, x: IZQ });
        this.y -= 7;
        return;
      case "lista":
        this.parrafo(this.trozos(p.tramos), 12 * MM, { texto: p.letra, x: IZQ + 5 * MM });
        this.y -= 5;
        return;
      case "firmas":
        this.firmas(p.bloques);
        return;
    }
  }

  /** Los bloques de firma, de dos en dos, y ninguno partido entre páginas */
  firmas(bloques: Tramo[][][]) {
    const hueco = 12 * MM;
    const columna = (ANCHO - hueco) / 2;
    for (let i = 0; i < bloques.length; i += 2) {
      const par = bloques.slice(i, i + 2).map((b) => b.flatMap((linea) => envolver(this.trozos(linea), columna)));
      const alto = 14 + Math.max(...par.map((b) => b.length)) * INTERLINEA;
      this.espacio(10);
      this.asegurar(alto);
      const arriba = this.y;
      par.forEach((lineas, c) => {
        const x = IZQ + c * (columna + hueco);
        this.pagina.drawLine({ start: { x, y: arriba }, end: { x: x + columna, y: arriba }, thickness: 0.75, color: FILETE });
        let y = arriba - 14;
        for (const l of lineas) {
          this.dibujarLinea(l, x, y - CUERPO);
          y -= INTERLINEA;
        }
      });
      this.y = arriba - alto;
    }
  }

  /** La última página: el registro de firmas, con el mismo diseño */
  registro(datos: Dato[]) {
    const f = this.f;
    this.nueva();
    this.espaciado("REGISTRO DE FIRMAS", IZQ, this.y - CUERPO, f.semi, CUERPO, TINTA, 0.05);
    this.y -= INTERLINEA + 10;

    const dato = (etiqueta: string, valor: string, mono = false, sangria = 0) => {
      this.parrafo([{ texto: etiqueta, fuente: f.normal, color: GRIS, tamano: 8.5 }], sangria, undefined, 12);
      this.parrafo(
        [{ texto: valor, fuente: mono ? f.mono : f.normal, color: TINTA, tamano: mono ? 8.5 : 9.5 }],
        sangria,
        undefined,
        13,
      );
      this.y -= 5;
    };

    let trasFirmante = false;
    const filete = () => {
      this.pagina.drawLine({
        start: { x: IZQ, y: this.y },
        end: { x: IZQ + ANCHO, y: this.y },
        thickness: 0.5,
        color: MAGENTA,
      });
      this.y -= 10;
    };
    for (const r of datos) {
      // Lo que va después de las firmas se separa de la última
      if (trasFirmante && r.tipo !== "firmante") {
        this.espacio(10);
        filete();
      }
      trasFirmante = r.tipo === "firmante";
      if (r.tipo === "dato") {
        dato(r.etiqueta, r.valor, r.mono);
      } else if (r.tipo === "firmante") {
        this.espacio(10);
        this.asegurar(14 + 6 * 30);
        filete();
        this.parrafo([{ texto: r.rotulo.toLocaleUpperCase("es"), fuente: f.semi, color: TINTA, tamano: 9.5 }]);
        this.y -= 2;
        const s = r.firma;
        dato("Nombre", s.nombre);
        dato("Correo", s.correo ?? "—");
        dato("Fecha y hora", `${hora(s.cuando, "Europe/Madrid")} (Madrid) · ${hora(s.cuando, "UTC")} (UTC)`);
        dato("IP", s.ip ?? "—", true);
        dato("Navegador", s.navegador ?? "—");
      } else {
        this.espacio(8);
        this.parrafo([{ texto: r.texto, fuente: f.normal, color: GRIS, tamano: 8.5 }], 0, undefined, 12);
      }
    }
  }

  /** Cabecera —menos en la primera— y pie con folio, cuando ya se sabe cuántas hay */
  marco(cabecera: string, pie: string) {
    const total = this.paginas.length;
    this.paginas.forEach((p, i) => {
      this.pagina = p;
      if (i > 0) this.espaciado(cabecera, IZQ, A4[1] - 12 * MM, this.f.mono, 7, GRIS, 0.05);
      p.drawLine({
        start: { x: IZQ, y: 14 * MM },
        end: { x: IZQ + ANCHO, y: 14 * MM },
        thickness: 0.5,
        color: MAGENTA,
      });
      this.espaciado(pie, IZQ, 10 * MM, this.f.mono, 7, GRIS, 0.05);
      const folio = `${i + 1} DE ${total}`;
      const ancho = folio.length * (this.f.mono.widthOfTextAtSize("0", 7) + 0.05 * 7);
      this.espaciado(folio, IZQ + ANCHO - ancho, 10 * MM, this.f.mono, 7, GRIS, 0.05);
    });
  }
}

export async function generarPdfNda(d: DatosNda): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const bytes = await leerFuentes();
  const fuentes: Fuentes = {
    normal: await pdf.embedFont(bytes.normal, { subset: true }),
    semi: await pdf.embedFont(bytes.semi, { subset: true }),
    negrita: await pdf.embedFont(bytes.negrita, { subset: true }),
    mono: await pdf.embedFont(bytes.mono, { subset: true }),
  };

  const piezas = interpretarNda(d.texto);
  const titulo = tituloDe(piezas) ?? "Acuerdo de confidencialidad";
  pdf.setTitle(`${titulo} · ${d.candidatura}`);
  pdf.setAuthor("Inception Woman Lab");
  pdf.setCreator("Plataforma IWL");

  const m = new Maqueta(pdf, fuentes);
  for (const p of piezas) m.pieza(p);
  m.registro(registro(d));
  m.marco(
    `${titulo} · versión ${d.version}`.toLocaleUpperCase("es"),
    "INCEPTION WOMAN LAB, S.L. · CONFIDENCIAL",
  );
  return pdf.save();
}
