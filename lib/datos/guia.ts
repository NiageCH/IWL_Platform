import { readFile } from "node:fs/promises";
import path from "node:path";
import { FICHERO_GUIA, leerGuia, type BloqueGuia } from "@/lib/guia";

/**
 * El texto de la guía de un rol, leído del disco en cada visita: corregir
 * el Markdown basta para cambiarla, sin tocar componentes. En Vercel el
 * fichero viaja por `outputFileTracingIncludes`, en `next.config.ts`.
 */
export async function leerGuiaDe(rol: string): Promise<BloqueGuia[] | null> {
  const fichero = FICHERO_GUIA[rol];
  if (!fichero) return null;
  try {
    const md = await readFile(path.join(process.cwd(), "contenido", "guia", `${fichero}.md`), "utf8");
    return leerGuia(md);
  } catch {
    return null;
  }
}
