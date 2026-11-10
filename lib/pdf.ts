import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { hora as horaDe } from "@/lib/firmas";
import { MEMBRETE, SOCIEDAD } from "@/lib/iwl";
import type { Tramo } from "@/lib/nda-formato";

export { hora, lineasFirma, type FirmaNda } from "@/lib/firmas";

/**
 * La plantilla de documento de IWL, en PDF: la misma para el NDA, el acta
 * de comité y los que vengan (Acuerdo, Anexo). Cada documento decide qué
 * dice; esto decide cómo se ve.
 *
 *   · A4, márgenes 20 · 20 · 28 · 20 mm; lo numerado cuelga en el margen.
 *   · Montserrat 400, 600 y 700 y Roboto Mono, incrustadas (OFL).
 *   · Primera página: la marca y el membrete. Las demás, la cabecera. Todas,
 *     el pie con filete magenta, «CONFIDENCIAL» y folio «N DE M».
 *   · El magenta solo en filetes; nunca en el texto.
 *   · Un párrafo se puede partir entre páginas, pero sin dejar una línea
 *     sola arriba ni abajo, y un rótulo va siempre con lo que le sigue. Ir
 *     entero a la página siguiente dejaba un tercio de página en blanco.
 *
 * Lee las fuentes del disco: solo en el servidor. Lo puro —horas, líneas de
 * una firma— está en `lib/firmas.ts`, que sí puede llegar al navegador.
 */

// -----------------------------------------------------------------------------
// Medidas y colores
// -----------------------------------------------------------------------------

export const MM = 72 / 25.4;
const A4: [number, number] = [595.28, 841.89];
const SUP = 20 * MM;
const INF = 20 * MM;
const IZQ = 28 * MM;
const DER = 20 * MM;
export const ANCHO = A4[0] - IZQ - DER;

const color = (hex: string): RGB =>
  rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const TINTA = color("#18181B");
const GRIS = color("#71717A");
const MAGENTA = color("#FF007A");
const FILETE = color("#E4E4E7");

const CUERPO = 11;
const INTERLINEA = 16.5;

// -----------------------------------------------------------------------------
// Fuentes
// -----------------------------------------------------------------------------

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

/** Parte unos trozos en líneas que caben en `ancho`, sin partir palabras */
function envolver(trozos: Trozo[], ancho: number): Trozo[][] {
  const lineas: Trozo[][] = [];
  let linea: Trozo[] = [];
  let ocupado = 0;
  const cerrar = () => {
    while (linea.length && linea[linea.length - 1].texto === " ") linea.pop();
    if (linea.length) lineas.push(linea);
    linea = [];
    ocupado = 0;
  };
  for (const t of trozos) {
    for (const pieza of apto(t.fuente, t.texto).split(/(\s+)/)) {
      if (!pieza) continue;
      const espacio = /^\s+$/.test(pieza);
      const texto = espacio ? " " : pieza;
      const w = t.fuente.widthOfTextAtSize(texto, t.tamano);
      if (espacio) {
        if (!linea.length) continue;
      } else if (ocupado + w > ancho && linea.length) {
        cerrar();
      }
      linea.push({ ...t, texto });
      ocupado += w;
    }
  }
  cerrar();
  return lineas;
}

// -----------------------------------------------------------------------------
// El registro de firmas
// -----------------------------------------------------------------------------

export type DatoRegistro =
  | { tipo: "dato"; etiqueta: string; valor: string; mono?: boolean }
  | {
      tipo: "firmante";
      rotulo: string;
      firma: { nombre: string; correo: string | null; cuando: string; ip: string | null; navegador: string | null };
    }
  | { tipo: "nota"; texto: string };

// -----------------------------------------------------------------------------
// El documento
// -----------------------------------------------------------------------------

export interface OpcionesParrafo {
  /** Desde el margen del texto, en puntos */
  sangria?: number;
  /** Lo que cuelga a la izquierda de la primera línea: un número, una letra */
  colgado?: { texto: string; x: number };
  tamano?: number;
  interlinea?: number;
  color?: RGB;
}

export class DocumentoIwl {
  private paginas: PDFPage[] = [];
  private pagina!: PDFPage;
  private y = 0;

  private constructor(
    private pdf: PDFDocument,
    private f: Fuentes,
    private cabecera: string,
  ) {}

  /**
   * Un documento nuevo, con la marca y el membrete ya puestos en la primera
   * página. `cabecera` es lo que sale arriba en las demás.
   */
  static async crear(meta: { titulo: string; cabecera: string }): Promise<DocumentoIwl> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const bytes = await leerFuentes();
    const f: Fuentes = {
      normal: await pdf.embedFont(bytes.normal, { subset: true }),
      semi: await pdf.embedFont(bytes.semi, { subset: true }),
      negrita: await pdf.embedFont(bytes.negrita, { subset: true }),
      mono: await pdf.embedFont(bytes.mono, { subset: true }),
    };
    pdf.setTitle(meta.titulo);
    pdf.setAuthor(SOCIEDAD.nombre);
    pdf.setCreator("Plataforma IWL");
    const doc = new DocumentoIwl(pdf, f, meta.cabecera.toLocaleUpperCase("es"));
    doc.nueva();
    doc.marca();
    return doc;
  }

  private nueva() {
    this.pagina = this.pdf.addPage(A4);
    this.paginas.push(this.pagina);
    this.y = A4[1] - SUP;
  }

  private alPrincipio() {
    return this.y >= A4[1] - SUP;
  }

  /** Que quepa `alto` en lo que queda de página; si no, a la siguiente */
  private asegurar(alto: number) {
    if (this.y - alto < INF && !this.alPrincipio()) this.nueva();
  }

  /** Un espacio vertical; al principio de una página sobra */
  espacio(alto: number) {
    if (!this.alPrincipio()) this.y -= alto;
  }

  /** Empieza página, para lo que va siempre aparte, como el registro */
  saltoDePagina() {
    this.nueva();
  }

  private trozos(tramos: Tramo[], o: OpcionesParrafo = {}): Trozo[] {
    return tramos.map((t) => ({
      texto: t.texto,
      fuente: t.negrita ? this.f.negrita : this.f.normal,
      color: o.color ?? TINTA,
      tamano: o.tamano ?? CUERPO,
    }));
  }

  private dibujarLinea(linea: Trozo[], x: number, base: number) {
    let cx = x;
    for (const t of linea) {
      this.pagina.drawText(t.texto, { x: cx, y: base, size: t.tamano, font: t.fuente, color: t.color });
      cx += t.fuente.widthOfTextAtSize(t.texto, t.tamano);
    }
  }

  /** Texto con espaciado entre letras, que pdf-lib no hace solo */
  private espaciado(texto: string, x: number, base: number, fuente: PDFFont, tamano: number, c: RGB, tracking: number) {
    let cx = x;
    for (const ch of apto(fuente, texto)) {
      this.pagina.drawText(ch, { x: cx, y: base, size: tamano, font: fuente, color: c });
      cx += fuente.widthOfTextAtSize(ch, tamano) + tracking * tamano;
    }
    return cx - x;
  }

  private filete(c: RGB = MAGENTA, grosor = 0.5, x = IZQ, ancho = ANCHO) {
    this.pagina.drawLine({ start: { x, y: this.y }, end: { x: x + ancho, y: this.y }, thickness: grosor, color: c });
  }

  // ---------------------------------------------------------------------------
  // Lo que se reserva para no dejar un rótulo solo al pie
  // ---------------------------------------------------------------------------

  /** Lo que ocupan las primeras `lineas` líneas de un párrafo: lo mínimo que tiene que ir con su rótulo */
  altoInicio(tramos: Tramo[], o: OpcionesParrafo = {}, lineas = 2): number {
    const n = envolver(this.trozos(tramos, o), ANCHO - (o.sangria ?? 0)).length;
    return Math.min(n, lineas) * (o.interlinea ?? INTERLINEA);
  }

  altoSeccion(): number {
    return INTERLINEA + 6;
  }

  altoClausula(titulo: string): number {
    return 10 + envolver([{ texto: titulo.toLocaleUpperCase("es"), fuente: this.f.semi, color: TINTA, tamano: CUERPO }], ANCHO).length * INTERLINEA + 4;
  }

  // ---------------------------------------------------------------------------
  // Las piezas
  // ---------------------------------------------------------------------------

  /** La marca y el membrete, arriba de la primera página, sin contenedor */
  private marca() {
    this.espaciado("INCEPTION WOMAN LAB", IZQ, this.y - 9, this.f.semi, 9, TINTA, 0.12);
    this.y -= 9 + 6;
    this.espaciado(MEMBRETE, IZQ, this.y - 7, this.f.mono, 7, GRIS, 0.05);
    this.y -= 7 + 12 * MM;
  }

  /** El título, el filete magenta debajo y, si las hay, las líneas que lo sitúan */
  titulo(texto: string, debajo: string[] = []) {
    for (const l of envolver([{ texto, fuente: this.f.semi, color: TINTA, tamano: 26 }], ANCHO)) {
      this.dibujarLinea(l, IZQ, this.y - 26);
      this.y -= 31;
    }
    this.y -= 4;
    // El filete magenta bajo el título: el acabado de la marca, no un dato
    this.pagina.drawRectangle({ x: IZQ, y: this.y - 3 * MM, width: 24 * MM, height: 3 * MM, color: MAGENTA });
    this.y -= 3 * MM + 6 * MM;
    for (const linea of debajo) {
      this.parrafo([{ texto: linea, negrita: false }], { color: GRIS, interlinea: 15 });
    }
    this.y -= 6 * MM;
  }

  /** Rótulo de sección, en caja alta. `siguiente` es lo que tiene que ir con él */
  seccion(texto: string, siguiente = INTERLINEA * 2) {
    this.espacio(14);
    this.asegurar(this.altoSeccion() + siguiente);
    this.espaciado(texto.toLocaleUpperCase("es"), IZQ, this.y - CUERPO, this.f.semi, CUERPO, TINTA, 0.05);
    this.y -= this.altoSeccion();
  }

  /** Cláusula: filete fino, número en mono gris colgado en el margen, título en caja alta */
  clausula(numero: string, titulo: string, siguiente = INTERLINEA * 2) {
    this.espacio(12);
    this.asegurar(this.altoClausula(titulo) + siguiente);
    this.filete();
    this.y -= 10;
    this.espaciado(numero, IZQ - 12 * MM, this.y - CUERPO + 1.5, this.f.mono, 7, GRIS, 0.05);
    for (const l of envolver(
      [{ texto: titulo.toLocaleUpperCase("es"), fuente: this.f.semi, color: TINTA, tamano: CUERPO }],
      ANCHO,
    )) {
      this.dibujarLinea(l, IZQ, this.y - CUERPO);
      this.y -= INTERLINEA;
    }
    this.y -= 4;
  }

  /**
   * Un párrafo. Se parte entre páginas por donde haga falta, salvo dos
   * cosas: no deja su primera línea sola al pie, ni su última sola arriba.
   */
  parrafo(tramos: Tramo[], o: OpcionesParrafo = {}) {
    const interlinea = o.interlinea ?? INTERLINEA;
    const sangria = o.sangria ?? 0;
    const lineas = envolver(this.trozos(tramos, o), ANCHO - sangria);
    const n = lineas.length;
    let i = 0;
    while (i < n) {
      const caben = Math.max(0, Math.floor((this.y - INF + 0.01) / interlinea));
      const quedan = n - i;
      let k = Math.min(caben, quedan);
      if (k < quedan) {
        // La última, sola arriba de la siguiente página: mejor llevarse otra
        if (quedan - k === 1) k -= 1;
        // La primera, sola al pie: mejor empezar en la siguiente
        if (i === 0 && k < 2) k = 0;
      }
      if (k <= 0) {
        if (this.alPrincipio()) k = Math.min(quedan, Math.max(1, caben));
        else {
          this.nueva();
          continue;
        }
      }
      for (let j = 0; j < k; j++, i++) {
        const base = this.y - (o.tamano ?? CUERPO);
        if (i === 0 && o.colgado) {
          this.dibujarLinea(
            [{ texto: o.colgado.texto, fuente: this.f.normal, color: o.color ?? TINTA, tamano: o.tamano ?? CUERPO }],
            o.colgado.x,
            base,
          );
        }
        this.dibujarLinea(lineas[i], IZQ + sangria, base);
        this.y -= interlinea;
      }
      if (i < n) this.nueva();
    }
  }

  /** Expositivo: el romano colgado y el texto con sangría */
  expositivo(numero: string, tramos: Tramo[]) {
    this.parrafo(tramos, { sangria: 10 * MM, colgado: { texto: numero, x: IZQ } });
  }

  /** Elemento de lista con sangría francesa */
  lista(letra: string, tramos: Tramo[]) {
    this.parrafo(tramos, { sangria: 12 * MM, colgado: { texto: letra, x: IZQ + 5 * MM } });
  }

  /** Bloques de firma, de dos en dos, y ninguno partido entre páginas */
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
        this.filete(FILETE, 0.75, x, columna);
        let y = arriba - 14;
        for (const l of lineas) {
          this.dibujarLinea(l, x, y - CUERPO);
          y -= INTERLINEA;
        }
      });
      this.y = arriba - alto;
    }
  }

  /** Lo que mide un bloque de firmas: va entero */
  altoFirmas(bloques: Tramo[][][]): number {
    const columna = (ANCHO - 12 * MM) / 2;
    const alto = (b: Tramo[][]) => b.flatMap((l) => envolver(this.trozos(l), columna)).length;
    return 10 + 14 + Math.max(...bloques.slice(0, 2).map(alto)) * INTERLINEA;
  }

  /** Ficha en dos columnas: la clave en mono gris, el valor en Montserrat */
  ficha(pares: [string, string][]) {
    const clave = 42 * MM;
    for (const [k, v] of pares) {
      const lineas = envolver([{ texto: v, fuente: this.f.normal, color: TINTA, tamano: CUERPO }], ANCHO - clave);
      const alto = Math.max(1, lineas.length) * INTERLINEA + 6;
      this.asegurar(alto);
      this.filete(FILETE, 0.5);
      this.y -= 5;
      this.espaciado(k.toLocaleUpperCase("es"), IZQ, this.y - CUERPO + 1.5, this.f.mono, 7, GRIS, 0.05);
      for (const l of lineas) {
        this.dibujarLinea(l, IZQ + clave, this.y - CUERPO);
        this.y -= INTERLINEA;
      }
      this.y -= 1;
    }
    this.filete(FILETE, 0.5);
  }

  /** Bloque destacado: filete magenta a la izquierda, sin fondo, y entero en una página */
  destacado(titulo: string, parrafos: string[]) {
    const sangria = 6 * MM;
    const altoTexto = parrafos.reduce(
      (s, p) => s + envolver(this.trozos([{ texto: p, negrita: false }]), ANCHO - sangria).length * INTERLINEA + 4,
      0,
    );
    const alto = INTERLINEA + 4 + altoTexto;
    this.espacio(6);
    this.asegurar(alto);
    const arriba = this.y;
    this.espaciado(titulo.toLocaleUpperCase("es"), IZQ + sangria, this.y - CUERPO, this.f.semi, CUERPO, TINTA, 0.05);
    this.y -= INTERLINEA + 4;
    for (const p of parrafos) {
      this.parrafo([{ texto: p, negrita: false }], { sangria });
      this.y -= 4;
    }
    this.pagina.drawRectangle({ x: IZQ, y: this.y + 2, width: 1.5, height: arriba - this.y - 2, color: MAGENTA });
  }

  /** Una línea por firmante: el nombre a la izquierda y cuándo firmó a la derecha */
  lineasDeFirma(filas: { nombre: string; cuando: string }[]) {
    for (const fila of filas) {
      this.asegurar(INTERLINEA + 8);
      this.filete(FILETE, 0.5);
      this.y -= 6;
      const base = this.y - CUERPO;
      this.dibujarLinea([{ texto: apto(this.f.normal, fila.nombre), fuente: this.f.normal, color: TINTA, tamano: CUERPO }], IZQ, base);
      const ancho = this.f.normal.widthOfTextAtSize(fila.cuando, 9.5);
      this.pagina.drawText(fila.cuando, { x: IZQ + ANCHO - ancho, y: base, size: 9.5, font: this.f.normal, color: GRIS });
      this.y -= INTERLINEA;
    }
    this.filete(FILETE, 0.5);
  }

  /** La última página: el registro de firmas, con el mismo diseño */
  registro(titulo: string, datos: DatoRegistro[]) {
    const f = this.f;
    this.nueva();
    this.espaciado(titulo.toLocaleUpperCase("es"), IZQ, this.y - CUERPO, f.semi, CUERPO, TINTA, 0.05);
    this.y -= INTERLINEA + 10;

    // Etiqueta y valor en la misma fila, como la ficha: con tres o cuatro
    // firmantes el registro sigue cabiendo en una página
    const clave = 38 * MM;
    const dato = (etiqueta: string, valor: string, mono = false) => {
      const tamano = mono ? 8 : 9.5;
      const lineas = envolver(
        [{ texto: valor, fuente: mono ? f.mono : f.normal, color: TINTA, tamano }],
        ANCHO - clave,
      );
      const rotulo = etiqueta.toLocaleUpperCase("es");
      const anchoRotulo = [...rotulo].reduce((a, c) => a + f.mono.widthOfTextAtSize(c, 6.5) + 0.05 * 6.5, 0);
      // Una etiqueta que no cabe en su columna va en su propia fila
      const aparte = anchoRotulo > clave - 6;
      this.asegurar(lineas.length * 13 + 3 + (aparte ? 11 : 0));
      this.espaciado(rotulo, IZQ, this.y - 9.5 + 1, f.mono, 6.5, GRIS, 0.05);
      if (aparte) this.y -= 11;
      for (const l of lineas) {
        this.dibujarLinea(l, IZQ + clave, this.y - 9.5);
        this.y -= 13;
      }
      this.y -= 3;
    };

    let trasFirmante = false;
    for (const r of datos) {
      // Lo que va después de las firmas se separa de la última
      if (trasFirmante && r.tipo !== "firmante") {
        this.espacio(10);
        this.filete();
        this.y -= 10;
      }
      trasFirmante = r.tipo === "firmante";
      if (r.tipo === "dato") {
        dato(r.etiqueta, r.valor, r.mono);
      } else if (r.tipo === "firmante") {
        this.espacio(10);
        this.asegurar(14 + 6 * 16);
        this.filete();
        this.y -= 10;
        this.parrafo([{ texto: r.rotulo.toLocaleUpperCase("es"), negrita: false }], { tamano: 9.5 });
        this.y -= 2;
        const s = r.firma;
        dato("Nombre", s.nombre);
        dato("Correo", s.correo ?? "—");
        dato("Fecha y hora", `${horaDe(s.cuando, "Europe/Madrid")} (Madrid) · ${horaDe(s.cuando, "UTC")} (UTC)`);
        dato("IP", s.ip ?? "—", true);
        dato("Navegador", s.navegador ?? "—");
      } else {
        this.espacio(8);
        this.parrafo([{ texto: r.texto, negrita: false }], { color: GRIS, tamano: 8.5, interlinea: 12 });
      }
    }
  }

  /** Cabecera —menos en la primera— y pie con folio, y los bytes */
  async terminar(): Promise<Uint8Array> {
    const total = this.paginas.length;
    this.paginas.forEach((p, i) => {
      this.pagina = p;
      if (i > 0) this.espaciado(this.cabecera, IZQ, A4[1] - 12 * MM, this.f.mono, 7, GRIS, 0.05);
      p.drawLine({ start: { x: IZQ, y: 14 * MM }, end: { x: IZQ + ANCHO, y: 14 * MM }, thickness: 0.5, color: MAGENTA });
      this.espaciado(`${SOCIEDAD.nombre.toUpperCase()} · CONFIDENCIAL`, IZQ, 10 * MM, this.f.mono, 7, GRIS, 0.05);
      const folio = `${i + 1} DE ${total}`;
      const ancho = [...folio].reduce((s, c) => s + this.f.mono.widthOfTextAtSize(c, 7) + 0.05 * 7, 0);
      this.espaciado(folio, IZQ + ANCHO - ancho, 10 * MM, this.f.mono, 7, GRIS, 0.05);
    });
    return this.pdf.save();
  }
}

