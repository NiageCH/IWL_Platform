/**
 * Qué se puede subir, cuánto y adónde. En un solo sitio.
 *
 * Lo leen las dos partes: la pantalla, para decir el límite antes de subir
 * y rechazar sin gastar la subida; el servidor, para no fiarse de la
 * pantalla. El tope de verdad lo pone además cada bucket.
 *
 * **Los ficheros no pasan por el servidor de la aplicación.** Una Server
 * Action no admite más de 1 MB —y Vercel corta en 4,5—, así que un PDF de
 * cuentas normal no llegaba. El servidor comprueba permisos y firma una
 * dirección de subida (`prepararSubida`); el navegador sube a Storage con
 * esa dirección; y la acción de siempre registra lo subido, leyendo de
 * Storage su tamaño y su tipo.
 */

export type ClaseSubida =
  | "documento"
  | "evidencia"
  | "candidata"
  | "reunion"
  | "nda"
  | "cv"
  | "foto"
  | "logo";

const MB = 1024 * 1024;

const DOCUMENTOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
];

interface Regla {
  maximo: number;
  /** Tipos admitidos; `null` es cualquiera */
  tipos: string[] | null;
  /** Cómo se dicen los tipos a una persona */
  textoTipos?: string;
}

export const REGLAS: Record<ClaseSubida, Regla> = {
  documento: { maximo: 25 * MB, tipos: DOCUMENTOS, textoTipos: "PDF, Word, Excel, PowerPoint, CSV o imagen" },
  evidencia: { maximo: 25 * MB, tipos: null },
  candidata: { maximo: 25 * MB, tipos: null },
  reunion: { maximo: 25 * MB, tipos: null },
  nda: { maximo: 25 * MB, tipos: ["application/pdf", "image/png", "image/jpeg", "image/webp"], textoTipos: "PDF o imagen" },
  cv: {
    maximo: 10 * MB,
    tipos: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
    textoTipos: "PDF o Word",
  },
  foto: { maximo: 5 * MB, tipos: ["image/jpeg", "image/png", "image/webp"], textoTipos: "JPG, PNG o WebP" },
  logo: { maximo: 2 * MB, tipos: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"], textoTipos: "PNG, JPEG, WebP o SVG" },
};

/** «25 MB», «1,5 MB» */
export function megas(bytes: number): string {
  const valor = bytes / MB;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: valor < 10 ? 1 : 0 }).format(valor)} MB`;
}

/** Lo que dice la pantalla antes de subir: «PDF o Word, hasta 10 MB.» */
export function textoLimite(clase: ClaseSubida): string {
  const r = REGLAS[clase];
  return r.textoTipos ? `${r.textoTipos}, hasta ${megas(r.maximo)}.` : `Hasta ${megas(r.maximo)}.`;
}

/**
 * Si un fichero vale para esa clase. Devuelve el motivo si no, dicho para
 * quien lo ha elegido; `null` si vale.
 */
export function comprobarFichero(
  clase: ClaseSubida,
  fichero: { nombre: string; tamano: number; tipo: string },
): string | null {
  const r = REGLAS[clase];
  if (fichero.tamano <= 0) return `${fichero.nombre} está vacío.`;
  if (fichero.tamano > r.maximo) {
    return `${fichero.nombre} pesa ${megas(fichero.tamano)} y el máximo son ${megas(r.maximo)}.`;
  }
  if (r.tipos && fichero.tipo && !r.tipos.includes(fichero.tipo)) {
    return `${fichero.nombre} no vale aquí. Sirve ${r.textoTipos}.`;
  }
  if (r.tipos && !fichero.tipo) {
    return `No sabemos qué tipo de fichero es ${fichero.nombre}. Sirve ${r.textoTipos}.`;
  }
  return null;
}

/** Nombre de fichero seguro para una ruta de Storage: sin tildes ni espacios */
export function sanear(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}
