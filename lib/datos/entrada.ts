import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { BaseIncorporacion, DecisionIncorporacion } from "@/lib/entrada";

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
