"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
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
 * Acciones del due diligence tecnológico (§4.4).
 *
 * Ninguna comprueba permisos por su cuenta: escriben con el cliente de sesión
 * y es la base la que decide, con sus políticas y sus triggers. Si aquí se
 * duplicara la regla, acabaría divergiendo de la de la base, y la que manda es
 * la de la base.
 */

/** Refresca las dos rutas que enseñan lo mismo: la de la fundadora y la de IWL */
function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
}

const esquemaPuntuacion = z.object({
  slug: textoObligatorio(),
  assessment_id: uuid,
  dimension_id: uuid,
  level: z.coerce
    .number()
    .int()
    .min(0, "El nivel va de 0 a 4.")
    .max(4, "El nivel va de 0 a 4."),
  evidence: textoObligatorio(
    10,
    "Una puntuación sin evidencia no es una evaluación. Escribe en qué te basas.",
  ),
  rationale: textoOpcional,
});

/**
 * Puntúa una dimensión. La evidencia es obligatoria: es la diferencia entre
 * una evaluación y una opinión.
 */
export async function puntuarDimension(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPuntuacion, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();

  const { data: evaluacion } = await supabase
    .from("tech_assessments")
    .select("company_id")
    .eq("id", datos.assessment_id)
    .maybeSingle();

  if (!evaluacion) return error("Esa evaluación no existe o no está a tu alcance.");

  const { error: falloBase } = await supabase.from("tech_scores").upsert(
    {
      assessment_id: datos.assessment_id,
      company_id: evaluacion.company_id,
      dimension_id: datos.dimension_id,
      level: datos.level,
      evidence: datos.evidence,
      rationale: datos.rationale,
      source: "manual",
      scored_by: persona.id,
      scored_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,dimension_id" },
  );

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Puntuación guardada.");
}

const esquemaHallazgo = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  assessment_id: uuid,
  dimension_id: uuid,
  severity: z.enum(["critico", "alto", "medio", "bajo"]),
  title: textoObligatorio(5, "Ponle un título que se entienda de un vistazo."),
  description: textoObligatorio(20, "Describe qué has encontrado y dónde."),
  evidence: textoOpcional,
  recommendation: textoObligatorio(
    20,
    "Un hallazgo sin recomendación deja a la compañía sin siguiente paso.",
  ),
});

export async function registrarHallazgo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHallazgo, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...hallazgo } = datos;

  const { error: falloBase } = await supabase.from("tech_findings").insert(hallazgo);
  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Hallazgo registrado.");
}

const esquemaEstadoHallazgo = z.object({
  slug: textoObligatorio(),
  id: uuid,
  status: z.enum(["abierto", "en_curso", "resuelto", "aceptado"]),
  acceptance_note: textoOpcional,
});

export async function cambiarEstadoHallazgo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEstadoHallazgo, formData);
  if (fallo) return fallo;

  if (datos.status === "aceptado" && !datos.acceptance_note) {
    return error("Aceptar un riesgo exige escribir por qué se asume.", {
      acceptance_note: "Explica por qué se asume este riesgo.",
    });
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("tech_findings")
    .update({
      status: datos.status,
      acceptance_note: datos.status === "aceptado" ? datos.acceptance_note : null,
      resolved_at: datos.status === "resuelto" ? new Date().toISOString() : null,
    })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

const esquemaPuntoPlan = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  finding_id: idOpcional,
  title: textoObligatorio(5, "Ponle un título."),
  description: textoOpcional,
  owner: z.enum(["compania", "niage"]),
  effort_days: z.coerce.number().min(0).max(999).optional(),
  estimated_cost: z.coerce.number().min(0).optional(),
  quarter: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    })
    .refine(
      (v) => v === null || /^\d{4}-T[1-4]$/.test(v),
      "El trimestre se escribe como 2026-T4.",
    ),
  due_date: fechaOpcional,
});

export async function crearPuntoPlan(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPuntoPlan, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...punto } = datos;

  const { error: falloBase } = await supabase.from("tech_plan_items").insert(punto);
  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Punto añadido al plan.");
}

const esquemaEstadoPlan = z.object({
  slug: textoObligatorio(),
  id: uuid,
  status: z.enum(["pendiente", "en_curso", "hecho", "descartado"]),
});

/**
 * El estado de un punto del plan lo mueven las dos partes: el trabajo es
 * compartido y la compañía tiene que poder decir que ya está hecho.
 */
export async function cambiarEstadoPuntoPlan(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEstadoPlan, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("tech_plan_items")
    .update({ status: datos.status })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

const esquemaRespuesta = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  criterion_id: uuid,
  answer: textoOpcional,
});

/** El cuestionario lo responde la fundadora o su CTO (§4.4 capa 2) */
export async function responderCuestionario(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaRespuesta, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("tech_questionnaire_answers")
    .upsert(
      {
        company_id: datos.company_id,
        criterion_id: datos.criterion_id,
        answer: datos.answer,
        answered_by: persona.id,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "company_id,criterion_id" },
    );

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Respuesta guardada.");
}
