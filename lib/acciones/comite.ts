"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/supabase/servicio";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { createHash } from "node:crypto";
import { contenidoActa, viaPropuesta, type Decision, type Via } from "@/lib/comite";
import { generarPdfActa } from "@/lib/acta-pdf";

/**
 * El acta de comité: redactarla, firmarla y, cuando firman todos, su PDF.
 *
 * Redactar y elegir quién forma el comité van con la sesión: es de IWL por
 * RLS. Firmar va con la clave de servicio por lo mismo que el NDA: la IP y
 * el navegador solo los conoce este servidor. La sesión se comprueba aquí.
 */

function refrescar(candidaturaId: string) {
  revalidatePath(`/embudo/${candidaturaId}`);
  revalidatePath("/embudo");
  revalidatePath("/cartera");
}

async function soloIwl() {
  const persona = await personaActual();
  if (!persona) return { persona: null, fallo: error("Tu sesión ha caducado. Vuelve a entrar.") };
  if (!esIwl(persona.role)) return { persona: null, fallo: error("El comité es del equipo de IWL.") };
  return { persona, fallo: null };
}

const texto = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ?? "").trim() || null);

const esquemaActa = z
  .object({
    candidatura_id: z.string().uuid(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "¿Qué día se reunió?"),
    resumen: z.string().trim().min(10, "Resume qué se valoró: es lo que firma cada miembro."),
    decision: z.enum(["preseleccionada", "descartada", "aplazada"], { message: "¿Qué se decidió?" }),
    via: z
      .union([z.enum(["aceleracion", "construccion"]), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    via_motivo: texto,
    motivo: texto,
    revision_on: texto,
    puede_volver: z.string().optional(),
    mensaje: texto,
  })
  .superRefine((d, ctx) => {
    if (d.decision === "preseleccionada" && !d.via) {
      ctx.addIssue({ code: "custom", path: ["via"], message: "¿Por qué vía entra?" });
    }
    if (d.decision === "aplazada" && !d.revision_on) {
      ctx.addIssue({ code: "custom", path: ["revision_on"], message: "¿Cuándo se vuelve a mirar? Ese día te avisa." });
    }
    if (d.decision === "descartada" && !d.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "El motivo de un descarte queda en el acta." });
    }
  });

export async function redactarActa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaActa, formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const miembros = [...new Set(formData.getAll("miembros").map(String).filter(Boolean))];
  if (!miembros.length) {
    return error("Marca quién forma el comité: cada uno tendrá que firmar el acta.", { miembros: "Al menos una persona." });
  }

  const supabase = await clienteServidor();

  // La vía propuesta sale de la base, no del formulario
  const { data: c } = await supabase
    .from("candidaturas")
    .select("estado_verificado, estado_declarado")
    .eq("id", datos.candidatura_id)
    .maybeSingle();
  if (!c) return error("Esa candidatura ya no está.");
  const propuesta = viaPropuesta(c.estado_verificado ?? c.estado_declarado);

  if (datos.decision === "preseleccionada" && propuesta && datos.via !== propuesta && !datos.via_motivo) {
    return error("Cambiar la vía que sale de su estado de entrada pide decir por qué.", {
      via_motivo: "¿Por qué otra vía?",
    });
  }

  const { data: acta, error: falloActa } = await supabase
    .from("comite_actas")
    .insert({
      candidatura_id: datos.candidatura_id,
      fecha: datos.fecha,
      resumen: datos.resumen,
      decision: datos.decision,
      via: datos.decision === "preseleccionada" ? datos.via : null,
      via_propuesta: propuesta,
      via_motivo: datos.via_motivo,
      motivo: datos.motivo,
      revision_on: datos.decision === "aplazada" ? datos.revision_on : null,
      puede_volver: datos.decision === "descartada" ? datos.puede_volver === "si" : null,
      mensaje: datos.decision === "descartada" ? datos.mensaje : null,
      created_by: persona!.id,
    })
    .select("id")
    .single();
  if (falloActa) return traducirError(falloActa);

  const { error: falloMiembros } = await supabase
    .from("comite_firmas")
    .insert(miembros.map((profile_id) => ({ acta_id: acta.id, profile_id })));
  if (falloMiembros) {
    await supabase.from("comite_actas").delete().eq("id", acta.id);
    return traducirError(falloMiembros);
  }

  refrescar(datos.candidatura_id);
  return ok();
}

export async function borrarActa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ acta_id: z.string().uuid(), candidatura_id: z.string().uuid() }),
    formData,
  );
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.from("comite_actas").delete().eq("id", datos.acta_id);
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.candidatura_id);
  return ok();
}

export async function firmarActa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ acta_id: z.string().uuid(), candidatura_id: z.string().uuid() }),
    formData,
  );
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const ua = h.get("user-agent") ?? "";

  const { data: cerrada, error: falloFirma } = await clienteServicio().rpc("firmar_acta", {
    p_acta: datos.acta_id,
    p_profile: persona!.id,
    p_ip: ip,
    p_ua: ua,
  });
  if (falloFirma) return traducirError(falloFirma);

  // La última firma cierra el acta: su PDF, al expediente
  if (cerrada) {
    const problema = await guardarPdfActa(datos.acta_id, persona!.id);
    refrescar(datos.candidatura_id);
    if (problema) return ok(`Acta cerrada. El PDF no se ha podido generar: ${problema}.`);
  }

  refrescar(datos.candidatura_id);
  return ok();
}

/**
 * El PDF de un acta cerrada, al expediente, y su hash.
 *
 * El hash es el de lo firmado (`contenidoActa`). Al cerrar se guarda; al
 * regenerar se vuelve a calcular y tiene que dar lo mismo, porque el acta
 * no se puede editar desde la primera firma. Las cerradas antes de que
 * existiera el hash lo guardan la primera vez que se regeneran, y el PDF lo
 * dice.
 */
async function guardarPdfActa(actaId: string, autor: string, regenerar = false): Promise<string | null> {
  const servicio = clienteServicio();
  const { data: acta } = await servicio
    .from("comite_actas")
    .select(
      "*, candidaturas(nombre, contacto_nombre, contacto_apellidos, cohorts(name)), comite_firmas(profile_id, firmado_at, firmado_ip, firmado_ua, profiles(full_name, last_name, email))",
    )
    .eq("id", actaId)
    .single();
  if (!acta) return "no se encuentra el acta";
  if (!acta.cerrada_at) return "el acta todavía no está firmada por todos";

  const filas = (acta.comite_firmas as unknown as {
    profile_id: string;
    firmado_at: string;
    firmado_ip: string | null;
    firmado_ua: string | null;
    profiles: { full_name: string | null; last_name: string | null; email: string | null } | null;
  }[]).sort((a, b) => a.firmado_at.localeCompare(b.firmado_at));
  const firmas = filas.map((f) => ({
    nombre: [f.profiles?.full_name, f.profiles?.last_name].filter(Boolean).join(" ") || f.profiles?.email || "—",
    correo: f.profiles?.email ?? null,
    cuando: f.firmado_at,
    ip: f.firmado_ip,
    navegador: f.firmado_ua,
  }));

  const contenido = {
    actaId: acta.id,
    candidaturaId: acta.candidatura_id,
    fecha: acta.fecha,
    resumen: acta.resumen,
    decision: acta.decision as Decision,
    via: acta.via as Via | null,
    viaPropuesta: acta.via_propuesta as Via | null,
    viaMotivo: acta.via_motivo,
    motivo: acta.motivo,
    revisionOn: acta.revision_on,
    puedeVolver: acta.puede_volver,
    miembros: filas.map((f) => f.profile_id),
  };
  const hash = createHash("sha256").update(contenidoActa(contenido), "utf8").digest("hex");
  if (acta.contenido_hash && acta.contenido_hash !== hash) {
    return "su contenido no coincide con el hash que se guardó al cerrarla, así que no se rehace";
  }

  const supabase = await clienteServidor();
  if (!acta.contenido_hash) {
    const { error: falloHash } = await supabase.from("comite_actas").update({ contenido_hash: hash }).eq("id", actaId);
    if (falloHash) return falloHash.message;
  }

  const c = acta.candidaturas as unknown as {
    nombre: string;
    contacto_nombre: string | null;
    contacto_apellidos: string | null;
    cohorts: { name: string } | null;
  } | null;
  const bytes = await generarPdfActa({
    ...contenido,
    candidatura: c?.nombre ?? "",
    contacto: [c?.contacto_nombre, c?.contacto_apellidos].filter(Boolean).join(" ") || "—",
    cohorte: c?.cohorts?.name ?? "—",
    firmas,
    hash,
    regenerado: regenerar ? { cerradaAt: acta.cerrada_at, hashDeEntonces: !!acta.contenido_hash } : undefined,
    generado: new Date().toISOString(),
  });

  const ruta = `${acta.candidatura_id}/${Date.now()}-acta-comite.pdf`;
  const { error: falloSubida } = await supabase.storage
    .from("candidaturas")
    .upload(ruta, bytes, { contentType: "application/pdf" });
  if (falloSubida) return falloSubida.message;

  const fecha = acta.fecha.split("-").reverse().join("-");
  const { data: doc, error: falloFicha } = await supabase
    .from("candidatura_documentos")
    .insert({
      candidatura_id: acta.candidatura_id,
      nombre: regenerar ? `Acta de comité del ${fecha} (regenerada).pdf` : `Acta de comité del ${fecha}.pdf`,
      storage_path: ruta,
      mime: "application/pdf",
      bytes: bytes.length,
      created_by: autor,
    })
    .select("id")
    .single();
  if (falloFicha) {
    await supabase.storage.from("candidaturas").remove([ruta]);
    return falloFicha.message;
  }

  // El PDF de antes se queda en el expediente; el acta apunta al nuevo
  await supabase.from("comite_actas").update({ documento_id: doc.id }).eq("id", actaId);
  return null;
}

/**
 * Rehacer el PDF de un acta cerrada con el diseño de ahora. Solo dirección.
 * El de entonces no se borra, y el nuevo dice que es regenerado y de dónde
 * sale su hash.
 */
export async function regenerarPdfActa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ acta_id: z.string().uuid(), candidatura_id: z.string().uuid() }), formData);
  if (fallo) return fallo;
  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl") return error("Regenerar el PDF de un acta es de la dirección de IWL.");

  const problema = await guardarPdfActa(datos.acta_id, persona.id, true);
  refrescar(datos.candidatura_id);
  return problema ? error(`El PDF no se ha podido regenerar: ${problema}.`) : ok("PDF regenerado. El de antes sigue en el expediente.");
}

/** Quién forma el comité por defecto: se marca al redactar cada acta */
export async function guardarComiteDefecto(formData: FormData): Promise<Resultado> {
  const miembros = [...new Set(formData.getAll("miembros").map(String).filter(Boolean))];
  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: miembros })
    .eq("key", "comite_miembros")
    .select("key");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("El comité por defecto lo fija la dirección de IWL.");
  revalidatePath("/admin/programa");
  return ok("Guardado. Saldrán marcados al redactar cada acta.");
}
