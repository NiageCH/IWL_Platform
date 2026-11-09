"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";

/**
 * Las acciones del alta: cerrar un aviso, dejar constancia de un
 * recordatorio y fijar cuándo un paso parado pide atención.
 *
 * Todas con el cliente de sesión. Quién puede lo dice la base: los avisos
 * son de dirección por RLS, y el registro de actividad solo admite filas a
 * nombre de quien las escribe.
 */

function refrescar() {
  revalidatePath("/", "layout");
}

const uuid = z.string().uuid();

export async function cerrarAviso(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ id: uuid }), formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("avisos")
    .update({ cerrado_at: new Date().toISOString(), cerrado_por: persona.id })
    .eq("id", datos.id)
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("Los avisos los atiende la dirección de IWL.");

  refrescar();
  // El acuse es que el aviso desaparece de la lista
  return ok();
}

const esquemaRecordatorio = z.object({
  persona_id: uuid,
  candidatura_id: uuid.optional().or(z.literal("")),
  paso: z.string().min(1),
  canal: z.enum(["correo", "whatsapp"]),
});

/**
 * Un recordatorio sale fuera de la plataforma —un correo, un WhatsApp— y
 * aquí solo se apunta que se mandó. Así quien mira la ficha sabe que ya se
 * le recordó, y cuándo, antes de mandar otro.
 */
export async function registrarRecordatorio(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaRecordatorio, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona || !esIwl(persona.role)) {
    return error("Recordar un paso es del equipo de IWL.");
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.from("activity_log").insert({
    actor_id: persona.id,
    entity: datos.candidatura_id ? "candidaturas" : "profiles",
    entity_id: datos.candidatura_id || datos.persona_id,
    action: "recordatorio",
    detail: { paso: datos.paso, canal: datos.canal, persona_id: datos.persona_id },
  });

  if (falloBase) return traducirError(falloBase);
  return ok();
}

const esquemaUmbrales = z
  .object({
    atencion_dias: z.coerce.number().int().min(1).max(90),
    vencido_dias: z.coerce.number().int().min(1).max(180),
  })
  .refine((d) => d.vencido_dias > d.atencion_dias, {
    message: "Vencido tiene que llegar después de atención.",
    path: ["vencido_dias"],
  });

export async function guardarUmbralesAlta(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaUmbrales, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: datos })
    .eq("key", "onboarding_umbrales")
    .select("key");

  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("Los umbrales los fija la dirección de IWL.");

  refrescar();
  return ok("Guardado. Los pasos se recalculan al abrir cada ficha.");
}
