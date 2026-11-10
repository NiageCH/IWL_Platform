"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { error, ok, validar, type Resultado } from "@/lib/acciones/resultado";
import { notificar, reintentar } from "@/lib/correo";
import { fecha } from "@/lib/utils";

/**
 * Lo que IWL envía a mano: el mensaje de un descarte, y volver a intentar
 * un correo que quedó sin enviar. Lo demás sale solo, con la acción que lo
 * provoca.
 */

async function soloIwl() {
  const persona = await personaActual();
  if (!persona) return { persona: null, fallo: error("Tu sesión ha caducado. Vuelve a entrar.") };
  if (!esIwl(persona.role)) return { persona: null, fallo: error("Esto es del equipo de IWL.") };
  return { persona, fallo: null };
}

/**
 * El mensaje de un descarte, el que se redactó en el acta del comité o en
 * la decisión de no incorporarla. Lo leen con la sesión —es de IWL por
 * RLS— y sale una sola vez: si ya se le envió, se dice cuándo.
 */
export async function enviarMensajeDescarte(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ origen: z.enum(["acta", "incorporacion"]), id: z.string().uuid() }),
    formData,
  );
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  let mensaje: string | null = null;
  let candidatura: { id: string; nombre: string; contacto_nombre: string | null; contacto_email: string | null } | null = null;

  if (datos.origen === "acta") {
    const { data } = await supabase
      .from("comite_actas")
      .select("mensaje, decision, cerrada_at, candidaturas ( id, nombre, contacto_nombre, contacto_email )")
      .eq("id", datos.id)
      .maybeSingle();
    if (!data || data.decision !== "descartada" || !data.cerrada_at) {
      return error("Ese mensaje sale de un acta de descarte firmada por todos.");
    }
    mensaje = data.mensaje;
    candidatura = data.candidaturas as unknown as typeof candidatura;
  } else {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("decisiones_incorporacion").select("decision, mensaje").eq("company_id", datos.id).maybeSingle(),
      supabase.from("candidaturas").select("id, nombre, contacto_nombre, contacto_email").eq("company_id", datos.id).maybeSingle(),
    ]);
    if (!d || d.decision !== "no") return error("Ese mensaje sale de una decisión de no incorporarla.");
    mensaje = d.mensaje;
    candidatura = c;
  }

  if (!mensaje?.trim()) return error("No hay mensaje redactado.");
  if (!candidatura?.contacto_email) return error("No tiene correo al que mandárselo.");

  const { data: previo } = await supabase
    .from("correos")
    .select("enviado_at")
    .eq("candidatura_id", candidatura.id)
    .eq("evento", "descarte")
    .eq("estado", "enviado")
    .limit(1)
    .maybeSingle();
  if (previo?.enviado_at) return error(`Ya se le envió el ${fecha(previo.enviado_at)}.`);

  const r = await notificar(
    { correo: candidatura.contacto_email, nombre: candidatura.contacto_nombre },
    "descarte",
    { startup: candidatura.nombre, mensaje },
    { candidaturaId: candidatura.id, autor: persona!.id },
  );
  revalidatePath(`/embudo/${candidatura.id}`);
  return r.estado === "enviado"
    ? ok(`Enviado a ${candidatura.contacto_email}.`)
    : error(`No ha salido: ${r.error ?? "sin proveedor"}. Queda «sin enviar» en su ficha para reintentarlo.`);
}

/** Volver a intentar un correo que quedó sin enviar */
export async function reintentarCorreo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ id: z.string().uuid() }), formData);
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  // Que lo pueda ver con su sesión: si no, no es suyo reintentarlo
  const supabase = await clienteServidor();
  const { data: fila } = await supabase.from("correos").select("candidatura_id").eq("id", datos.id).maybeSingle();
  if (!fila) return error("Ese correo ya no está.");

  const r = await reintentar(datos.id);
  if (fila.candidatura_id) revalidatePath(`/embudo/${fila.candidatura_id}`);
  revalidatePath("/cartera", "layout");
  // El acuse es la fila cambiada a «Enviado»
  return r.estado === "enviado" ? ok() : error(`Sigue sin salir: ${r.error ?? "sin proveedor"}.`);
}
