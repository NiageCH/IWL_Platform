"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/supabase/servicio";
import { notificar } from "@/lib/correo";
import { direccionBase } from "@/lib/direccion";
import { error, ok, traducirError, uuid, validar, type Resultado } from "@/lib/acciones/resultado";

/**
 * Lo que se decide a mano del filtro (REVISION, 22 nov · bloque 3): la
 * revisión manual, sacar una candidatura del «no pasa» y responder a una
 * recomendación. Quién puede cada cosa lo dice la base
 * (`decidir_filtro`, `responder_recomendacion`); aquí solo se llama y,
 * si acaba en «no pasa», se le escribe a ella con el motivo.
 */

function refrescar(id: string) {
  revalidatePath(`/embudo/${id}`);
  revalidatePath("/embudo");
  revalidatePath("/cartera", "layout");
}

/** El correo del «no pasa», con el motivo que quedó en la candidatura */
async function avisarNoPasa(candidaturaId: string) {
  const { data: c } = await clienteServicio()
    .from("candidaturas")
    .select("nombre, contacto_nombre, contacto_apellidos, contacto_email, filtro, filtro_motivo, token, token_anulado_at")
    .eq("id", candidaturaId)
    .maybeSingle();
  if (!c || c.filtro !== "no_pasa" || !c.contacto_email) return;
  await notificar(
    { correo: c.contacto_email, nombre: `${c.contacto_nombre} ${c.contacto_apellidos ?? ""}`.trim() },
    "filtro_no_pasa",
    {
      nombre: c.contacto_nombre,
      startup: c.nombre,
      motivo: c.filtro_motivo,
      enlace: c.token && !c.token_anulado_at ? `${direccionBase()}/candidatura/${c.token}` : direccionBase(),
    },
    { candidaturaId },
  );
}

export async function decidirFiltro(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      candidatura_id: uuid,
      pasa: z.enum(["si", "no"], { message: "¿Pasa o no pasa?" }),
      motivo: z.string().trim().min(10, "Escribe el motivo: queda registrado en la candidatura."),
    }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("decidir_filtro", {
    p_candidatura: datos.candidatura_id,
    p_pasa: datos.pasa === "si",
    p_motivo: datos.motivo,
  });
  if (falloBase) return traducirError(falloBase);

  if (datos.pasa === "no") await avisarNoPasa(datos.candidatura_id);
  refrescar(datos.candidatura_id);
  return ok();
}

export async function responderRecomendacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ candidatura_id: uuid, confirma: z.enum(["si", "no"]) }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("responder_recomendacion", {
    p_candidatura: datos.candidatura_id,
    p_confirma: datos.confirma === "si",
  });
  if (falloBase) return traducirError(falloBase);

  if (datos.confirma === "no") await avisarNoPasa(datos.candidatura_id);
  refrescar(datos.candidatura_id);
  return ok();
}
