"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio, marcarContrasenaTemporal } from "@/lib/supabase/servicio";
import { generarClave } from "@/lib/claves";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { leerFirmantes, type Situacion } from "@/lib/societario";
import { notificar } from "@/lib/correo";
import { direccionBase } from "@/lib/direccion";

/** Las fundadoras de una compañía, con su correo: a quien se avisa del Acuerdo */
async function fundadorasDe(companyId: string) {
  const { data } = await clienteServicio()
    .from("company_members")
    .select("profile_id, profiles ( email, full_name ), companies ( name )")
    .eq("company_id", companyId)
    .eq("member_role", "fundadora");
  return (data ?? []).flatMap((m) => {
    const p = m.profiles as unknown as { email: string | null; full_name: string | null } | null;
    const c = m.companies as unknown as { name: string } | null;
    return p?.email ? [{ profileId: m.profile_id, correo: p.email, nombre: p.full_name, compania: c?.name ?? "" }] : [];
  });
}

/**
 * El Anexo como propuesta de Acuerdo, y firmar el Acuerdo desde la
 * compañía en entrada.
 *
 * Todo va con la sesión: quién propone, acepta o firma lo dice la base
 * (`guard_estado_anexo`, `firmar_acuerdo`). Aquí se valida la forma y se
 * traduce el error.
 *
 * Casi ninguna devuelve mensaje: cada formulario vive en un estado del
 * Anexo que su propio éxito cambia, así que el acuse es la pantalla. Los
 * comentarios sí, porque su formulario se queda montado.
 */

const uuid = z.string().uuid();
const slug = z.string().trim().min(1);

function refrescar(s: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${s}`, "layout");
  revalidatePath("/cartera");
  revalidatePath("/embudo", "layout");
}

async function soloIwl() {
  const persona = await personaActual();
  if (!persona) return { persona: null, fallo: error("Tu sesión ha caducado. Vuelve a entrar.") };
  if (!esIwl(persona.role)) return { persona: null, fallo: error("Eso lo hace el equipo de IWL.") };
  return { persona, fallo: null };
}

const texto = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ?? "").trim() || null);

export async function proponerAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      id: uuid,
      slug,
      firmantes: texto,
      representante: texto,
      equity_fuera_motivo: texto,
      constitucion_prevista: texto,
    }),
    formData,
  );
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data: anexo } = await supabase
    .from("annexes")
    .select("id, company_id, companies ( situacion_societaria )")
    .eq("id", datos.id)
    .maybeSingle();
  if (!anexo) return error("Ese Anexo no existe o no está a tu alcance.");

  const situacion = (anexo.companies as unknown as { situacion_societaria: Situacion | null } | null)
    ?.situacion_societaria;
  if (!situacion) {
    return error("Antes de proponer el Acuerdo hace falta la situación societaria: de ella depende quién firma.");
  }
  if (situacion === "constituida" && !datos.representante) {
    return error("Falta quién firma en nombre de la sociedad.", { representante: "¿Quién la representa?" });
  }
  const firmantes = leerFirmantes(situacion, datos.firmantes, datos.representante);
  if (!firmantes.length) {
    return error("Falta quién firma el Acuerdo.", { firmantes: "Una persona por línea." });
  }

  /*
   * Sin sociedad, el equity se materializa al constituirla: el hito
   * «Constituir la sociedad» necesita su fecha prevista, y la base lo exige
   * para proponer. Se pone aquí, en el mismo paso, en vez de mandar a
   * buscar el hito a otra pantalla.
   */
  if (situacion !== "constituida" && datos.constitucion_prevista) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.constitucion_prevista)) {
      return error("La fecha se escribe como 2027-01-15.", { constitucion_prevista: "Fecha no válida." });
    }
    const { error: falloHito } = await supabase
      .from("milestones")
      .update({ due_date: datos.constitucion_prevista })
      .eq("company_id", anexo.company_id)
      .eq("origin", "societario")
      .neq("status", "cumplido");
    if (falloHito) return traducirError(falloHito);
  }

  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update({ firmantes, equity_fuera_motivo: datos.equity_fuera_motivo, status: "propuesto" })
    .eq("id", datos.id)
    .eq("status", "borrador")
    .select("id");
  if (falloBase) {
    if (/horquilla/.test(falloBase.message)) {
      return error(falloBase.message, { equity_fuera_motivo: "Escribe por qué se sale." });
    }
    if (/Constituir la sociedad/.test(falloBase.message)) {
      return error(falloBase.message, { constitucion_prevista: "¿Para cuándo está prevista?" });
    }
    return traducirError(falloBase);
  }
  if (!data?.length) return error("No se ha propuesto: el Anexo ya no está en borrador.");

  // A cada fundadora, su aviso por correo. Si no sale, queda para reintentar
  const { persona } = await soloIwl();
  for (const f of await fundadorasDe(anexo.company_id)) {
    await notificar(
      { correo: f.correo, nombre: f.nombre, profileId: f.profileId },
      "acuerdo_propuesto",
      { nombre: f.nombre, startup: f.compania, enlace: `${direccionBase()}/proyecto` },
      { companyId: anexo.company_id, autor: persona?.id },
    );
  }

  refrescar(datos.slug);
  return ok();
}

export async function volverABorrador(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ id: uuid, slug }), formData);
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update({ status: "borrador" })
    .eq("id", datos.id)
    .in("status", ["propuesto", "comentado", "aceptado"])
    .select("id");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("Ese Anexo ya no está propuesto.");

  refrescar(datos.slug);
  return ok();
}

export async function comentarAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      annex_id: uuid,
      company_id: uuid,
      slug,
      texto: z.string().trim().min(3, "Escribe qué quieres comentar."),
    }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("anexo_comentarios")
    .insert({ annex_id: datos.annex_id, company_id: datos.company_id, texto: datos.texto });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Enviado. Te responderemos aquí mismo. Si con la respuesta cambia algo, verás la propuesta nueva para aceptarla.");
}

export async function responderComentarioAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ id: uuid, slug, respuesta: z.string().trim().min(3, "Escribe la respuesta.") }),
    formData,
  );
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("anexo_comentarios")
    .update({ respuesta: datos.respuesta })
    .eq("id", datos.id)
    .select("company_id, profile_id, companies ( name ), profiles!anexo_comentarios_profile_id_fkey ( email, full_name )");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("No se ha guardado la respuesta.");

  // A quien comentó, la respuesta por correo
  const c = data[0];
  const ella = c.profiles as unknown as { email: string | null; full_name: string | null } | null;
  if (ella?.email) {
    const { persona } = await soloIwl();
    await notificar(
      { correo: ella.email, nombre: ella.full_name, profileId: c.profile_id },
      "respuesta_comentario",
      {
        nombre: ella.full_name,
        sobre: `el Acuerdo de ${(c.companies as unknown as { name: string } | null)?.name ?? "tu compañía"}`,
        respuesta: datos.respuesta,
        enlace: `${direccionBase()}/proyecto`,
      },
      { companyId: c.company_id, autor: persona?.id },
    );
  }

  refrescar(datos.slug);
  return ok();
}

export async function aceptarAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ id: uuid, slug }), formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("aceptar_anexo", { p_anexo: datos.id });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

const esquemaFirma = z.object({
  company_id: uuid,
  slug,
  stage: z.enum(["pre_semilla", "semilla", "serie_a"], { message: "¿En qué etapa entra?" }),
  tech_profile: z.enum(["software", "software_ia", "hardware"], { message: "¿Qué perfil técnico tiene?" }),
  phase_code: texto,
  roadmap_template: z
    .union([uuid, z.literal(""), z.null()])
    .optional()
    .transform((v) => v || null),
  roadmap_start: texto,
  firmado_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "¿Qué día se firma?"),
});

export async function firmarAcuerdo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaFirma, formData);
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("firmar_acuerdo", {
    p_company: datos.company_id,
    p_stage: datos.stage,
    p_tech_profile: datos.tech_profile,
    p_phase_code: datos.phase_code ?? undefined,
    p_roadmap_template: datos.roadmap_template ?? undefined,
    p_roadmap_start: datos.roadmap_start ?? undefined,
    p_firmado_on: datos.firmado_on,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

export async function pasarAAceleracion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      company_id: uuid,
      slug,
      motivo: z.string().trim().min(10, "Escribe el motivo: queda en el registro y le llega al mentor principal."),
    }),
    formData,
  );
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl") return error("La vía la cambia la dirección de IWL.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("pasar_a_aceleracion", {
    p_company: datos.company_id,
    p_motivo: datos.motivo,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

/**
 * Darle cuenta de fundadora a quien entró con el NDA firmado fuera: sin
 * cuenta no puede leer ni aceptar la propuesta, y no hay otro camino.
 *
 * La cuenta se crea con la clave de servicio, que es lo único que puede
 * escribir en `auth.users`; por eso la autorización se comprueba aquí a
 * mano antes. Hacerla fundadora de la compañía lo decide la base
 * (`dar_acceso_fundadora`), con la sesión de quien pulsa.
 *
 * Con la cuenta nueva le llega el correo con un enlace para elegir su
 * contraseña, como el del NDA (REVISION, 11 nov). La temporal sale además
 * en el mensaje una sola vez, por si hay que dársela por otro canal: el
 * panel se cierra con «Hecho».
 */
export async function darAccesoFundadora(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ company_id: uuid, slug }), formData);
  if (fallo) return fallo;
  const { fallo: sinPermiso, persona } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data: candidatura } = await supabase
    .from("candidaturas")
    .select("id, nombre, contacto_email, contacto_nombre, contacto_apellidos")
    .eq("company_id", datos.company_id)
    .maybeSingle();
  if (!candidatura?.contacto_email) {
    return error(
      "Esta compañía no viene del embudo, así que no hay persona de contacto. Dale de alta a la fundadora en Administración → Personas, con el papel «Equipo fundador».",
    );
  }

  const servicio = clienteServicio();
  const clave = generarClave();
  const { data: creada, error: falloAlta } = await servicio.auth.admin.createUser({
    email: candidatura.contacto_email,
    email_confirm: true,
    password: clave,
    user_metadata: { full_name: candidatura.contacto_nombre, last_name: candidatura.contacto_apellidos },
  });

  let profileId = creada?.user?.id;
  let nueva = true;
  if (falloAlta) {
    if (!/already|registered|exists/i.test(falloAlta.message)) {
      return error(`No se ha podido crear la cuenta: ${falloAlta.message}`);
    }
    // Ya tenía cuenta: se reutiliza, sin tocar su contraseña
    const { data: existente } = await servicio
      .from("profiles")
      .select("id")
      .eq("email", candidatura.contacto_email)
      .maybeSingle();
    if (!existente) return error("Esa cuenta existe pero no se recupera.");
    profileId = existente.id;
    nueva = false;
  } else if (profileId) {
    const { error: falloMarca } = await marcarContrasenaTemporal(servicio, profileId);
    if (falloMarca) return error(`No se ha podido preparar la cuenta: ${falloMarca.message}`);
  }

  const { error: falloAcceso } = await supabase.rpc("dar_acceso_fundadora", {
    p_company: datos.company_id,
    p_profile: profileId!,
  });
  if (falloAcceso) return traducirError(falloAcceso);

  // Si no sale, no falla: ya tiene cuenta, y queda «sin enviar» para reintentarlo
  const correo = nueva
    ? await notificar(
        { correo: candidatura.contacto_email, nombre: candidatura.contacto_nombre, profileId },
        "acceso_dado",
        { nombre: candidatura.contacto_nombre, startup: candidatura.nombre },
        { candidaturaId: candidatura.id, companyId: datos.company_id, autor: persona?.id },
      )
    : null;
  const aviso = !correo
    ? ""
    : correo.estado === "enviado"
      ? " Le ha llegado un correo con un enlace para entrar y elegir su contraseña."
      : " El correo no ha salido; queda «sin enviar» para reintentarlo.";

  refrescar(datos.slug);
  return nueva
    ? {
        ok: true,
        mensaje: `Acceso dado a ${candidatura.contacto_email}.${aviso} Por si hace falta por otro canal: su contraseña es ${clave} — cópiala ahora, no se vuelve a enseñar. Al entrar la cambiará.`,
        datos: {
          correo: candidatura.contacto_email,
          nombre: candidatura.contacto_nombre ?? "",
          clave,
        },
      }
    : { ok: true, mensaje: `${candidatura.contacto_email} ya tenía cuenta: entra con la suya, que no se ha tocado.` };
}
