"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * Acciones de la hoja de ruta.
 *
 * Diseñarla es de IWL: las políticas de `roadmap_stages` solo dejan escribir a
 * quien es del equipo. La compañía no mueve sus etapas, porque cambiar el plan
 * es una conversación y no un formulario; lo que sí hace es cargar avances y
 * mover hitos, que tienen sus propias reglas.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
}

const numeroOpcional = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, "No puede ser un número negativo.");

// -----------------------------------------------------------------------------
// Diseñar la hoja de ruta desde una plantilla
// -----------------------------------------------------------------------------

const esquemaInstanciar = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  template_id: uuid,
  starts_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como 2026-12-31."),
  annex_id: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim())),
});

export async function disenarHojaDeRuta(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaInstanciar, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  const { data, error: falloBase } = await supabase.rpc("instanciar_hoja_de_ruta", {
    target_company: datos.company_id,
    template: datos.template_id,
    inicio: datos.starts_on,
    ...(datos.annex_id ? { target_annex: datos.annex_id } : {}),
  });

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok(
    `Hoja de ruta creada con ${data} ${data === 1 ? "etapa" : "etapas"}. A partir de aquí es de este proyecto: edítala como haga falta.`,
  );
}

// -----------------------------------------------------------------------------
// Etapas
// -----------------------------------------------------------------------------

const esquemaEtapa = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  name: textoObligatorio(3, "Ponle nombre a la etapa."),
  objective: textoObligatorio(
    10,
    "Escribe qué se persigue en esta etapa. Sin objetivo, una etapa es solo un plazo.",
  ),
  order_index: z.coerce.number().int().min(0),
  starts_on: fechaOpcional,
  ends_on: fechaOpcional,
  planned_hours: numeroOpcional,
  planned_cash: numeroOpcional,
  notes: textoOpcional,
});

export async function crearEtapa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEtapa, formData);
  if (fallo) return fallo;

  if (datos.starts_on && datos.ends_on && datos.ends_on < datos.starts_on) {
    return error("La etapa no puede terminar antes de empezar.", { ends_on: "Antes del inicio." });
  }

  const supabase = await clienteServidor();
  const { slug, ...fila } = datos;

  const { error: falloBase } = await supabase.from("roadmap_stages").insert(fila);
  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Etapa añadida.");
}

const esquemaEditarEtapa = esquemaEtapa
  .omit({ company_id: true })
  .extend({ id: uuid, status: z.enum(["planificada", "en_curso", "completada", "cancelada"]) });

export async function editarEtapa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEditarEtapa, formData);
  if (fallo) return fallo;

  if (datos.starts_on && datos.ends_on && datos.ends_on < datos.starts_on) {
    return error("La etapa no puede terminar antes de empezar.", { ends_on: "Antes del inicio." });
  }

  const supabase = await clienteServidor();
  const { slug, id, ...cambios } = datos;

  const { error: falloBase } = await supabase
    .from("roadmap_stages")
    .update(cambios)
    .eq("id", id);

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Etapa guardada.");
}

const esquemaBorrarEtapa = z.object({ slug: textoObligatorio(), id: uuid });

/**
 * Borrar una etapa no borra sus hitos.
 *
 * La columna `stage_id` es `on delete set null`, así que los hitos siguen
 * existiendo y pasan a la lista de sueltos. Un hito acordado no desaparece
 * porque se reorganice el plan.
 */
export async function borrarEtapa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaBorrarEtapa, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("roadmap_stages")
    .delete()
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Etapa eliminada. Sus hitos siguen ahí, sin etapa asignada.");
}

// -----------------------------------------------------------------------------
// Hitos dentro de una etapa
// -----------------------------------------------------------------------------

const esquemaHito = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  stage_id: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim())),
  title: textoObligatorio(3, "Ponle título al hito."),
  success_criteria: textoObligatorio(
    10,
    "Escribe qué tiene que pasar para darlo por cumplido. Sin criterio, «cumplido» es una opinión.",
  ),
  description: textoOpcional,
  due_date: fechaOpcional,
  gates_investable: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export async function crearHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHito, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...fila } = datos;

  const { error: falloBase } = await supabase
    .from("milestones")
    .insert({ ...fila, origin: "acordado" });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Hito añadido.");
}

const esquemaMoverHito = z.object({
  slug: textoObligatorio(),
  id: uuid,
  stage_id: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim())),
});

export async function moverHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaMoverHito, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("milestones")
    .update({ stage_id: datos.stage_id })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Hito movido.");
}

// -----------------------------------------------------------------------------
// Plantillas
//
// El catálogo de recorridos del programa. Es configuración de la dirección, no
// de un proyecto: las políticas exigen `app.is_admin()`.
// -----------------------------------------------------------------------------

const ESTADOS_ENTRADA = [
  "idea",
  "prototipo",
  "mvp",
  "primeros_clientes",
  "facturacion",
] as const;

function refrescarPlantillas() {
  revalidatePath("/admin/rutas");
}

const esquemaPlantilla = z.object({
  code: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(_[a-z0-9]+)*$/,
      "En minúsculas y con guiones bajos, como «desde_idea».",
    ),
  name: textoObligatorio(3, "¿Cómo se llama este recorrido?"),
  entry_state: z.enum(ESTADOS_ENTRADA),
  description: textoOpcional,
  duration_months: numeroOpcional,
});

export async function crearPlantilla(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPlantilla, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("roadmap_templates")
    .insert(datos);

  if (falloBase) {
    if (falloBase.code === "23505") {
      return error("Ya hay una plantilla con ese código.", {
        code: "Ese código está ocupado.",
      });
    }
    return traducirError(falloBase);
  }

  refrescarPlantillas();
  return ok("Plantilla creada. Añádele etapas para que sirva de algo.");
}

const esquemaEtapaPlantilla = z.object({
  template_id: uuid,
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/, "En minúsculas y con guiones bajos."),
  name: textoObligatorio(3),
  objective: textoObligatorio(10, "Qué se persigue en este tramo."),
  order_index: z.coerce.number().int().min(0),
  planned_weeks: numeroOpcional,
  planned_hours: numeroOpcional,
  planned_cash: numeroOpcional,
});

export async function crearEtapaPlantilla(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEtapaPlantilla, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("roadmap_template_stages")
    .insert(datos);

  if (falloBase) {
    if (falloBase.code === "23505") {
      return error("Esa plantilla ya tiene una etapa con ese código.", {
        code: "Código repetido en esta plantilla.",
      });
    }
    return traducirError(falloBase);
  }

  refrescarPlantillas();
  return ok("Etapa añadida a la plantilla.");
}

const esquemaHitoPlantilla = z.object({
  template_stage_id: uuid,
  title: textoObligatorio(3),
  success_criteria: textoObligatorio(
    10,
    "Escríbelo de forma que se pueda comprobar.",
  ),
  order_index: z.coerce.number().int().min(0),
  offset_weeks: numeroOpcional,
  gates_investable: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export async function crearHitoPlantilla(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHitoPlantilla, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("roadmap_template_milestones")
    .insert(datos);

  if (falloBase) {
    if (falloBase.code === "23505") {
      return error("Esa etapa ya tiene un hito en esa posición.", {
        order_index: "Posición ocupada.",
      });
    }
    return traducirError(falloBase);
  }

  refrescarPlantillas();
  return ok("Hito añadido a la plantilla.");
}

const esquemaBorrarDePlantilla = z.object({
  tabla: z.enum(["roadmap_template_stages", "roadmap_template_milestones"]),
  id: uuid,
});

/**
 * Borrar de una plantilla no toca las hojas de ruta ya creadas.
 *
 * Se copian al instanciar, precisamente para esto: reorganizar el catálogo no
 * puede reescribir el plan de un proyecto que está en marcha.
 */
export async function borrarDePlantilla(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaBorrarDePlantilla, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from(datos.tabla)
    .delete()
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescarPlantillas();
  return ok("Eliminado de la plantilla. Las hojas de ruta ya creadas no cambian.");
}

/**
 * Fijar el estado de entrada de una compañía ya dada de alta.
 *
 * No es un dato que cambie con el tiempo: es el estado del día que entró, y
 * por eso el recorrido que se le diseñó tiene sentido meses después. Se puede
 * corregir porque se puede haber clasificado mal, o quedar sin fijar.
 */
const esquemaEstadoEntrada = z.object({
  id: uuid,
  entry_state: z.enum(ESTADOS_ENTRADA),
});

export async function fijarEstadoEntrada(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEstadoEntrada, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("companies")
    .update({ entry_state: datos.entry_state })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  revalidatePath("/admin/companias");
  revalidatePath("/cartera", "layout");
  return ok();
}

// -----------------------------------------------------------------------------
// Avances
//
// Los escriben las dos partes. El carril lo pone la base según quién escribe,
// no el formulario: si se pudiera elegir, los dos carriles dejarían de
// significar nada.
// -----------------------------------------------------------------------------

const esquemaAvance = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  stage_id: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim())),
  milestone_id: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim())),
  entry_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como 2026-12-31."),
  title: textoObligatorio(5, "Una línea sobre qué ha pasado."),
  body: textoOpcional,
  evidence_url: textoOpcional,
});

export async function registrarAvance(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAvance, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...fila } = datos;

  /*
   * `side` es obligatorio en la tabla y lo sobrescribe el trigger. Se manda
   * un valor cualquiera para satisfacer al tipo generado; el que quede es el
   * que decida la base según quién escribe.
   */
  const { error: falloBase } = await supabase
    .from("progress_entries")
    .insert({ ...fila, side: "compania" });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Avance registrado.");
}

const esquemaBorrarAvance = z.object({ slug: textoObligatorio(), id: uuid });

export async function borrarAvance(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaBorrarAvance, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("progress_entries")
    .delete()
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Avance eliminado.");
}

// -----------------------------------------------------------------------------
// Aportación que no son horas
// -----------------------------------------------------------------------------

const esquemaItem = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  stage_id: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim())),
  kind: z.enum(["compra", "evento", "reunion_inversor", "gestion"]),
  occurred_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como 2026-12-31."),
  title: textoObligatorio(5, "Una línea sobre qué se ha aportado."),
  description: textoOpcional,
  counterpart: textoOpcional,
  amount: numeroOpcional,
  market_value: numeroOpcional,
  outcome: textoOpcional,
});

export async function registrarAportacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaItem, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...fila } = datos;

  const { error: falloBase } = await supabase
    .from("contribution_items")
    .insert(fila);

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Aportación registrada.");
}
