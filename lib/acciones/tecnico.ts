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

/**
 * Abrir la evaluación técnica de una compañía.
 *
 * Faltaba por completo, y era un callejón sin salida: la pantalla decía
 * «todavía no hay una evaluación técnica publicada» y no había por dónde
 * empezar una. Las tres que existían venían de la semilla, así que
 * cualquier compañía nueva se quedaba con la sección muerta para siempre.
 *
 * Nace en borrador: la ve quien puede validar, no la compañía. La etapa y
 * el perfil se copian de la ficha en este momento y no se referencian,
 * porque una evaluación dice cómo estaba la compañía cuando se hizo.
 */
const esquemaAbrir = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
});

export async function abrirEvaluacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAbrir, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();

  const { data: compania } = await supabase
    .from("companies")
    .select("stage, tech_profile")
    .eq("id", datos.company_id)
    .maybeSingle();

  if (!compania) return error("Esa compañía no existe o no está a tu alcance.");

  // Una abierta sin terminar ya sirve: abrir dos a la vez solo confunde
  const { data: enCurso } = await supabase
    .from("tech_assessments")
    .select("id")
    .eq("company_id", datos.company_id)
    .eq("status", "borrador")
    .maybeSingle();

  if (enCurso) {
    return error("Ya hay una evaluación abierta sin publicar. Termina esa.");
  }

  const { error: falloBase } = await supabase.from("tech_assessments").insert({
    company_id: datos.company_id,
    reviewer_id: persona.id,
    stage: compania.stage,
    tech_profile: compania.tech_profile,
    status: "borrador",
    created_by: persona.id,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);

  /*
   * Sin mensaje, y a propósito.
   *
   * El formulario que llama a esto vive dentro de «si no hay evaluación»,
   * condición que este mismo éxito vuelve falsa: al volver, el formulario
   * se ha desmontado y se habría llevado su propio acuse. Aquí el acuse es
   * la pantalla: donde había un hueco aparece el scorecard con su aviso de
   * borrador, que dice más que una frase.
   */
  return ok();
}

/**
 * Publicar la evaluación.
 *
 * Hasta aquí solo la ve quien la hace. Al publicarla la compañía la ve
 * entera, así que es el momento de decidir que está terminada: se pide al
 * menos una dimensión puntuada, porque una evaluación vacía publicada dice
 * algo que no es.
 */
const esquemaPublicar = z.object({
  slug: textoObligatorio(),
  assessment_id: uuid,
  summary: textoOpcional,
  strengths: textoOpcional,
});

export async function publicarEvaluacion(
  formData: FormData,
): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPublicar, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  const { count } = await supabase
    .from("tech_scores")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", datos.assessment_id);

  if (!count) {
    return error(
      "Publica cuando haya algo que leer: puntúa al menos una dimensión.",
    );
  }

  const { data, error: falloBase } = await supabase
    .from("tech_assessments")
    .update({
      status: "publicada",
      published_at: new Date().toISOString(),
      summary: datos.summary,
      strengths: datos.strengths,
    })
    .eq("id", datos.assessment_id)
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data || data.length === 0) {
    return error("Publicar una evaluación es de quien la revisa.");
  }

  refrescar(datos.slug);
  return ok("Evaluación publicada. La compañía ya la ve.");
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
