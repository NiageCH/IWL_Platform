import { FICHERO_GUIA, leerGuia, type BloqueGuia } from "@/lib/guia";
import { TEXTOS_GUIA } from "@/lib/guia-textos.generado";

export type GuiaLeida =
  | { estado: "ok"; bloques: BloqueGuia[] }
  /** El rol no tiene guía: no se ofrece abrirla */
  | { estado: "sin_guia" }
  /** Debería tenerla y no se ha podido cargar: se dice así, no «no hay» */
  | { estado: "error" };

/**
 * La guía de un rol. Los Markdown entran en el código al compilar
 * (`scripts/guia-generar.mjs`): leídos del disco en cada visita, en
 * producción no viajaron y la guía salió vacía sin que nada avisara
 * (REVISION, 23 nov · urgente).
 */
export function leerGuiaDe(rol: string): GuiaLeida {
  const fichero = FICHERO_GUIA[rol];
  if (!fichero) return { estado: "sin_guia" };
  const md = TEXTOS_GUIA[fichero];
  if (!md) {
    console.error(`[guia] El rol ${rol} tiene guía (${fichero}.md) y no está en el módulo generado`);
    return { estado: "error" };
  }
  try {
    return { estado: "ok", bloques: leerGuia(md) };
  } catch (e) {
    console.error(`[guia] No se ha podido leer ${fichero}.md`, e);
    return { estado: "error" };
  }
}

/** Si el rol tiene guía de verdad: sin ella, la franja no ofrece abrirla */
export function hayGuia(rol: string | null | undefined): boolean {
  return Boolean(rol && FICHERO_GUIA[rol] && TEXTOS_GUIA[FICHERO_GUIA[rol]]);
}
