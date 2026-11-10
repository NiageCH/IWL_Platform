"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { leerFirmantes, type Situacion } from "@/lib/societario";

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
    z.object({ id: uuid, slug, firmantes: texto, representante: texto }),
    formData,
  );
  if (fallo) return fallo;
  const { fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data: anexo } = await supabase
    .from("annexes")
    .select("id, companies ( situacion_societaria )")
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

  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update({ firmantes, status: "propuesto" })
    .eq("id", datos.id)
    .eq("status", "borrador")
    .select("id");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("No se ha propuesto: el Anexo ya no está en borrador.");

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
    .select("id");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("No se ha guardado la respuesta.");

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
