"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { notificar } from "@/lib/correo";
import { direccionBase } from "@/lib/direccion";
import { nombreCompleto } from "@/lib/etiquetas";
import { fecha as textoFecha } from "@/lib/utils";
import {
  enlaceOpcional,
  error,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * El circuito de una sesión (REVISION, 13 nov): quien acompaña la
 * registra, ella confirma o dice que no cuadra, se habla en el hilo y, si
 * no hay acuerdo, decide dirección.
 *
 * Cada paso es una función de la base, que guarda la historia, mueve el
 * estado y abre o cierra los avisos. Lo que no pase por ellas, la base no
 * lo deja hacer: aquí solo se valida la entrada y se traduce el resultado.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
}

/** «2,5» o «2.5»: las horas se escriben a mano */
function horasEscritas(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const esquemaSesion = z
  .object({
    slug: textoObligatorio(),
    company_id: uuid,
    kind: z.enum(["sesion", "trabajo"]),
    held_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pon la fecha."),
    duration_minutes: z.coerce.number().int().min(5).max(1440).optional().or(z.literal("").transform(() => undefined)),
    modality: z.enum(["presencial", "videollamada", "telefono"]).optional().or(z.literal("").transform(() => undefined)),
    attendees_company: textoOpcional,
    title: textoObligatorio(3, "Di en una línea de qué fue."),
    subject_id: uuid,
    pillar_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    worked: textoObligatorio(10, "Cuenta qué se trabajó: es el acta."),
    deliverable_url: enlaceOpcional,
  })
  .superRefine((d, ctx) => {
    if (d.kind === "sesion" && !d.duration_minutes) {
      ctx.addIssue({ code: "custom", path: ["duration_minutes"], message: "¿Cuánto duró?" });
    }
    if (d.kind === "sesion" && !d.modality) {
      ctx.addIssue({ code: "custom", path: ["modality"], message: "¿Cómo fue?" });
    }
    if (d.kind === "trabajo" && !d.deliverable_url) {
      ctx.addIssue({ code: "custom", path: ["deliverable_url"], message: "Sin entregable no se imputa: enlázalo." });
    }
  });

/**
 * Registrar una sesión o un trabajo fuera de sesión, con su acta, sus
 * acuerdos y las horas de cada persona de IWL. Va todo en una función de
 * la base: o queda todo o no queda nada.
 */
export async function registrarSesion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaSesion, formData);
  if (fallo) return fallo;
  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  // Las horas de cada persona, fila a fila
  const quienes = formData.getAll("hora_persona").map(String);
  const perfiles = formData.getAll("hora_perfil").map(String);
  const cantidades = formData.getAll("hora_cantidad").map(String);
  const horas: Array<{ profile_id: string; profile_code: string; hours: number }> = [];
  for (let i = 0; i < quienes.length; i++) {
    if (!quienes[i]) continue;
    const h = horasEscritas(cantidades[i] ?? "");
    if (h === null || h <= 0 || h > 24) {
      return error("Las horas de cada persona tienen que ser un número entre 0 y 24.", { horas: "Revisa las horas." });
    }
    if (!perfiles[i]) return error("Elige el perfil de tarifa de cada persona.", { horas: "Falta un perfil." });
    horas.push({ profile_id: quienes[i], profile_code: perfiles[i], hours: h });
  }
  if (!horas.length) return error("Pon las horas de al menos una persona de IWL.", { horas: "Sin horas no hay nada que confirmar." });

  const acuerdos = formData
    .getAll("acuerdo_texto")
    .map((t, i) => ({
      body: String(t).trim(),
      owner_name: String(formData.getAll("acuerdo_responsable")[i] ?? "").trim(),
      due_on: String(formData.getAll("acuerdo_fecha")[i] ?? ""),
    }))
    .filter((a) => a.body);

  const { slug, ...sesion } = datos;
  const supabase = await clienteServidor();
  const { data: id, error: falloBase } = await supabase.rpc("registrar_sesion", {
    p: { ...sesion, acuerdos, horas },
  });
  if (falloBase) return traducirError(falloBase);

  await avisarAEllas(String(id));
  refrescar(slug);
  return ok();
}

/** El correo a cada fundadora con cuenta: «… ha registrado 2 h. ¿Lo confirmas?» */
async function avisarAEllas(sesionId: string) {
  const supabase = await clienteServidor();
  const { data: s } = await supabase
    .from("work_sessions")
    .select("company_id, kind, held_on, title, registered_by, contribution_hours ( hours ), companies ( name )")
    .eq("id", sesionId)
    .single();
  if (!s) return;
  const { data: ellas } = await supabase
    .from("company_members")
    .select("profile_id, profiles ( email, full_name, last_name )")
    .eq("company_id", s.company_id)
    .eq("member_role", "fundadora");
  const persona = await personaActual();
  const quien = persona ? nombreCompleto(persona.full_name, persona.last_name) || "IWL" : "IWL";
  const horas = (s.contribution_hours ?? []).reduce((t, h) => t + Number(h.hours), 0);
  for (const m of ellas ?? []) {
    const p = m.profiles as unknown as { email: string | null; full_name: string | null } | null;
    if (!p?.email) continue;
    await notificar(
      { correo: p.email, nombre: p.full_name, profileId: m.profile_id },
      "sesion_registrada",
      {
        nombre: p.full_name,
        quien,
        horas: String(horas).replace(".", ","),
        que: s.kind === "sesion" ? "sesión" : "trabajo",
        fecha: textoFecha(s.held_on),
        titulo: s.title,
        enlace: `${direccionBase()}/proyecto/sesiones#sesion-${sesionId}`,
      },
      { companyId: s.company_id, autor: persona?.id },
    );
  }
}

/** Los pasos de un clic o con un comentario: todos llaman a su función */
async function paso(
  formData: FormData,
  funcion:
    | "confirmar_sesion"
    | "sesion_no_cuadra"
    | "comentar_sesion"
    | "mantener_horas_sesion"
    | "llevar_sesion_a_direccion"
    | "anular_sesion",
  campo: "p_comentario" | "p_motivo",
  obligatorio: boolean,
  falta: string,
): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      slug: textoObligatorio(),
      id: uuid,
      texto: obligatorio ? textoObligatorio(5, falta) : textoOpcional,
    }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");
  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc(funcion, {
    p_sesion: datos.id,
    [campo]: datos.texto ?? undefined,
  } as never);
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  // El acuse es la sesión cambiada: su estado y su historia
  return ok();
}

export async function confirmarSesion(formData: FormData) {
  return paso(formData, "confirmar_sesion", "p_comentario", false, "");
}

export async function noCuadraSesion(formData: FormData) {
  return paso(formData, "sesion_no_cuadra", "p_comentario", true, "Di qué no cuadra: por ejemplo, «fue 1 h, no 2».");
}

export async function comentarSesion(formData: FormData) {
  return paso(formData, "comentar_sesion", "p_comentario", true, "Escribe el comentario.");
}

export async function mantenerHorasSesion(formData: FormData) {
  return paso(formData, "mantener_horas_sesion", "p_motivo", true, "Explícale por qué se mantienen.");
}

export async function llevarSesionADireccion(formData: FormData) {
  return paso(formData, "llevar_sesion_a_direccion", "p_motivo", true, "Di por qué no os ponéis de acuerdo.");
}

export async function anularSesion(formData: FormData) {
  return paso(formData, "anular_sesion", "p_motivo", true, "Di por qué se anula.");
}

export async function corregirHorasSesion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      slug: textoObligatorio(),
      id: uuid,
      linea: uuid,
      horas: textoObligatorio(1, "Pon las horas."),
      texto: textoObligatorio(5, "Di por qué cambian las horas."),
    }),
    formData,
  );
  if (fallo) return fallo;
  const horas = horasEscritas(datos.horas);
  if (horas === null || horas <= 0 || horas > 24) return error("Las horas tienen que ser un número entre 0 y 24.", { horas: "Revisa la cifra." });
  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("corregir_horas_sesion", {
    p_sesion: datos.id,
    p_linea: datos.linea,
    p_horas: horas,
    p_motivo: datos.texto,
  });
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}

/** Dirección decide: puede cambiar las horas de cada línea, y deja escrito por qué */
export async function decidirSesion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), id: uuid, texto: textoObligatorio(5, "Deja escrito qué se decide y por qué.") }),
    formData,
  );
  if (fallo) return fallo;
  const lineas = formData.getAll("linea").map(String);
  const cifras = formData.getAll("linea_horas").map(String);
  const horas: Array<{ linea: string; horas: number }> = [];
  for (let i = 0; i < lineas.length; i++) {
    const h = horasEscritas(cifras[i] ?? "");
    if (h === null || h <= 0 || h > 24) return error("Las horas tienen que ser un número entre 0 y 24.");
    horas.push({ linea: lineas[i], horas: h });
  }
  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("decidir_sesion", {
    p_sesion: datos.id,
    p_motivo: datos.texto,
    p_horas: horas,
  });
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}

/** Un acuerdo del acta, a tarea con un clic: la tarea dice de dónde viene */
export async function acuerdoATarea(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ slug: textoObligatorio(), id: uuid }), formData);
  if (fallo) return fallo;
  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  const supabase = await clienteServidor();
  const { data: a } = await supabase
    .from("session_agreements")
    .select("id, company_id, body, due_on, task_id")
    .eq("id", datos.id)
    .maybeSingle();
  if (!a) return error("Ese acuerdo ya no está.");
  if (a.task_id) return ok();
  const { data: tarea, error: falloTarea } = await supabase
    .from("tasks")
    .insert({
      company_id: a.company_id,
      title: a.body.slice(0, 200),
      description: a.body,
      due_date: a.due_on,
      source_entity: "session_agreement",
      source_id: a.id,
      created_by: persona.id,
    })
    .select("id")
    .single();
  if (falloTarea) return traducirError(falloTarea);
  const { error: falloEnlace } = await supabase.from("session_agreements").update({ task_id: tarea.id }).eq("id", a.id);
  if (falloEnlace) return traducirError(falloEnlace);
  refrescar(datos.slug);
  return ok();
}

export async function acuerdoAHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), id: uuid, hito: z.string().uuid("Elige el hito.") }),
    formData,
  );
  if (fallo) return fallo;
  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("session_agreements")
    .update({ milestone_id: datos.hito })
    .eq("id", datos.id);
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}
