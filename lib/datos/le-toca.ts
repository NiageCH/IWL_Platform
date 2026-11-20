import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { avancePendiente, hitoQueVence, nombreMes } from "@/lib/le-toca";
import { fecha } from "@/lib/utils";

/**
 * Lo que le toca y no se guarda como aviso (REVISION, 20 nov): sale del
 * estado y desaparece en cuanto se hace. A ella, el avance del mes y los
 * hitos que vencen; al mentor principal, los hitos vencidos de sus
 * compañías.
 */

export interface TocaCalculado {
  clave: string;
  /** Para `data-aviso`, como los avisos guardados */
  tipo: "avance_mes" | "hito_por_vencer" | "hito_vencido";
  texto: string;
  teToca: string;
  verbo: string;
  href: string;
  estado: "atencion" | "vencido";
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

async function diaDe(clave: string, porDefecto: number): Promise<number> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", clave).maybeSingle();
  const dia = Number((data?.value as { dia?: unknown } | null)?.dia);
  return Number.isInteger(dia) && dia >= 1 && dia <= 28 ? dia : porDefecto;
}

export const leerDiasAvance = cache(async () => {
  const [aviso, limite] = await Promise.all([diaDe("avance_mes_dia_aviso", 25), diaDe("update_mensual_dia_limite", 10)]);
  return { aviso, limite };
});

/** Lo de ella: solo con el Acuerdo firmado, que es cuando hay programa */
export async function leerLoQueLeToca(companyId: string): Promise<TocaCalculado[]> {
  const supabase = await clienteServidor();
  const hoy = hoyISO();
  const [{ data: anexo }, { data: updates }, { data: hitos }, dias] = await Promise.all([
    supabase
      .from("annexes")
      .select("signed_on")
      .eq("company_id", companyId)
      .in("status", ["firmado", "cerrado"])
      .order("version")
      .limit(1)
      .maybeSingle(),
    supabase.from("monthly_updates").select("period").eq("company_id", companyId).in("status", ["entregado", "revisado"]),
    supabase
      .from("milestones")
      .select("id, title, status, due_date")
      .eq("company_id", companyId)
      .not("due_date", "is", null)
      .order("due_date"),
    leerDiasAvance(),
  ]);
  if (!anexo?.signed_on) return [];

  const lista: TocaCalculado[] = [];
  const avance = avancePendiente({
    hoy,
    diaAviso: dias.aviso,
    diaLimite: dias.limite,
    cargados: new Set((updates ?? []).map((u) => u.period.slice(0, 7))),
    desde: anexo.signed_on,
  });
  if (avance) {
    const mes = nombreMes(avance.mes);
    lista.push({
      clave: `avance-${avance.mes}`,
      tipo: "avance_mes",
      texto: `Carga el avance de ${mes}${avance.estado === "vencido" ? ": ya pasó el plazo" : ""}`,
      teToca: "Te toca: cargar los KPI y contar el mes",
      verbo: "Cargar",
      href: "/proyecto/kpi#avance",
      estado: avance.estado,
    });
  }
  for (const h of hitos ?? []) {
    const estado = hitoQueVence({ estado: h.status, fecha: h.due_date }, hoy);
    if (!estado) continue;
    lista.push({
      clave: `hito-${h.id}`,
      tipo: estado === "vencido" ? "hito_vencido" : "hito_por_vencer",
      texto: `«${h.title}» ${estado === "vencido" ? "venció" : "vence"} el ${fecha(h.due_date!)}`,
      teToca: "Te toca: entregarlo con su evidencia",
      verbo: "Entregar",
      href: `/proyecto/ruta#hito-${h.id}`,
      estado,
    });
  }
  return lista;
}

/**
 * Los hitos vencidos sin entregar de las compañías que coordina quien
 * mira como mentor principal. RLS ya le da solo las suyas.
 */
export async function leerHitosVencidosDeMisCompanias(personaId: string): Promise<TocaCalculado[]> {
  const supabase = await clienteServidor();
  const hoy = hoyISO();
  const { data: suyas } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("profile_id", personaId)
    .eq("member_role", "mentor_principal");
  const ids = (suyas ?? []).map((c) => c.company_id);
  if (!ids.length) return [];
  const { data: hitos } = await supabase
    .from("milestones")
    .select("id, title, status, due_date, companies ( name, slug )")
    .in("company_id", ids)
    .lt("due_date", hoy)
    .not("status", "in", "(entregado,cumplido)")
    .order("due_date");
  return (hitos ?? []).map((h) => {
    const c = h.companies as unknown as { name: string; slug: string } | null;
    return {
      clave: `hito-${h.id}`,
      tipo: "hito_vencido" as const,
      texto: `«${h.title}», de ${c?.name ?? "una compañía"}, venció el ${fecha(h.due_date!)} sin entregar`,
      teToca: "Te toca: hablar con ella",
      verbo: "Ver el hito",
      href: `/cartera/${c?.slug ?? ""}/ruta#hito-${h.id}`,
      estado: "vencido" as const,
    };
  });
}
