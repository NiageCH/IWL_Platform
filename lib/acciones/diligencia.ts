"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  fechaOpcional,
  idOpcional,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * Acciones del due diligence general (§4.3).
 *
 * Quién puede poner un punto en `validado` o en `bloqueante` lo corta un
 * trigger de la base, no esta función. Aquí solo se valida la forma del dato.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
}

const esquemaEstado = z.object({
  slug: textoObligatorio(),
  id: uuid,
  status: z.enum(["pendiente", "entregado", "en_revision", "validado", "bloqueante"]),
  notes: textoOpcional,
});

export async function cambiarEstadoPunto(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEstado, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  // La nota solo se toca si viene en el formulario: quien mueve el estado
  // desde una lista no tiene por qué borrar lo que escribió otra persona
  const cambios =
    datos.notes === null
      ? { status: datos.status }
      : { status: datos.status, notes: datos.notes };

  const { error: falloBase } = await supabase
    .from("dd_items")
    .update(cambios)
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

const esquemaHallazgo = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  area_id: uuid,
  dd_item_id: idOpcional,
  severity: z.enum(["critico", "alto", "medio", "bajo"]),
  title: textoObligatorio(5, "Ponle un título que se entienda de un vistazo."),
  description: textoObligatorio(20, "Describe qué has encontrado."),
  impact: textoOpcional,
  resolution_plan: textoOpcional,
  due_date: fechaOpcional,
});

export async function registrarHallazgoGeneral(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHallazgo, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...hallazgo } = datos;

  const { error: falloBase } = await supabase.from("findings").insert(hallazgo);
  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Hallazgo registrado.");
}
