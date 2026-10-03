"use client";

import { useState } from "react";
import {
  abrirAnexo,
  cambiarEstadoHito,
  firmarAnexo,
  guardarAnexo,
  registrarHoras,
} from "@/lib/acciones/programa";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/**
 * Estado de un hito.
 *
 * La compañía lo mueve a «en curso» y aporta evidencia; confirmarlo como
 * cumplido es de IWL, y por eso esa opción no se le ofrece. Quien de verdad lo
 * impide es un trigger de la base.
 */
export function EstadoHito({
  slug,
  id,
  estado,
  puedeConfirmar,
}: {
  slug: string;
  id: string;
  estado: string;
  puedeConfirmar: boolean;
}) {
  return (
    <Formulario accion={cambiarEstadoHito} className="gap-0">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Seleccion
            key={estado}
            name="status"
            defaultValue={estado}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="py-1 text-xs"
            error={!resultado.ok}
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="retrasado">Retrasado</option>
            {puedeConfirmar ? <option value="cumplido">Cumplido</option> : null}
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}

/**
 * Registro rápido de horas.
 *
 * El documento pide que cueste menos de diez segundos: si cuesta más, no se
 * usa, y un libro de horas que no se rellena no sirve de nada. Por eso la
 * fecha viene puesta a hoy, la persona se recuerda del último registro y solo
 * hay que elegir materia, escribir una línea y poner las horas.
 */
export function RegistroRapidoHoras({
  slug,
  companyId,
  annexId,
  materias,
  perfiles,
  ultimaPersona,
  ultimoPerfil,
}: {
  slug: string;
  companyId: string;
  annexId: string | null;
  materias: Array<{ id: string; nombre: string }>;
  perfiles: Array<{ codigo: string; nombre: string }>;
  ultimaPersona: string;
  ultimoPerfil: string;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <div className="border-t border-filete px-4 py-2.5">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="accion text-sm text-acento-texto"
        >
          Registrar horas
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-filete px-4 py-4">
      <Formulario accion={registrarHoras}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />
            {annexId ? <input type="hidden" name="annex_id" value={annexId} /> : null}

            <div className="grid gap-3 sm:grid-cols-4">
              <Campo
                etiqueta="Horas"
                error={!resultado.ok ? resultado.campos?.hours : undefined}
              >
                <Texto
                  name="hours"
                  inputMode="decimal"
                  autoFocus
                  required
                  placeholder="2,5"
                  error={!resultado.ok && Boolean(resultado.campos?.hours)}
                />
              </Campo>

              <Campo etiqueta="Materia">
                <Seleccion name="subject_id" required defaultValue="">
                  <option value="" disabled>
                    Elige una
                  </option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo etiqueta="Fecha">
                <Texto name="worked_on" type="date" defaultValue={hoy} required />
              </Campo>

              <Campo
                etiqueta="Perfil"
                error={!resultado.ok ? resultado.campos?.profile_code : undefined}
              >
                <Seleccion
                  name="profile_code"
                  required
                  defaultValue={ultimoPerfil}
                  error={!resultado.ok && Boolean(resultado.campos?.profile_code)}
                >
                  {perfiles.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>

            <Campo
              etiqueta="Persona"
              error={!resultado.ok ? resultado.campos?.person_name : undefined}
            >
              <Texto
                name="person_name"
                required
                defaultValue={ultimaPersona}
                error={!resultado.ok && Boolean(resultado.campos?.person_name)}
              />
            </Campo>

            <Campo
              etiqueta="Qué se ha hecho"
              error={!resultado.ok ? resultado.campos?.description : undefined}
            >
              <AreaTexto
                name="description"
                rows={2}
                required
                placeholder="Sesión de estrategia comercial: definición de tarifa por hectárea."
                error={!resultado.ok && Boolean(resultado.campos?.description)}
              />
            </Campo>

            <div className="flex items-center gap-3">
              <Boton>Registrar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="accion text-sm text-secundario"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/**
 * Abrir el Anexo cuando no hay ninguno.
 *
 * Sin esto, la sección era un callejón: decía que no había Anexo firmado y
 * no ofrecía empezar uno. Y sin Anexo no hay horas que imputar, ni
 * compromiso contra el que medir la aportación, así que se llevaba por
 * delante media plataforma.
 */
export function AbrirAnexo({
  slug,
  companyId,
  hayFirmado,
}: {
  slug: string;
  companyId: string;
  /** Si ya hubo uno firmado, lo que se abre es la versión siguiente */
  hayFirmado: boolean;
}) {
  return (
    <Formulario accion={abrirAnexo}>
      {() => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="company_id" value={companyId} />
          <Boton>
            {hayFirmado ? "Abrir una versión nueva" : "Abrir el Anexo"}
          </Boton>
        </>
      )}
    </Formulario>
  );
}

/**
 * Rellenar y firmar el Anexo en borrador.
 *
 * Dos formularios separados a propósito: guardar es reversible y firmar no.
 * Al firmar, la base deja de aceptar cambios en las horas, el dinero y el
 * equity, así que juntarlos en un botón sería invitar a congelar algo a
 * medio escribir.
 */
export function EditarAnexo({
  slug,
  anexo,
}: {
  slug: string;
  anexo: {
    id: string;
    duration_months: number | null;
    starts_on: string | null;
    ends_on: string | null;
    committed_hours: number | string | null;
    committed_hours_value: number | string | null;
    committed_cash: number | string | null;
    committed_seniors: number | null;
    equity_pct: number | string | null;
    other_commitments: string | null;
  };
}) {
  const [firmando, setFirmando] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="border-t border-filete px-4 py-4">
      <Formulario accion={guardarAnexo}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={anexo.id} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo
                etiqueta="Duración (meses)"
                error={!resultado.ok ? resultado.campos?.duration_months : undefined}
              >
                <Texto
                  name="duration_months"
                  inputMode="numeric"
                  defaultValue={anexo.duration_months ?? ""}
                />
              </Campo>
              <Campo etiqueta="Empieza el">
                <Texto name="starts_on" type="date" defaultValue={anexo.starts_on ?? ""} />
              </Campo>
              <Campo etiqueta="Termina el">
                <Texto name="ends_on" type="date" defaultValue={anexo.ends_on ?? ""} />
              </Campo>
              <Campo
                etiqueta="Equity (%)"
                error={!resultado.ok ? resultado.campos?.equity_pct : undefined}
              >
                <Texto
                  name="equity_pct"
                  inputMode="decimal"
                  defaultValue={anexo.equity_pct ?? ""}
                />
              </Campo>

              <Campo
                etiqueta="Horas comprometidas"
                error={!resultado.ok ? resultado.campos?.committed_hours : undefined}
              >
                <Texto
                  name="committed_hours"
                  inputMode="decimal"
                  defaultValue={anexo.committed_hours ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Valoradas en (€)"
                error={
                  !resultado.ok ? resultado.campos?.committed_hours_value : undefined
                }
              >
                <Texto
                  name="committed_hours_value"
                  inputMode="decimal"
                  defaultValue={anexo.committed_hours_value ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Financiación directa (€)"
                error={!resultado.ok ? resultado.campos?.committed_cash : undefined}
              >
                <Texto
                  name="committed_cash"
                  inputMode="decimal"
                  defaultValue={anexo.committed_cash ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Perfiles sénior"
                error={
                  !resultado.ok ? resultado.campos?.committed_seniors : undefined
                }
              >
                <Texto
                  name="committed_seniors"
                  inputMode="numeric"
                  defaultValue={anexo.committed_seniors ?? ""}
                />
              </Campo>
            </div>

            <Campo etiqueta="Otros compromisos">
              <AreaTexto
                name="other_commitments"
                rows={2}
                defaultValue={anexo.other_commitments ?? ""}
              />
            </Campo>

            <div>
              <Boton>Guardar el Anexo</Boton>
            </div>
          </>
        )}
      </Formulario>

      <div className="mt-5 border-t border-filete pt-4">
        {firmando ? (
          <Formulario accion={firmarAnexo}>
            {() => (
              <>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="id" value={anexo.id} />
                <Campo
                  etiqueta="Fecha de la firma"
                  ayuda="Al firmar, las horas, el dinero y el equity quedan congelados. Para cambiarlos habrá que abrir otra versión"
                >
                  <Texto
                    name="signed_on"
                    type="date"
                    required
                    defaultValue={hoy}
                    className="w-48"
                  />
                </Campo>
                <div className="flex gap-2">
                  <Boton>Firmar</Boton>
                  <button
                    type="button"
                    onClick={() => setFirmando(false)}
                    className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </Formulario>
        ) : (
          <button
            type="button"
            onClick={() => setFirmando(true)}
            className="accion text-xs"
          >
            Firmar el Anexo
          </button>
        )}
      </div>
    </div>
  );
}
