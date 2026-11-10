/**
 * El NDA personalizado: marcadores en la plantilla y el texto completado.
 *
 * La plantilla la escribe Luciana con huecos marcados así: `{{startup}}`.
 * Al firmar, cada candidata firma su texto ya completado, con sus datos, y
 * el hash, la versión y el PDF se calculan sobre ese texto, no sobre la
 * plantilla. Lo mismo corre en el navegador —para que vea lo que va a
 * firmar mientras rellena— y en el servidor, que es quien lo guarda.
 *
 * La lista de marcadores es cerrada: uno desconocido no deja guardar la
 * plantilla, y la base lo comprueba también (`app.problema_plantilla_nda`).
 * Si se añade uno aquí, se añade allí.
 */

export const MARCADORES = {
  startup: "Nombre de la startup, el de la candidatura",
  contraparte_nombre: "Nombre de la persona de contacto, el de la candidatura",
  fecha_efecto: "Fecha de efecto: la de la última firma",
  lugar: "Lugar de firma; se fija en Programa (Málaga por defecto)",
  documento: "Su DNI, NIE o pasaporte; lo escribe ella",
  domicilio: "Su domicilio, o el de la sociedad; lo escribe ella",
  denominacion: "Denominación de la sociedad; lo escribe ella, solo si es sociedad",
  nif: "NIF de la sociedad; lo escribe ella, solo si es sociedad",
  cargo: "Su cargo en la sociedad; lo escribe ella, solo si es sociedad",
} as const;

export type Marcador = keyof typeof MARCADORES;

/** Los bloques condicionales: lo que solo va si es sociedad, o si es persona física */
export const BLOQUES = {
  si_sociedad: "Solo si firma en nombre de una sociedad constituida",
  si_persona: "Solo si firma como persona física: sin sociedad o en constitución",
} as const;

/** Lo que rellena ella antes de firmar */
export const CAMPOS_DE_ELLA = ["documento", "domicilio", "denominacion", "nif", "cargo"] as const;
export type CampoDeElla = (typeof CAMPOS_DE_ELLA)[number];

/** Mientras falte una firma, la fecha de efecto se dice así, sin fecha */
export const FECHA_EFECTO_PENDIENTE = "la fecha de la última firma";

const ETIQUETA = /\{\{\s*([#/]?)([^{}]*?)\s*\}\}/g;

/**
 * Lo que no vale de una plantilla: marcadores desconocidos y bloques sin
 * cerrar. Vacío si se puede guardar.
 */
export function erroresPlantilla(texto: string): string[] {
  const errores: string[] = [];
  const abiertos: string[] = [];
  for (const m of texto.matchAll(ETIQUETA)) {
    const [, signo, nombre] = m;
    if (signo === "#" || signo === "/") {
      if (!(nombre in BLOQUES)) {
        errores.push(`«{{${signo}${nombre}}}» no es un bloque que la plataforma conozca`);
      } else if (signo === "#") {
        abiertos.push(nombre);
      } else if (abiertos.pop() !== nombre) {
        errores.push(`«{{/${nombre}}}» cierra un bloque que no estaba abierto`);
      }
    } else if (!(nombre in MARCADORES)) {
      errores.push(`«{{${nombre}}}» no es un marcador que la plataforma conozca`);
    }
  }
  for (const b of abiertos) errores.push(`Falta cerrar «{{#${b}}}» con «{{/${b}}}»`);
  return [...new Set(errores)];
}

export interface DatosTextoNda {
  startup: string;
  contraparte_nombre: string;
  lugar: string;
  /** La fecha ya escrita, o `FECHA_EFECTO_PENDIENTE` si falta una firma */
  fecha_efecto: string;
  es_sociedad: boolean;
  documento?: string;
  domicilio?: string;
  denominacion?: string;
  nif?: string;
  cargo?: string;
}

/**
 * El texto con sus datos. Primero los bloques —el que no toca, fuera entero—
 * y después los marcadores. Un dato vacío deja el marcador como estaba, para
 * que `huecos` lo encuentre y se diga qué falta.
 */
export function completarNda(plantilla: string, d: DatosTextoNda): string {
  let texto = plantilla.replace(/\r\n/g, "\n");
  for (const [bloque, vale] of [
    ["si_sociedad", d.es_sociedad],
    ["si_persona", !d.es_sociedad],
  ] as const) {
    const patron = new RegExp(`\\{\\{\\s*#${bloque}\\s*\\}\\}([\\s\\S]*?)\\{\\{\\s*/${bloque}\\s*\\}\\}`, "g");
    texto = texto.replace(patron, (_, dentro: string) => (vale ? dentro : ""));
  }
  return texto.replace(ETIQUETA, (entera, signo: string, nombre: string) => {
    if (signo) return entera;
    const valor = (d as unknown as Record<string, unknown>)[nombre];
    return typeof valor === "string" && valor.trim() ? valor.trim() : entera;
  });
}

/**
 * Lo que queda sin rellenar en un texto: marcadores sin dato y cualquier
 * cosa entre corchetes, que es como venían los huecos en la plantilla en
 * papel. Con alguno, ni se envía ni se firma.
 */
export function huecos(texto: string): string[] {
  const salida: string[] = [];
  for (const m of texto.matchAll(/\{\{[^{}]*\}\}/g)) salida.push(m[0]);
  for (const m of texto.matchAll(/\[[^\]\n]{0,80}\]/g)) salida.push(m[0]);
  return [...new Set(salida)];
}

/** Qué campos le pide a ella esta plantilla, según sea sociedad o persona */
export function camposQuePide(plantilla: string, esSociedad: boolean): CampoDeElla[] {
  const efectiva = completarNda(plantilla, {
    startup: "x",
    contraparte_nombre: "x",
    lugar: "x",
    fecha_efecto: "x",
    es_sociedad: esSociedad,
  });
  return CAMPOS_DE_ELLA.filter((c) => new RegExp(`\\{\\{\\s*${c}\\s*\\}\\}`).test(efectiva));
}

/**
 * Lo que impide enviar una plantilla: errores de marcadores, o huecos que
 * no son marcadores —corchetes— y que nadie va a rellenar. Los marcadores
 * se rellenan después y no cuentan aquí.
 */
export function problemaParaEnviar(plantilla: string): string | null {
  const errores = erroresPlantilla(plantilla);
  if (errores.length) return errores[0];
  const sinMarcadores = plantilla.replace(ETIQUETA, "");
  const corchetes = huecos(sinMarcadores);
  if (corchetes.length) {
    return `La plantilla tiene huecos sin marcador: ${corchetes.slice(0, 3).join(", ")}. Cámbialos por un marcador o por el texto.`;
  }
  return null;
}
