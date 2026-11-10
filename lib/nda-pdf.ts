import { documentoFirmado, hora } from "@/lib/pdf";

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
  /** El hash del texto que firmó ella */
  hash: string;
  /**
   * El del texto final, con la fecha de efecto ya escrita, que es el que
   * va en el PDF. Sin él, el PDF lleva el mismo texto que firmó ella.
   */
  hashFinal?: string | null;
  ella: FirmaNda;
  iwl: FirmaNda;
  /** ISO, cuándo se genera el documento */
  generado: string;
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

/** Las líneas del rastro, tal como salen en la última página */
export function lineasRastro(d: DatosNda): string[] {
  return [
    `Candidatura: ${d.candidatura} (${d.candidaturaId})`,
    `Plantilla del NDA: versión ${d.version}`,
    `Hash SHA-256 del texto firmado por la candidata: ${d.hash}`,
    ...(d.hashFinal
      ? [
          `Hash SHA-256 de este texto, con la fecha de efecto: ${d.hashFinal}`,
          "  Es el mismo texto: solo cambia «la fecha de la última firma» por la fecha.",
        ]
      : []),
    "",
    ...lineasFirma("Firma de la candidata", d.ella),
    ...lineasFirma("Contrafirma de Inception Woman Lab", d.iwl),
    `Documento generado: ${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    "Firma electrónica simple, registrada por la plataforma de Inception Woman Lab.",
  ];
}

export function generarPdfNda(d: DatosNda): Promise<Uint8Array> {
  return documentoFirmado({
    titulo: "Acuerdo de confidencialidad (NDA)",
    subtitulo: d.candidatura,
    texto: d.texto,
    tituloRastro: "Rastro de las firmas",
    rastro: lineasRastro(d),
  });
}
