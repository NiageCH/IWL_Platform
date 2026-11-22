"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { dominiosDeTexto } from "@/lib/correo/modo-pruebas";
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

/**
 * Reintentar todos los que quedaron sin enviar, desde el aviso de
 * dirección. El aviso se cierra solo cuando no queda ninguno; si alguno
 * sigue sin salir, se dice cuántos y por qué, y el aviso sigue abierto.
 */
export async function reintentarCorreosSinEnviar(): Promise<Resultado> {
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;
  if (persona!.role !== "admin_iwl") return error("Reintentarlos todos es de dirección.");

  // Los que ve con su sesión: RLS decide
  const supabase = await clienteServidor();
  const { data: filas } = await supabase.from("correos").select("id").eq("estado", "sin_enviar").limit(200);
  if (!filas?.length) return ok();

  const fallos: string[] = [];
  for (const f of filas) {
    const r = await reintentar(f.id);
    if (r.estado !== "enviado") fallos.push(r.error ?? "sin proveedor");
  }
  revalidatePath("/admin/correos");
  revalidatePath("/cartera", "layout");
  revalidatePath("/embudo", "layout");
  if (!fallos.length) return ok();
  return error(
    `${fallos.length === 1 ? "Uno sigue" : `${fallos.length} siguen`} sin salir: ${[...new Set(fallos)].join("; ")}.`,
  );
}

/*
 * El modo pruebas (REVISION, 21 nov). Quién puede tocarlo lo dice la base:
 * `platform_settings` solo la escribe dirección, y quitarlo solo se puede
 * con `quitar_modo_pruebas`, que pide la frase y deja quién y cuándo.
 */

async function leerAjusteCrudo() {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "correo_modo_pruebas").maybeSingle();
  return { supabase, valor: (data?.value ?? {}) as Record<string, unknown> };
}

function refrescarModo() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function guardarDominiosModoPruebas(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ dominios: z.string() }), formData);
  if (fallo) return fallo;
  const dominios = dominiosDeTexto(datos.dominios);
  if (!dominios.length) return error("Deja al menos un dominio: si no, no saldría ningún correo.", { dominios: "Al menos uno." });
  const malo = dominios.find((d) => !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d));
  if (malo) return error(`«${malo}» no parece un dominio. Escríbelo como niage.es.`, { dominios: "Revisa los dominios." });

  const { supabase, valor } = await leerAjusteCrudo();
  const { error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: { ...valor, dominios } })
    .eq("key", "correo_modo_pruebas");
  if (falloBase) return traducirError(falloBase);
  refrescarModo();
  return ok(`Guardado. En modo pruebas, los correos salen solo a ${dominios.map((d) => `@${d}`).join(", ")}.`);
}

export async function quitarModoPruebas(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ confirmacion: z.string() }), formData);
  if (fallo) return fallo;
  if (datos.confirmacion.trim() !== "ACTIVAR CORREOS") {
    return error("Para quitarlo, escribe ACTIVAR CORREOS tal cual.", { confirmacion: "Tal cual, en mayúsculas." });
  }
  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("quitar_modo_pruebas", { p_confirmacion: datos.confirmacion });
  if (falloBase) return traducirError(falloBase);
  refrescarModo();
  return ok();
}

export async function volverAModoPruebas(): Promise<Resultado> {
  const { supabase, valor } = await leerAjusteCrudo();
  const { error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: { ...valor, activo: true } })
    .eq("key", "correo_modo_pruebas");
  if (falloBase) return traducirError(falloBase);
  refrescarModo();
  return ok();
}
