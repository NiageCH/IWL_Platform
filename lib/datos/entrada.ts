import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { estadoTope, pasoEntrada, type BaseIncorporacion, type DecisionIncorporacion } from "@/lib/entrada";
import type { Via } from "@/lib/comite";
import { firmarLogos } from "@/lib/datos/logos";

export interface DecisionLeida {
  decision: DecisionIncorporacion;
  base: BaseIncorporacion;
  motivo: string;
  mensaje: string | null;
  decididoOn: string;
  quien: string | null;
}

/**
 * Lo que IWL necesita de una compañía en entrada: su decisión, si la hay,
 * y la candidatura de la que viene, para el mensaje y para volver a ella.
 * La decisión es solo de IWL por RLS: a una fundadora le llega vacía.
 */
export const leerEntrada = cache(async (companyId: string) => {
  const supabase = await clienteServidor();
  const [{ data: d }, { data: c }] = await Promise.all([
    supabase
      .from("decisiones_incorporacion")
      .select("decision, base, motivo, mensaje, decidido_on, profiles:decidido_por(full_name, email)")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("candidaturas")
      .select("id, contacto_nombre, contacto_email")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  const p = d?.profiles as unknown as { full_name: string | null; email: string | null } | null;
  const decision: DecisionLeida | null = d
    ? {
        decision: d.decision as DecisionIncorporacion,
        base: d.base as BaseIncorporacion,
        motivo: d.motivo,
        mensaje: d.mensaje,
        decididoOn: d.decidido_on,
        quien: p?.full_name ?? p?.email ?? null,
      }
    : null;

  return {
    decision,
    candidatura: c
      ? { id: c.id, contacto: c.contacto_nombre ?? "", correo: c.contacto_email ?? "" }
      : null,
  };
});

export interface FilaEntrada {
  id: string;
  nombre: string;
  slug: string;
  logo: string | null;
  via: Via | null;
  dias: number;
  paso: ReturnType<typeof pasoEntrada>;
  obligatoriosHechos: number;
  obligatorios: number;
  /** El diagnóstico de Construcción: reunión celebrada, ficha completa, situación confirmada */
  diagnostico: { reunion: boolean; ficha: boolean; situacion: boolean };
  candidaturaId: string | null;
  /** A quién recordar: la fundadora con cuenta, si la hay */
  fundadora: { id: string; nombre: string; correo: string | null } | null;
  /** En Construcción, si ha pasado el tope del tramo de entrada */
  tope: "atencion" | "vencido" | null;
}

/**
 * Las compañías en entrada, para la lista «En entrada» de la cartera.
 *
 * Solo IWL: RLS no le da compañías en entrada a nadie más que a su
 * fundadora, y la cartera de una fundadora no pasa por aquí. Las
 * archivadas —«No incorporada»— no están: ya no esperan nada.
 */
export const leerEnEntrada = cache(async (): Promise<FilaEntrada[]> => {
  const supabase = await clienteServidor();
  const { data: companias } = await supabase
    .from("companies")
    .select("id, name, slug, logo_path, via, created_at, sector, one_liner, situacion_societaria, situacion_confirmada_at")
    .eq("tramo", "entrada")
    .is("archived_at", null)
    .order("created_at");
  if (!companias?.length) return [];

  const ids = companias.map((c) => c.id);
  const [puntos, decisiones, anexos, candidaturas, miembros, ajuste] = await Promise.all([
    supabase.from("dd_items").select("company_id, status").in("company_id", ids).eq("is_required", true),
    supabase.from("decisiones_incorporacion").select("company_id, decision").in("company_id", ids),
    supabase.from("annexes").select("company_id, status, version").in("company_id", ids).order("version", { ascending: false }),
    supabase.from("candidaturas").select("id, company_id").in("company_id", ids),
    supabase
      .from("company_members")
      .select("company_id, profile_id, profiles ( full_name, email )")
      .in("company_id", ids)
      .eq("member_role", "fundadora"),
    supabase.from("platform_settings").select("value").eq("key", "entrada_tope_construccion_dias").maybeSingle(),
  ]);
  const tope = typeof ajuste.data?.value === "number" ? ajuste.data.value : 14;

  const idsCandidatura = (candidaturas.data ?? []).map((c) => c.id);
  const { data: reuniones } = idsCandidatura.length
    ? await supabase
        .from("candidatura_reuniones")
        .select("candidatura_id")
        .in("candidatura_id", idsCandidatura)
        .not("celebrada_on", "is", null)
    : { data: [] as { candidatura_id: string }[] };

  const logos = await firmarLogos(companias.map((c) => c.logo_path));
  const hoy = Date.now();
  return companias.map((c) => {
    const suyos = (puntos.data ?? []).filter((p) => p.company_id === c.id && p.status !== "no_aplica");
    const hechos = suyos.filter((p) => p.status === "validado").length;
    const decision = (decisiones.data ?? []).find((d) => d.company_id === c.id)?.decision ?? null;
    const anexo = (anexos.data ?? []).find((a) => a.company_id === c.id)?.status ?? null;
    const candidatura = (candidaturas.data ?? []).find((x) => x.company_id === c.id) ?? null;
    const m = (miembros.data ?? []).find((x) => x.company_id === c.id);
    const perfil = m?.profiles as unknown as { full_name: string | null; email: string | null } | null;
    const via = c.via as Via | null;
    const dias = Math.max(0, Math.floor((hoy - new Date(c.created_at).getTime()) / 86_400_000));

    return {
      id: c.id,
      nombre: c.name,
      slug: c.slug,
      logo: c.logo_path ? (logos.get(c.logo_path) ?? null) : null,
      via,
      dias,
      tope: estadoTope(via, dias, tope),
      paso: pasoEntrada({
        via,
        situacionDicha: Boolean(c.situacion_societaria),
        situacionConfirmada: Boolean(c.situacion_confirmada_at),
        obligatoriosHechos: hechos,
        obligatorios: suyos.length,
        decision: decision as DecisionIncorporacion | null,
        anexo,
      }),
      obligatoriosHechos: hechos,
      obligatorios: suyos.length,
      diagnostico: {
        reunion: Boolean(candidatura && (reuniones ?? []).some((r) => r.candidatura_id === candidatura.id)),
        ficha: Boolean(c.sector && c.one_liner),
        situacion: Boolean(c.situacion_confirmada_at),
      },
      candidaturaId: candidatura?.id ?? null,
      fundadora: m
        ? { id: m.profile_id, nombre: perfil?.full_name ?? perfil?.email ?? "", correo: perfil?.email ?? null }
        : null,
    };
  });
});

/**
 * Las que esperan a dirección: decidir la incorporación, o una de
 * Construcción que ha pasado el tope sin Acuerdo. Cada compañía cuenta una
 * vez. Confirmar la situación ya tiene su aviso y no se cuenta dos veces;
 * lo que espera a ella, y lo por construir, no cuenta.
 */
export const contarEntradaParaDireccion = cache(async (): Promise<number> => {
  const filas = await leerEnEntrada();
  return filas.filter((f) => f.paso.quien === "direccion" || f.tope).length;
});
