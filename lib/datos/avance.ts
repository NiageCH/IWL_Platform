import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Por dónde va un proyecto: lo recorrido y lo que falta.
 *
 * Era la pregunta que la plataforma no contestaba de un vistazo. La fase
 * estaba, en letra pequeña en la cabecera —«Incubación»—, y no decía ni
 * cuántas fases hay, ni cuál viene después, ni cuánto queda. Para saber si
 * un proyecto iba bien había que leerse cinco bloques.
 *
 * Se arma con lo que ya hay y sin inventar métricas nuevas: las cuatro
 * fases del programa, los hitos del Anexo y las fechas del propio Anexo.
 */

export interface FaseDelPrograma {
  codigo: string;
  nombre: string;
  orden: number;
  /** Pasada, la de ahora, o todavía por llegar */
  estado: "recorrida" | "actual" | "pendiente";
}

export interface AvanceDelPrograma {
  fases: FaseDelPrograma[];
  faseActual: FaseDelPrograma | null;
  hitos: { cumplidos: number; total: number; pct: number | null };
  /**
   * El tiempo del Anexo, cuando hay uno firmado con fechas.
   *
   * `pct` puede pasar de 100: un programa que se alarga es justo lo que hay
   * que ver, así que no se recorta.
   */
  tiempo: {
    inicio: string;
    fin: string;
    meses: number | null;
    mesesIdos: number | null;
    pct: number | null;
  } | null;
}

export async function leerAvance(
  companyId: string,
  phaseId: string | null,
): Promise<AvanceDelPrograma> {
  const supabase = await clienteServidor();

  const [{ data: fases }, { data: hitos }, { data: anexo }] = await Promise.all([
    supabase.from("phases").select("id, code, name, order_index").order("order_index"),
    supabase.from("milestones").select("status").eq("company_id", companyId),
    supabase
      .from("annexes")
      .select("starts_on, ends_on, status")
      .eq("company_id", companyId)
      .eq("status", "firmado")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const ordenActual =
    (fases ?? []).find((f) => f.id === phaseId)?.order_index ?? null;

  const lista: FaseDelPrograma[] = (fases ?? []).map((f) => ({
    codigo: f.code,
    nombre: f.name,
    orden: f.order_index,
    estado:
      ordenActual === null
        ? "pendiente"
        : f.order_index < ordenActual
          ? "recorrida"
          : f.order_index === ordenActual
            ? "actual"
            : "pendiente",
  }));

  const total = (hitos ?? []).length;
  const cumplidos = (hitos ?? []).filter((h) => h.status === "cumplido").length;

  let tiempo: AvanceDelPrograma["tiempo"] = null;
  if (anexo?.starts_on && anexo.ends_on) {
    const inicio = new Date(anexo.starts_on).getTime();
    const fin = new Date(anexo.ends_on).getTime();
    const hoy = Date.now();
    const mes = 1000 * 60 * 60 * 24 * 30.44;

    tiempo = {
      inicio: anexo.starts_on,
      fin: anexo.ends_on,
      meses: fin > inicio ? Math.round((fin - inicio) / mes) : null,
      mesesIdos: hoy > inicio ? Math.round((hoy - inicio) / mes) : 0,
      pct: fin > inicio ? ((hoy - inicio) / (fin - inicio)) * 100 : null,
    };
  }

  return {
    fases: lista,
    faseActual: lista.find((f) => f.estado === "actual") ?? null,
    hitos: {
      cumplidos,
      total,
      pct: total > 0 ? (cumplidos / total) * 100 : null,
    },
    tiempo,
  };
}
