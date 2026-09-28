"use client";

import { useState } from "react";
import {
  archivarCompania,
  asignarACompania,
  borrarCompania,
  editarCompania,
  restaurarCompania,
} from "@/lib/acciones/admin";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";
import { nombrePersona } from "@/lib/etiquetas";

/**
 * Ciclo de vida de una compañía.
 *
 * Archivar y borrar están separados a propósito y no se parecen en pantalla:
 * uno es reversible y el otro no. El borrado pide escribir el identificador,
 * que es lo único que separa un clic accidental de una decisión.
 */

const ETAPAS = [
  { valor: "pre_semilla", texto: "Pre-semilla" },
  { valor: "semilla", texto: "Semilla" },
  { valor: "serie_a", texto: "Serie A" },
];

const PERFILES = [
  { valor: "software", texto: "Software" },
  { valor: "software_ia", texto: "Software con IA" },
  { valor: "hardware", texto: "Hardware" },
];

export interface FichaCompania {
  id: string;
  name: string;
  slug: string;
  sector: string | null;
  one_liner: string | null;
  stage: string;
  tech_profile: string;
  phase_id: string | null;
  cohort_id: string | null;
  archivada: boolean;
  tiene_actividad: boolean;
}

export function EditarCompania({
  compania,
  fases,
  cohortes,
}: {
  compania: FichaCompania;
  fases: Array<{ id: string; name: string }>;
  cohortes: Array<{ id: string; name: string }>;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs text-secundario"
      >
        Editar
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-filete pt-3">
      <Formulario accion={editarCompania} onOk={() => setAbierto(false)}>
        {(resultado) => {
          const campo = (n: string) =>
            !resultado.ok ? resultado.campos?.[n] : undefined;

          return (
            <>
              <input type="hidden" name="id" value={compania.id} />
              <input type="hidden" name="slug" value={compania.slug} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" error={campo("name")}>
                  <Texto name="name" defaultValue={compania.name} required />
                </Campo>
                <Campo etiqueta="Sector" error={campo("sector")}>
                  <Texto name="sector" defaultValue={compania.sector ?? ""} />
                </Campo>

                <Campo
                  etiqueta="Etapa"
                  ayuda="Cambia el nivel objetivo de cada dimensión, y con él el score"
                >
                  <Seleccion key={compania.stage} name="stage" defaultValue={compania.stage}>
                    {ETAPAS.map((e) => (
                      <option key={e.valor} value={e.valor}>
                        {e.texto}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>

                <Campo
                  etiqueta="Perfil tecnológico"
                  ayuda="Decide qué dimensiones «si aplica» se activan"
                >
                  <Seleccion
                    key={compania.tech_profile}
                    name="tech_profile"
                    defaultValue={compania.tech_profile}
                  >
                    {PERFILES.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.texto}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>

                <Campo etiqueta="Fase del programa">
                  <Seleccion
                    key={compania.phase_id ?? "sin"}
                    name="phase_id"
                    defaultValue={compania.phase_id ?? ""}
                  >
                    <option value="">Sin fase</option>
                    {fases.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>

                <Campo etiqueta="Cohorte">
                  <Seleccion
                    key={compania.cohort_id ?? "sin"}
                    name="cohort_id"
                    defaultValue={compania.cohort_id ?? ""}
                  >
                    <option value="">Sin cohorte</option>
                    {cohortes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              </div>

              <Campo etiqueta="En una frase" error={campo("one_liner")}>
                <AreaTexto
                  name="one_liner"
                  rows={2}
                  defaultValue={compania.one_liner ?? ""}
                />
              </Campo>

              <div className="flex gap-2">
                <Boton>Guardar</Boton>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
                >
                  Cancelar
                </button>
              </div>
            </>
          );
        }}
      </Formulario>
    </div>
  );
}

export function ArchivarCompania({ compania }: { compania: FichaCompania }) {
  const [abierto, setAbierto] = useState(false);

  if (compania.archivada) {
    return (
      <Formulario accion={restaurarCompania} className="gap-0">
        {() => (
          <>
            <input type="hidden" name="id" value={compania.id} />
            <button
              type="submit"
              className="accion text-xs text-acento-texto"
            >
              Restaurar
            </button>
          </>
        )}
      </Formulario>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs text-secundario"
      >
        Archivar
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-filete pt-3">
      <Formulario accion={archivarCompania} onOk={() => setAbierto(false)}>
        {() => (
          <>
            <input type="hidden" name="id" value={compania.id} />
            <input type="hidden" name="slug" value={compania.slug} />

            <p className="text-xs text-secundario">
              Sale de la cartera y su equipo fundador deja de verla. El
              histórico se conserva entero —horas, hitos, due diligence y
              extracto de aportación— y se puede restaurar cuando haga falta.
            </p>

            <Campo etiqueta="Motivo" ayuda="Para saber por qué dentro de un año">
              <Texto name="motivo" placeholder="Graduada, cierre, salida del programa…" />
            </Campo>

            <div className="flex gap-2">
              <Boton>Archivar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/**
 * Borrado real.
 *
 * Solo aparece cuando la compañía no tiene nada registrado. Si lo tiene, en
 * su lugar se explica por qué no se puede y qué hacer en cambio: un botón
 * deshabilitado sin explicación se lee como un fallo de la aplicación.
 */
export function BorrarCompania({ compania }: { compania: FichaCompania }) {
  const [abierto, setAbierto] = useState(false);

  if (compania.tiene_actividad) {
    return (
      <span className="text-xs text-metadato">
        No se puede borrar: tiene trabajo registrado
      </span>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion accion-riesgo text-xs text-metadato"
      >
        Borrar
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-mal/40 pt-3">
      <Formulario accion={borrarCompania} onOk={() => setAbierto(false)}>
        {(resultado) => (
          <>
            <input type="hidden" name="id" value={compania.id} />
            <input type="hidden" name="slug" value={compania.slug} />

            <p className="text-xs text-mal">
              Esto la borra de verdad y no tiene vuelta atrás. Solo se ofrece
              porque no tiene nada registrado.
            </p>

            <Campo
              etiqueta={`Escribe «${compania.slug}» para confirmar`}
              error={!resultado.ok ? resultado.campos?.confirmacion : undefined}
            >
              <Texto name="confirmacion" autoComplete="off" required />
            </Campo>

            <div className="flex gap-2">
              <Boton>Borrar definitivamente</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/**
 * Montar el equipo de un proyecto.
 *
 * Antes solo se podía asignar desde la ficha de cada persona, de una en una:
 * para poner a cuatro mentoras en un proyecto había que recorrer la lista
 * entera cuatro veces. La pregunta real es «quién lleva este proyecto», y se
 * hace mirando el proyecto.
 *
 * Cada persona se elige viendo su cargo, en qué entra y cuántos proyectos
 * lleva ya: poner a alguien en el quinto es una decisión distinta de ponerla
 * en el primero.
 */
export interface Asignable {
  id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  expertise: string[];
  proyectos: number;
  horas_comprometidas: number;
}

const PAPELES_EQUIPO = [
  { valor: "responsable_iwl", texto: "Responsable de IWL" },
  { valor: "mentor_principal", texto: "Mentoría · coordina el proyecto" },
  { valor: "mentor_secundario", texto: "Mentoría · apoyo" },
  { valor: "revisor_niage", texto: "Revisora técnica de Niage" },
  { valor: "fundadora", texto: "Equipo fundador" },
];

const PERFILES_TARIFA = [
  "socio",
  "ingenieria",
  "senior",
  "especialista",
  "operacion",
  "mentor",
];

export function AnadirAlEquipo({
  companyId,
  personas,
}: {
  companyId: string;
  personas: Asignable[];
}) {
  const [papel, setPapel] = useState("mentor_secundario");
  const [quien, setQuien] = useState("");
  const esMentoria = papel.startsWith("mentor");
  const elegida = personas.find((p) => p.id === quien);

  return (
    <Desplegable titulo="Añadir a alguien al equipo del proyecto">
      <Formulario accion={asignarACompania}>
        {(resultado) => {
          const campo = (n: string) =>
            !resultado.ok ? resultado.campos?.[n] : undefined;

          return (
            <>
              <input type="hidden" name="company_id" value={companyId} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Quién" error={campo("profile_id")}>
                  <Seleccion
                    name="profile_id"
                    required
                    value={quien}
                    onChange={(e) => setQuien(e.currentTarget.value)}
                  >
                    <option value="" disabled>
                      Elige una persona
                    </option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {nombrePersona(p)}
                        {p.job_title ? ` · ${p.job_title}` : ""}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>

                <Campo etiqueta="Papel en este proyecto">
                  <Seleccion
                    name="member_role"
                    required
                    value={papel}
                    onChange={(e) => setPapel(e.currentTarget.value)}
                  >
                    {PAPELES_EQUIPO.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.texto}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              </div>

              {elegida ? (
                <p className="text-xs text-secundario">
                  {elegida.expertise.length > 0
                    ? `Entra en ${elegida.expertise.join(", ").toLowerCase()}. `
                    : "Sin áreas registradas. "}
                  {elegida.proyectos === 0
                    ? "No lleva ningún proyecto todavía."
                    : `Lleva ${elegida.proyectos} ${elegida.proyectos === 1 ? "proyecto" : "proyectos"}${
                        elegida.horas_comprometidas > 0
                          ? `, con ${elegida.horas_comprometidas} horas comprometidas en total`
                          : ""
                      }.`}
                </p>
              ) : null}

              {esMentoria ? (
                <div className="grid gap-4 sm:grid-cols-4">
                  <Campo etiqueta="Horas" error={campo("assigned_hours")}>
                    <Texto
                      type="number"
                      name="assigned_hours"
                      min="0"
                      step="5"
                      placeholder="120"
                    />
                  </Campo>
                  <Campo etiqueta="Tarifa">
                    <Seleccion name="rate_profile" defaultValue="especialista">
                      {PERFILES_TARIFA.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Seleccion>
                  </Campo>
                  <Campo etiqueta="Desde" error={campo("starts_on")}>
                    <Texto type="date" name="starts_on" />
                  </Campo>
                  <Campo etiqueta="Hasta" error={campo("ends_on")}>
                    <Texto type="date" name="ends_on" />
                  </Campo>
                </div>
              ) : null}

              <Campo etiqueta="En qué entra aquí">
                <Texto
                  name="title"
                  placeholder={
                    papel === "mentor_principal"
                      ? "Coordinación del proyecto"
                      : "Estrategia comercial"
                  }
                />
              </Campo>

              {esMentoria ? (
                <p className="text-xs text-metadato">
                  {papel === "mentor_principal"
                    ? "Quien coordina responde del avance: puntúa el due diligence, confirma hitos y mueve el plan. Solo en este proyecto."
                    : "El apoyo ve el proyecto entero, imputa sus horas y cierra sus tareas. No puntúa ni confirma hitos."}
                </p>
              ) : null}

              <div>
                <Boton>Añadir al equipo</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}
