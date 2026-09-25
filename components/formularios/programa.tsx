"use client";

import { useState } from "react";
import { cambiarEstadoHito, registrarHoras } from "@/lib/acciones/programa";
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
          className="text-sm text-acento-texto underline underline-offset-4"
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
                className="text-sm text-secundario transition-colors hover:text-titular"
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
