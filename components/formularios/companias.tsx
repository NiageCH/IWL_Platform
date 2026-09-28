"use client";

import { useState } from "react";
import {
  archivarCompania,
  borrarCompania,
  editarCompania,
  restaurarCompania,
} from "@/lib/acciones/admin";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

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
        className="text-xs text-secundario underline decoration-filete underline-offset-4 transition-colors hover:text-titular"
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
              className="text-xs text-acento-texto underline decoration-filete underline-offset-4"
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
        className="text-xs text-secundario underline decoration-filete underline-offset-4 transition-colors hover:text-titular"
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
        className="text-xs text-metadato underline decoration-filete underline-offset-4 transition-colors hover:text-mal"
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
