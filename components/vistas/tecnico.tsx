import { clienteServidor } from "@/lib/supabase/servidor";
import { dimensionesPorPrioridad } from "@/lib/scoring/score-tecnico";
import type { ResumenCompania } from "@/lib/datos/compania";
import { ScorecardRadar } from "@/components/scorecard-radar";
import {
  Bloque,
  Etiqueta,
  Metadato,
  Severidad,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import {
  EstadoHallazgo,
  EstadoPuntoPlan,
  FormularioHallazgo,
  FormularioPuntoPlan,
  FormularioPuntuacion,
  RespuestaCuestionario,
} from "@/components/formularios/tecnico";
import { euros, fecha, numero } from "@/lib/utils";

/**
 * Due diligence tecnológico (§4.4). El módulo principal.
 *
 * Orden de lectura: scorecard, dónde está la distancia al objetivo, hallazgos
 * y plan de trabajo. Cada nivel lleva su evidencia: una puntuación sin
 * evidencia no es una evaluación.
 */

const ESTADOS_PLAN: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecho: "Hecho",
  descartado: "Descartado",
};

const ESTADOS_HALLAZGO: Record<string, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
  aceptado: "Riesgo aceptado",
};

export async function VistaTecnico({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const supabase = await clienteServidor();
  const companyId = resumen.compania.id;

  const [evaluacion, puntuaciones, hallazgos, plan, sesiones] = await Promise.all([
    supabase
      .from("tech_assessments")
      .select("id, assessed_on, summary, strengths, stage, status, profiles:reviewer_id ( full_name )")
      .eq("company_id", companyId)
      .eq("status", "publicada")
      .order("assessed_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tech_scores")
      .select("id, level, evidence, source, tech_dimensions ( code, name, order_index )")
      .eq("company_id", companyId),
    supabase
      .from("tech_findings")
      .select("id, severity, status, title, description, recommendation, evidence, tech_dimensions ( name )")
      .eq("company_id", companyId)
      .order("severity"),
    supabase
      .from("tech_plan_items")
      .select("id, title, description, owner, effort_days, estimated_cost, quarter, due_date, status")
      .eq("company_id", companyId)
      .order("due_date"),
    supabase
      .from("tech_review_sessions")
      .select("id, held_on, duration_min, attendees, conclusions")
      .eq("company_id", companyId)
      .order("held_on", { ascending: false }),
  ]);

  const { permisos, compania } = resumen;
  const slug = compania.slug;

  // Catálogo de dimensiones con su id, para los formularios
  const { data: catalogo } = await supabase
    .from("tech_dimensions")
    .select("id, code, name, applicability, order_index")
    .eq("is_active", true)
    .order("order_index");

  const aplicables = (catalogo ?? []).filter(
    (d) =>
      d.applicability === "siempre" ||
      (d.applicability === "ia" && compania.tech_profile === "software_ia") ||
      (d.applicability === "hardware" && compania.tech_profile === "hardware"),
  );

  const idPorCodigo = new Map(aplicables.map((d) => [d.code, d.id]));

  // El cuestionario solo se enseña a quien lo responde: la compañía
  const cuestionario = permisos.esFundadora
    ? await leerCuestionario(supabase, companyId, aplicables.map((d) => d.id))
    : null;

  const { scoreTecnico } = resumen;
  const prioridad = dimensionesPorPrioridad(scoreTecnico);

  const evidenciaPorDimension = new Map(
    (puntuaciones.data ?? []).map((p) => [p.tech_dimensions?.code ?? "", p]),
  );

  const abiertos = (hallazgos.data ?? []).filter((h) =>
    ["abierto", "en_curso"].includes(h.status),
  );

  const costeRemediacion = (plan.data ?? [])
    .filter((p) => p.status !== "descartado" && p.status !== "hecho")
    .reduce((acc, p) => acc + Number(p.estimated_cost ?? 0), 0);

  if (!evaluacion.data) {
    return (
      <Bloque>
        <TituloBloque>Due diligence tecnológico</TituloBloque>
        <SinDatos>
          Todavía no hay una evaluación técnica publicada. La primera la realiza
          la ingeniería de Niage durante la fase de due diligence conjunto.
        </SinDatos>
      </Bloque>
    );
  }

  // La estrechez de tipo se pierde dentro de los callbacks del JSX, así que
  // se saca a una constante una vez comprobado que existe
  const evaluacionActual = evaluacion.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Bloque>
          <TituloBloque
            accion={<Metadato>Evaluación de {fecha(evaluacionActual.assessed_on)}</Metadato>}
          >
            Scorecard técnico
          </TituloBloque>
          <div className="px-4 py-4">
            <ScorecardRadar dimensiones={scoreTecnico.dimensiones} />
          </div>
        </Bloque>

        <div className="flex flex-col gap-6">
          <Bloque>
            <TituloBloque accion={<Metadato>{numero(scoreTecnico.valor, 1)}</Metadato>}>
              Dónde está la distancia
            </TituloBloque>
            {prioridad.length === 0 ? (
              <SinDatos>
                Todas las dimensiones alcanzan el objetivo de la etapa.
              </SinDatos>
            ) : (
              <ul className="divide-y divide-filete">
                {prioridad.map((d) => (
                  <li key={d.codigo} className="flex items-baseline gap-3 px-4 py-2.5">
                    <span className="flex-1 text-sm text-titular">{d.nombre}</span>
                    <span className="cifra text-xs text-secundario">
                      {d.nivel ?? 0} → {d.objetivo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque>
            <TituloBloque>Lectura del revisor</TituloBloque>
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="text-sm text-secundario">{evaluacionActual.summary}</p>
              {evaluacionActual.strengths ? (
                <div>
                  <Metadato>Fortalezas</Metadato>
                  <p className="mt-1 text-sm text-secundario">
                    {evaluacionActual.strengths}
                  </p>
                </div>
              ) : null}
              <Metadato>
                {evaluacionActual.profiles?.full_name ?? "Ingeniería Niage"}
              </Metadato>
            </div>
          </Bloque>
        </div>
      </div>

      <Bloque>
        <TituloBloque accion={<Metadato>Nivel · objetivo · evidencia</Metadato>}>
          Dimensiones
        </TituloBloque>
        <ul className="divide-y divide-filete">
          {scoreTecnico.dimensiones
            .filter((d) => d.aplica)
            .map((d) => {
              const puntuacion = evidenciaPorDimension.get(d.codigo);
              return (
                <li key={d.codigo} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-sm font-medium text-titular">{d.nombre}</span>
                    <span className="cifra text-xs text-secundario">
                      Nivel {d.evaluada ? d.nivel : "sin evaluar"} · objetivo {d.objetivo}
                    </span>
                    {d.brecha > 0 ? (
                      <Etiqueta>
                        {d.brecha} {d.brecha === 1 ? "nivel" : "niveles"} de margen
                      </Etiqueta>
                    ) : (
                      <Etiqueta>En objetivo</Etiqueta>
                    )}
                    {puntuacion?.source === "automatico" ? (
                      <Etiqueta>Propuesta automática</Etiqueta>
                    ) : null}
                  </div>
                  {puntuacion?.evidence ? (
                    <p className="mt-1.5 text-sm text-secundario">{puntuacion.evidence}</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-metadato">
                      Sin puntuar todavía.
                    </p>
                  )}

                  {permisos.puedeValidar && idPorCodigo.has(d.codigo) ? (
                    <div className="-mx-4 mt-2">
                      <FormularioPuntuacion
                        slug={slug}
                        assessmentId={evaluacionActual.id}
                        dimensionId={idPorCodigo.get(d.codigo)!}
                        dimension={d.nombre}
                        nivelActual={d.nivel}
                        objetivo={d.objetivo}
                        evidenciaActual={puntuacion?.evidence ?? null}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
        </ul>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>{abiertos.length} abiertos</Metadato>}>
          Hallazgos técnicos
        </TituloBloque>
        {(hallazgos.data ?? []).length === 0 ? (
          <SinDatos>Sin hallazgos registrados en esta evaluación.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {(hallazgos.data ?? []).map((h) => (
              <li key={h.id} className="px-4 py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Severidad nivel={h.severity as "critico" | "alto" | "medio" | "bajo"} />
                  <span className="text-sm font-medium text-titular">{h.title}</span>
                  <Metadato>{h.tech_dimensions?.name}</Metadato>
                  <Etiqueta>{ESTADOS_HALLAZGO[h.status] ?? h.status}</Etiqueta>
                </div>
                <p className="mt-2 text-sm text-secundario">{h.description}</p>
                {h.evidence ? (
                  <p className="mt-1 text-xs text-metadato">Evidencia: {h.evidence}</p>
                ) : null}
                <p className="mt-2 border-l-2 border-acento pl-3 text-sm text-titular">
                  {h.recommendation}
                </p>
                {permisos.puedeValidar ? (
                  <EstadoHallazgo
                    key={h.status}
                    slug={slug}
                    id={h.id}
                    estado={h.status}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {permisos.puedeValidar ? (
          <FormularioHallazgo
            slug={slug}
            companyId={companyId}
            assessmentId={evaluacionActual.id}
            dimensiones={aplicables.map((d) => ({ id: d.id, nombre: d.name }))}
          />
        ) : null}
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              Coste de remediación estimado {euros(costeRemediacion)}
            </Metadato>
          }
        >
          Plan de trabajo técnico
        </TituloBloque>
        {(plan.data ?? []).length === 0 ? (
          <SinDatos>
            El plan se construye desde los hallazgos: cada uno genera un punto con
            responsable, esfuerzo y fecha.
          </SinDatos>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-filete text-left">
                <th className="px-4 py-2 font-medium text-metadato">Punto</th>
                <th className="px-4 py-2 font-medium text-metadato">Responsable</th>
                <th className="px-4 py-2 font-medium text-metadato">Esfuerzo</th>
                <th className="px-4 py-2 font-medium text-metadato">Trimestre</th>
                <th className="px-4 py-2 font-medium text-metadato">Fecha</th>
                <th className="px-4 py-2 font-medium text-metadato">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-filete">
              {(plan.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-titular">
                    {p.title}
                    {p.description ? (
                      <span className="block text-xs text-secundario">{p.description}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-secundario">
                    {p.owner === "niage" ? "Niage" : "Compañía"}
                  </td>
                  <td className="cifra px-4 py-3 text-secundario">
                    {p.effort_days ? `${numero(Number(p.effort_days), 1)} d` : "—"}
                  </td>
                  <td className="cifra px-4 py-3 text-secundario">{p.quarter ?? "—"}</td>
                  <td className="cifra px-4 py-3 text-secundario">{fecha(p.due_date)}</td>
                  <td className="px-4 py-3">
                    {permisos.puedeEscribir ? (
                      <EstadoPuntoPlan slug={slug} id={p.id} estado={p.status} />
                    ) : (
                      <Etiqueta>{ESTADOS_PLAN[p.status] ?? p.status}</Etiqueta>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {permisos.puedeValidar ? (
          <FormularioPuntoPlan
            slug={slug}
            companyId={companyId}
            hallazgos={(hallazgos.data ?? []).map((h) => ({
              id: h.id,
              titulo: h.title,
            }))}
          />
        ) : null}
      </Bloque>

      {cuestionario ? (
        <Bloque>
          <TituloBloque
            accion={<Metadato>Lo responde el equipo técnico</Metadato>}
          >
            Cuestionario técnico
          </TituloBloque>
          <div className="divide-y divide-filete">
            {cuestionario.map((c) => (
              <RespuestaCuestionario
                key={c.id}
                slug={slug}
                companyId={companyId}
                criterionId={c.id}
                titulo={c.title}
                descripcion={c.description}
                evidenciaEsperada={c.expected_evidence}
                respuesta={c.respuesta}
              />
            ))}
          </div>
        </Bloque>
      ) : null}

      {(sesiones.data ?? []).length > 0 ? (
        <Bloque>
          <TituloBloque>Sesiones de revisión</TituloBloque>
          <ul className="divide-y divide-filete">
            {(sesiones.data ?? []).map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Metadato>{fecha(s.held_on)}</Metadato>
                  <Metadato>{s.duration_min} min</Metadato>
                  <span className="text-sm text-secundario">{s.attendees}</span>
                </div>
                {s.conclusions ? (
                  <p className="mt-1 text-sm text-titular">{s.conclusions}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}
    </div>
  );
}

/**
 * Criterios de las dimensiones que aplican, con la respuesta que ya haya dado
 * la compañía. Es la capa 2 del módulo: lo que la fundadora aporta antes de
 * que el revisor puntúe.
 */
async function leerCuestionario(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  companyId: string,
  dimensionIds: string[],
) {
  const [criterios, respuestas] = await Promise.all([
    supabase
      .from("tech_criteria")
      .select("id, title, description, expected_evidence, order_index, dimension_id")
      .in("dimension_id", dimensionIds)
      .eq("is_active", true)
      .order("order_index"),
    supabase
      .from("tech_questionnaire_answers")
      .select("criterion_id, answer")
      .eq("company_id", companyId),
  ]);

  const porCriterio = new Map(
    (respuestas.data ?? []).map((r) => [r.criterion_id, r.answer]),
  );

  return (criterios.data ?? []).map((c) => ({
    ...c,
    respuesta: porCriterio.get(c.id) ?? null,
  }));
}
