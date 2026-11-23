import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { leerSeguimiento } from "@/lib/datos/hoja";
import { generarPdfAnexo, type DatosAnexoPdf, type TramoPdf } from "@/lib/anexo-pdf";
import { plazoMaximoMeses } from "@/lib/tramos";
import type { Estadio } from "@/lib/estadios";

/**
 * El Anexo de Programa en PDF (REVISION, 23 nov), con su sección I.
 *
 * Con la sesión de quien lo pide: si RLS no le deja leer el Anexo, no hay
 * PDF. Propuesto o firmado, sale de la copia que hizo la base en ese
 * momento; en borrador, de lo que hay hoy.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await personaActual())) return new Response("Tu sesión ha caducado. Vuelve a entrar.", { status: 401 });

  const supabase = await clienteServidor();
  const { data: anexo } = await supabase.from("annexes").select("*").eq("id", id).maybeSingle();
  if (!anexo) return new Response("Ese Anexo no está, o no lo puedes ver.", { status: 404 });

  const { data: co } = await supabase
    .from("companies")
    .select("name, entry_state")
    .eq("id", anexo.company_id)
    .maybeSingle();
  const estadio = (co?.entry_state ?? null) as Estadio | null;

  const momento = anexo.status === "firmado" || anexo.status === "cerrado" ? "firmado" : anexo.status === "borrador" ? null : "propuesto";
  const { data: copia } = momento
    ? await supabase
        .from("anexo_versiones")
        .select("contenido")
        .eq("annex_id", id)
        .eq("momento", momento)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const c = (copia?.contenido ?? null) as Record<string, unknown> | null;

  // La hoja de ruta: la congelada si la copia la lleva; si no, la de hoy
  let hoja = (c?.hoja_de_ruta as TramoPdf[] | undefined) ?? null;
  if (!hoja) {
    const seguimiento = await leerSeguimiento(anexo.company_id);
    hoja = seguimiento.tramos.map((t) => ({
      tramo: t.tramo,
      nombre: t.nombre,
      inicio: t.inicio,
      fin: t.fin,
      hitos: t.hitos.map((h) => ({
        titulo: h.titulo,
        criterio: null,
        fecha: h.fecha,
        fundamental: h.fundamental,
        de_tramo: h.deTramo,
        al_entrar: h.alEntrar,
      })),
    }));
  }

  const v = <T,>(clave: string, vivo: T): T => (c && clave in c ? (c[clave] as T) : vivo);
  const num = (x: unknown) => (x === null || x === undefined || x === "" ? null : Number(x));

  const datos: DatosAnexoPdf = {
    compania: co?.name ?? "Compañía",
    version: anexo.version,
    estado: anexo.status,
    origen: momento ?? "borrador",
    firmadoEl: v("signed_on", anexo.signed_on),
    duracionMeses: num(v("duration_months", anexo.duration_months)),
    inicio: v("starts_on", anexo.starts_on),
    fin: v("ends_on", anexo.ends_on),
    horas: num(v("committed_hours", anexo.committed_hours)),
    valorHoras: num(v("committed_hours_value", anexo.committed_hours_value)),
    financiacion: num(v("committed_cash", anexo.committed_cash)),
    equityPct: num(v("equity_pct", anexo.equity_pct)),
    otros: v("other_commitments", anexo.other_commitments),
    plazoMeses: num(v("plazo_meses", estadio ? plazoMaximoMeses(estadio) : null)),
    hoja,
  };

  const pdf = await generarPdfAnexo(datos);
  // Una cabecera solo admite ASCII: «Raíz» rompía la respuesta
  const nombre = `IWL_AnexoPrograma_${(co?.name ?? "compania").normalize("NFD").replace(/[^A-Za-z0-9]+/g, "")}_v${anexo.version}.pdf`;
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nombre}"`,
      "cache-control": "private, no-store",
    },
  });
}
