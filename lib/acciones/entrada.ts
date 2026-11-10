"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { camposSocietarios, exigir, paraGuardar } from "@/lib/societario";

/**
 * La compañía en entrada: la situación que dice ella, la confirmación de
 * IWL y la decisión de incorporarla.
 *
 * Las tres van con la sesión. Quién puede cada una lo dice la base: el
 * guardián de gobierno deja a la fundadora decir la situación una sola vez,
 * y la decisión es de dirección por su política.
 *
 * Ninguna devuelve mensaje: cada formulario vive en una condición que su
 * propio éxito vuelve falsa —sin decir, sin confirmar, sin decidir—, así
 * que el acuse es la pantalla cambiada.
 */

function refrescar() {
  revalidatePath("/proyecto", "layout");
  revalidatePath("/cartera", "layout");
  revalidatePath("/embudo", "layout");
}

const uuid = z.string().uuid();

const esquemaSituacion = z
  .object({ company_id: uuid })
  .merge(camposSocietarios)
  .superRefine((d, ctx) => exigir(d, ctx));

export async function decirSituacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaSituacion, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("companies")
    .update(paraGuardar(datos))
    .eq("id", datos.company_id)
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("No se ha guardado: esta compañía no está a tu alcance.");

  refrescar();
  return ok();
}

export async function confirmarSituacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ company_id: uuid }), formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (!esIwl(persona.role)) return error("La situación la confirma el equipo de IWL.");

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("companies")
    .update({ situacion_confirmada_at: new Date().toISOString(), situacion_confirmada_por: persona.id })
    .eq("id", datos.company_id)
    .not("situacion_societaria", "is", null)
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("Todavía no hay situación que confirmar: primero tiene que decirla ella, o ponerla tú.");

  refrescar();
  return ok();
}

const esquemaDecision = z
  .object({
    company_id: uuid,
    decision: z.enum(["si", "no"], { message: "¿Se incorpora o no?" }),
    base: z.enum(["due_diligence", "estrategica"], { message: "¿En qué se basa la decisión?" }),
    motivo: z.string().trim().min(10, "Escribe el motivo: queda en el registro y es lo que se lee después."),
    mensaje: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => (v ?? "").trim() || null),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "no" && !d.mensaje) {
      ctx.addIssue({ code: "custom", path: ["mensaje"], message: "Si no se incorpora, hace falta el mensaje para ella." });
    }
  });

export async function decidirIncorporacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaDecision, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl") return error("La incorporación la decide la dirección de IWL.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.from("decisiones_incorporacion").insert({
    company_id: datos.company_id,
    decision: datos.decision,
    base: datos.base,
    motivo: datos.motivo,
    mensaje: datos.decision === "no" ? datos.mensaje : null,
  });

  if (falloBase) {
    if (falloBase.code === "23505") return error("Esta compañía ya tiene su decisión. Una decisión no se cambia.");
    return traducirError(falloBase);
  }

  refrescar();
  return ok();
}
