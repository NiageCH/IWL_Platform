/**
 * Lo que dicen las firmas, en texto: la hora sin duda de zona y las líneas
 * del rastro de cada firmante. Puro, sin PDF ni disco, para usarlo en el
 * servidor y en el navegador, y probarlo solo. Lo pinta `lib/pdf.ts`.
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
