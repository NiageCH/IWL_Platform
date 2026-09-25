"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Json } from "@/lib/supabase/database.types";
import { leerCompania, leerUmbralesPublicos } from "@/lib/datos/compania";
import { componerEntradaMadurez } from "@/lib/datos/madurez";
import {
  error,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  validar,
  type Resultado,
} from "./resultado";

/**
 * Congelar una línea base.
 *
 * «Sin un punto de partida inmutable, avance es una opinión.» La tabla existía
 * desde el principio, con su trigger de inmutabilidad, pero no había forma de
 * crear una desde la plataforma: era una tabla vacía con un test.
 *
 * Lo que se guarda es una copia del estado, no referencias a él. Si guardara
 * referencias, editar un KPI de hace seis meses cambiaría la línea base y
 * dejaría de ser un punto de partida.
 */

const esquema = z.object({
  slug: textoObligatorio(),
  kind: z.enum(["inicial", "trimestral", "previa_ronda"]),
  taken_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como 2026-12-31."),
  notes: textoOpcional,
});

export async function congelarLineaBase(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquema, formData);
  if (fallo) return fallo;

  const resumen = await leerCompania(datos.slug);
  if (!resumen) return error("No se encuentra la compañía.");
  if (!resumen.permisos.esIwl) {
    return error("Congelar una línea base es del equipo de IWL.");
  }

  const supabase = await clienteServidor();
  const umbrales = await leerUmbralesPublicos();
  const madurez = await componerEntradaMadurez(resumen, umbrales.runwayMinimoMeses);

  const [{ data: hitos }, { data: etapas }, { data: horas }] = await Promise.all([
    supabase
      .from("milestones")
      .select("title, status, due_date, gates_investable")
      .eq("company_id", resumen.compania.id),
    supabase
      .from("roadmap_stages")
      .select("name, status, starts_on, ends_on, planned_hours")
      .eq("company_id", resumen.compania.id)
      .order("order_index"),
    supabase
      .from("contribution_hours")
      .select("hours")
      .eq("company_id", resumen.compania.id),
  ]);

  /*
   * El contenido va entero en JSON, copiado.
   *
   * `madurez` guarda las entradas del cálculo y no su resultado: así, si IWL
   * cambia los pesos de los ejes, la comparación entre el inicio y hoy se
   * sigue haciendo con la misma regla en los dos extremos. Guardar el
   * resultado compararía dos varas de medir distintas.
   */
  const contenido = {
    version: 1,
    etapa: resumen.compania.stage,
    estado_entrada: resumen.compania.entry_state,
    perfil_tecnico: resumen.compania.tech_profile,
    scores: {
      tecnico: resumen.scoreTecnico.completo ? resumen.scoreTecnico.valor : null,
      preparacion: resumen.scorePreparacion.valor,
      dimensiones_evaluadas: resumen.scoreTecnico.evaluadas,
      dimensiones_aplicables: resumen.scoreTecnico.aplicables,
    },
    madurez,
    kpi: resumen.kpis.valores,
    derivados: resumen.kpis.derivados,
    periodo_kpi: resumen.kpis.periodo,
    hallazgos_abiertos: resumen.hallazgos.map((h) => ({
      titulo: h.titulo,
      severidad: h.severidad,
      origen: h.origen,
    })),
    hitos: (hitos ?? []).map((h) => ({
      titulo: h.title,
      estado: h.status,
      fecha: h.due_date,
      condiciona: h.gates_investable,
    })),
    etapas: (etapas ?? []).map((e) => ({
      nombre: e.name,
      estado: e.status,
      inicio: e.starts_on,
      fin: e.ends_on,
      horas_previstas: e.planned_hours,
    })),
    horas_iwl: (horas ?? []).reduce((t, h) => t + Number(h.hours ?? 0), 0),
  };

  const { error: falloBase } = await supabase.from("baselines").insert({
    company_id: resumen.compania.id,
    kind: datos.kind,
    taken_on: datos.taken_on,
    stage: resumen.compania.stage,
    /*
     * El tipo generado para una columna jsonb es `Json`, una estructura
     * recursiva de valores planos. Los objetos de aquí arriba son JSON válido
     * pero TypeScript no lo deduce de una interfaz, así que hay que decírselo.
     */
    content: contenido as unknown as Json,
    notes: datos.notes,
  });

  if (falloBase) {
    if (falloBase.code === "23505") {
      return error(
        "Ya hay una línea base de ese tipo con esa fecha. Una línea base no se reescribe: cambia la fecha o crea otra de otro tipo.",
        { taken_on: "Ya hay una con esta fecha." },
      );
    }
    return traducirError(falloBase);
  }

  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${datos.slug}`, "layout");
  return ok(
    "Línea base congelada. A partir de ahora no se puede editar: el avance se mide contra ella.",
  );
}
