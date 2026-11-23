"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { error, traducirError, uuid, validar, type Resultado } from "@/lib/acciones/resultado";

/**
 * Cerrar una compañía: graduada, salida o baja (REVISION, 22 nov · bloque
 * 8). Es de dirección, y lo dice la base (`cerrar_compania`). Cerrada,
 * desaparece de la cartera, así que el acuse es el Histórico, donde queda.
 */
export async function cerrarCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      company_id: uuid,
      cierre: z.enum(["graduada", "salida", "baja"], { message: "Di cómo termina." }),
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "¿Qué día se cierra?"),
      motivo: z.string().trim().min(10, "Escribe por qué se cierra: queda en el Histórico."),
    }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("cerrar_compania", {
    p_company: datos.company_id,
    p_cierre: datos.cierre,
    p_fecha: datos.fecha,
    p_motivo: datos.motivo,
  });
  if (falloBase) return traducirError(falloBase);

  revalidatePath("/", "layout");
  redirect(`/admin/historico?cerrada=${datos.company_id}`);
}

/**
 * Reabrir una compañía cerrada por error (REVISION, 23 nov): dirección,
 * con motivo. Vuelve como estaba al cerrarse y el acuse es su ficha, de
 * vuelta en la cartera.
 */
export async function reabrirCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      company_id: uuid,
      slug: z.string().min(1),
      motivo: z.string().trim().min(10, "Escribe por qué se reabre: queda en el registro."),
    }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("reabrir_compania", {
    p_company: datos.company_id,
    p_motivo: datos.motivo,
  });
  if (falloBase) return traducirError(falloBase);

  revalidatePath("/", "layout");
  redirect(`/cartera/${datos.slug}`);
}
