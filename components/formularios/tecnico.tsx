"use client";

import { useState } from "react";
import {
  cambiarEstadoHallazgo,
  cambiarEstadoPuntoPlan,
  crearPuntoPlan,
  puntuarDimension,
  registrarHallazgo,
  responderCuestionario,
} from "@/lib/acciones/tecnico";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/** Niveles de la escala de madurez, con su lectura (§4.4) */
const NIVELES = [
  { valor: 0, texto: "0 · No existe" },
  { valor: 1, texto: "1 · Ad hoc, depende de una persona" },
  { valor: 2, texto: "2 · Básico, con riesgo conocido" },
  { valor: 3, texto: "3 · Sólido y defendible ante un inversor" },
  { valor: 4, texto: "4 · Preparado para escalar" },
];

const SEVERIDADES = [
  { valor: "critico", texto: "Crítico · bloquea el estado invertible" },
  { valor: "alto", texto: "Alto" },
  { valor: "medio", texto: "Medio" },
  { valor: "bajo", texto: "Bajo" },
];

/**
 * Puntuación de una dimensión. Solo la ve quien puede puntuar: IWL y el
 * revisor de Niage asignado. La fundadora no la tiene delante, y si llegara a
 * enviarla, la base la rechaza.
 */
export function FormularioPuntuacion({
  slug,
  assessmentId,
  dimensionId,
  dimension,
  nivelActual,
  objetivo,
  evidenciaActual,
}: {
  slug: string;
  assessmentId: string;
  dimensionId: string;
  dimension: string;
  nivelActual: number | null;
  objetivo: number;
  evidenciaActual: string | null;
}) {
  return (
    <Desplegable titulo={nivelActual === null ? "Puntuar" : "Ajustar puntuación"}>
      <Formulario accion={puntuarDimension}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="assessment_id" value={assessmentId} />
            <input type="hidden" name="dimension_id" value={dimensionId} />

            <Campo
              etiqueta={`Nivel en ${dimension}`}
              ayuda={`El objetivo para esta etapa es ${objetivo}`}
              error={!resultado.ok ? resultado.campos?.level : undefined}
            >
              <Seleccion
                name="level"
                defaultValue={String(nivelActual ?? "")}
                required
                error={!resultado.ok && Boolean(resultado.campos?.level)}
              >
                <option value="" disabled>
                  Elige un nivel
                </option>
                {NIVELES.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    {n.texto}
                  </option>
                ))}
              </Seleccion>
            </Campo>

            <Campo
              etiqueta="Evidencia"
              ayuda="En qué te basas: qué has visto, dónde y cuándo"
              error={!resultado.ok ? resultado.campos?.evidence : undefined}
            >
              <AreaTexto
                name="evidence"
                rows={3}
                required
                defaultValue={evidenciaActual ?? ""}
                error={!resultado.ok && Boolean(resultado.campos?.evidence)}
              />
            </Campo>

            <Campo
              etiqueta="Motivo del ajuste"
              ayuda="Solo si te separas de lo que propone el análisis automático"
            >
              <AreaTexto name="rationale" rows={2} />
            </Campo>

            <div>
              <Boton>Guardar puntuación</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function FormularioHallazgo({
  slug,
  companyId,
  assessmentId,
  dimensiones,
}: {
  slug: string;
  companyId: string;
  assessmentId: string;
  dimensiones: Array<{ id: string; nombre: string }>;
}) {
  return (
    <Desplegable titulo="Registrar un hallazgo">
      <Formulario accion={registrarHallazgo}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="assessment_id" value={assessmentId} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Dimensión">
                <Seleccion name="dimension_id" required defaultValue="">
                  <option value="" disabled>
                    Elige una
                  </option>
                  {dimensiones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo etiqueta="Severidad">
                <Seleccion name="severity" required defaultValue="medio">
                  {SEVERIDADES.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.texto}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>

            <Campo
              etiqueta="Título"
              error={!resultado.ok ? resultado.campos?.title : undefined}
            >
              <Texto
                name="title"
                required
                placeholder="Copias sin prueba de restauración"
                error={!resultado.ok && Boolean(resultado.campos?.title)}
              />
            </Campo>

            <Campo
              etiqueta="Descripción"
              error={!resultado.ok ? resultado.campos?.description : undefined}
            >
              <AreaTexto
                name="description"
                rows={3}
                required
                error={!resultado.ok && Boolean(resultado.campos?.description)}
              />
            </Campo>

            <Campo etiqueta="Evidencia">
              <AreaTexto name="evidence" rows={2} />
            </Campo>

            <Campo
              etiqueta="Recomendación"
              ayuda="Qué hay que hacer. Es lo que la compañía verá como siguiente paso"
              error={!resultado.ok ? resultado.campos?.recommendation : undefined}
            >
              <AreaTexto
                name="recommendation"
                rows={3}
                required
                error={!resultado.ok && Boolean(resultado.campos?.recommendation)}
              />
            </Campo>

            <div>
              <Boton>Registrar hallazgo</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/** Cambio de estado de un hallazgo. Aceptar un riesgo pide motivo */
export function EstadoHallazgo({
  slug,
  id,
  estado,
}: {
  slug: string;
  id: string;
  estado: string;
}) {
  // El estado inicial viene del servidor. Quien lo usa le pasa una `key` con
  // el estado, de modo que al cambiar en la base este componente se vuelve a
  // montar con el valor nuevo.
  const [elegido, setElegido] = useState(estado);

  return (
    <Formulario accion={cambiarEstadoHallazgo} className="mt-3 gap-2">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />

          <div className="flex flex-wrap items-end gap-2">
            <Campo etiqueta="Estado">
              <Seleccion
                name="status"
                value={elegido}
                onChange={(e) => setElegido(e.target.value)}
              >
                <option value="abierto">Abierto</option>
                <option value="en_curso">En curso</option>
                <option value="resuelto">Resuelto</option>
                <option value="aceptado">Riesgo aceptado</option>
              </Seleccion>
            </Campo>
            <Boton variante="secundario">Actualizar</Boton>
          </div>

          {elegido === "aceptado" ? (
            <Campo
              etiqueta="Por qué se asume"
              error={!resultado.ok ? resultado.campos?.acceptance_note : undefined}
            >
              <AreaTexto
                name="acceptance_note"
                rows={2}
                required
                placeholder="Riesgo asumido hasta el cierre de la ronda, revisable en enero."
                error={!resultado.ok && Boolean(resultado.campos?.acceptance_note)}
              />
            </Campo>
          ) : null}
        </>
      )}
    </Formulario>
  );
}

export function FormularioPuntoPlan({
  slug,
  companyId,
  hallazgos,
}: {
  slug: string;
  companyId: string;
  hallazgos: Array<{ id: string; titulo: string }>;
}) {
  return (
    <Desplegable titulo="Añadir un punto al plan">
      <Formulario accion={crearPuntoPlan}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />

            <Campo etiqueta="Hallazgo del que nace" ayuda="Opcional">
              <Seleccion name="finding_id" defaultValue="">
                <option value="">Sin hallazgo asociado</option>
                {hallazgos.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.titulo}
                  </option>
                ))}
              </Seleccion>
            </Campo>

            <Campo
              etiqueta="Título"
              error={!resultado.ok ? resultado.campos?.title : undefined}
            >
              <Texto
                name="title"
                required
                error={!resultado.ok && Boolean(resultado.campos?.title)}
              />
            </Campo>

            <Campo etiqueta="Descripción">
              <AreaTexto name="description" rows={2} />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Responsable">
                <Seleccion name="owner" required defaultValue="compania">
                  <option value="compania">Compañía</option>
                  <option value="niage">Niage</option>
                </Seleccion>
              </Campo>

              <Campo etiqueta="Esfuerzo en días">
                <Texto name="effort_days" type="number" step="0.5" min="0" />
              </Campo>

              <Campo
                etiqueta="Coste estimado"
                ayuda="Alimenta la necesidad de capital del business plan"
              >
                <Texto name="estimated_cost" type="number" step="100" min="0" />
              </Campo>

              <Campo
                etiqueta="Trimestre"
                error={!resultado.ok ? resultado.campos?.quarter : undefined}
              >
                <Texto
                  name="quarter"
                  placeholder="2026-T4"
                  error={!resultado.ok && Boolean(resultado.campos?.quarter)}
                />
              </Campo>

              <Campo etiqueta="Fecha">
                <Texto name="due_date" type="date" />
              </Campo>
            </div>

            <div>
              <Boton>Añadir al plan</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function EstadoPuntoPlan({
  slug,
  id,
  estado,
}: {
  slug: string;
  id: string;
  estado: string;
}) {
  return (
    <Formulario accion={cambiarEstadoPuntoPlan} className="gap-0">
      {() => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Seleccion
            // Ver la nota sobre `key` en el formulario de due diligence
            key={estado}
            name="status"
            defaultValue={estado}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="py-1 text-xs"
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="hecho">Hecho</option>
            <option value="descartado">Descartado</option>
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}

/** Cuestionario técnico que responde la fundadora o su CTO */
export function RespuestaCuestionario({
  slug,
  companyId,
  criterionId,
  titulo,
  descripcion,
  evidenciaEsperada,
  respuesta,
}: {
  slug: string;
  companyId: string;
  criterionId: string;
  titulo: string;
  descripcion: string | null;
  evidenciaEsperada: string | null;
  respuesta: string | null;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-titular">{titulo}</p>
      {descripcion ? (
        <p className="mt-0.5 text-sm text-secundario">{descripcion}</p>
      ) : null}
      {evidenciaEsperada ? (
        <p className="mt-0.5 text-xs text-metadato">
          Se espera: {evidenciaEsperada}
        </p>
      ) : null}

      <Formulario accion={responderCuestionario} className="mt-2 gap-2">
        {() => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="criterion_id" value={criterionId} />
            <AreaTexto
              name="answer"
              rows={2}
              defaultValue={respuesta ?? ""}
              placeholder="Responde aquí"
            />
            <div>
              <Boton variante="secundario">Guardar respuesta</Boton>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}
