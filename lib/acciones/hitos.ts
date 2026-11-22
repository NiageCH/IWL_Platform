"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  idOpcional,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";
import { importeEscrito } from "@/lib/importes";

/**
 * El circuito de un hito: ella entrega, quien revisa valida o pide cambios.
 *
 * Las tres primeras llaman a funciones de la base (`entregar_hito`,
 * `validar_hito`, `pedir_cambios_hito`), que son las que guardan la
 * entrega en el historial, avisan y dejan lo devengado en el registro. Lo
 * que no pase por ellas, la base no lo deja hacer: aquí solo se valida la
 * entrada y se traduce el resultado.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
}

export async function entregarHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), id: uuid, nota: textoOpcional }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("entregar_hito", {
    p_hito: datos.id,
    p_nota: datos.nota ?? undefined,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  /*
   * Sin mensaje: el panel de entrega solo existe mientras el hito está
   * abierto, y entregarlo lo cierra. El acuse es el hito cambiado —
   * «Entregado · por revisar» o «Cumplido»—.
   */
  return ok();
}

export async function validarHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), id: uuid, nota: textoOpcional }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("validar_hito", {
    p_hito: datos.id,
    p_nota: datos.nota ?? undefined,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

export async function pedirCambiosHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      slug: textoObligatorio(),
      id: uuid,
      comentario: textoObligatorio(3, "Di qué hay que cambiar: ella lo lee en el hito."),
    }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("pedir_cambios_hito", {
    p_hito: datos.id,
    p_comentario: datos.comentario,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

export async function comentarHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), id: uuid, nota: textoObligatorio(2, "Escribe la nota.") }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("comentar_hito", {
    p_hito: datos.id,
    p_nota: datos.nota,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Nota guardada.");
}

/**
 * Cómo se revisa: si pide validación y a quién se le encarga.
 *
 * Lo decide quien coordina. Con equity, financiación o «condiciona
 * invertible», la validación no se puede quitar: la base lo impide con una
 * restricción, y aquí solo se dice con palabras.
 */
export async function configurarRevisionHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      slug: textoObligatorio(),
      id: uuid,
      requiere: z.preprocess((v) => v === "on", z.boolean()),
      revisor: idOpcional,
    }),
    formData,
  );
  if (fallo) return fallo;
  if (!(await personaActual())) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("milestones")
    .update({ requires_validation: datos.requiere, reviewer_id: datos.revisor })
    .eq("id", datos.id)
    .select("id");

  if (falloBase) {
    if (falloBase.code === "23514") {
      return error(
        "Este hito tiene efecto económico o condiciona invertible: la validación del mentor es obligatoria.",
      );
    }
    return traducirError(falloBase);
  }
  if (!data || data.length === 0) return error("No se ha guardado: este hito no está a tu alcance.");

  refrescar(datos.slug);
  return ok("Guardado.");
}

/**
 * La financiación que libera un hito. Solo dirección, y solo con el Anexo en
 * borrador: lo comprueba la base, que además no deja repartir más de lo que
 * el Anexo compromete. El equity ya no va por hitos (REVISION, 22 nov).
 */
export async function marcarHitoEconomico(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      slug: textoObligatorio(),
      id: uuid,
      financiacion: z
        .union([z.string(), z.null()])
        .optional()
        .transform((v) => importeEscrito(v))
        .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Escribe el importe en euros, por ejemplo 20.000."),
    }),
    formData,
  );
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl") return error("La financiación de un hito la pone dirección.");

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("milestones")
    .update({
      // Cero es quitar la marca
      releases_funding: datos.financiacion ? datos.financiacion : null,
    })
    .eq("id", datos.id)
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data || data.length === 0) return error("No se ha guardado: este hito no está a tu alcance.");

  refrescar(datos.slug);
  return ok("Guardado.");
}
