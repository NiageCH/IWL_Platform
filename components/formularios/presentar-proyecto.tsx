"use client";

import { useState } from "react";
import { enviarCandidatura, prepararSubidaPrueba } from "@/lib/acciones/presentarse";
import { AreaTexto, Boton, Campo, Formulario, Seleccion, Texto } from "@/components/ui/formulario";
import { BarraSubida, useSubidas } from "@/components/ui/subida";
import { DESCRIPCION_ESTADIO, ESTADIOS, ORDEN_ESTADIOS, type Estadio } from "@/lib/estadios";
import { SECTORES, leerPct, pctMujeres, sumaCuadra, sumaSocios, type Socio } from "@/lib/candidatura-nueva";
import { textoLimite } from "@/lib/subidas";

interface FilaSocio {
  clave: number;
  nombre: string;
  pct: string;
  mujer: boolean;
}

const cifra = (n: number) => String(n).replace(".", ",");

/**
 * Presentar el proyecto, desde su enlace privado y con el NDA ya aceptado
 * (REVISION, 22 nov · bloque 3).
 *
 * Lo que pide es lo que usa el filtro, y nada más: sector, estadio, quién
 * tiene el capital y cuánto en manos de mujeres, la prueba del estadio y, en
 * idea, quién de IWL la recomienda. La suma de los socios y la parte de
 * mujeres se ven mientras se escriben; la regla la aplica la base al
 * enviar, no este formulario.
 *
 * Enviada, el acuse es la pantalla cambiada: dice en qué ha quedado.
 */
export function PresentarProyecto({
  token,
  recomiendan,
}: {
  token: string;
  /** Las personas de IWL que pueden recomendar una idea */
  recomiendan: Array<{ id: string; nombre: string }>;
}) {
  const [sector, setSector] = useState("");
  const [estadio, setEstadio] = useState<Estadio | "">("");
  const [filas, setFilas] = useState<FilaSocio[]>([{ clave: 1, nombre: "", pct: "", mujer: true }]);
  const { progreso, conSubidas } = useSubidas();

  const socios: Socio[] = filas
    .filter((f) => f.nombre.trim() || f.pct.trim())
    .map((f) => ({ nombre: f.nombre.trim(), pct: leerPct(f.pct) ?? 0, mujer: f.mujer }));
  const suma = sumaSocios(socios);
  const mujeres = pctMujeres(socios);

  const cambiar = (clave: number, cambio: Partial<FilaSocio>) =>
    setFilas((antes) => antes.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  return (
    <Formulario
      accion={conSubidas(enviarCandidatura, [
        { campo: "prueba", clase: "candidata", preparar: (fichero) => prepararSubidaPrueba(token, fichero) },
      ])}
      className="gap-5"
    >
      {(r) => (
        <>
          <input type="hidden" name="token" value={token} />

          <Campo etiqueta="En una frase, qué hacéis" obligatorio error={r.ok ? undefined : r.campos?.one_liner}>
            <AreaTexto name="one_liner" rows={2} required />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Sector" obligatorio error={r.ok ? undefined : r.campos?.sector}>
              <Seleccion name="sector" value={sector} onChange={(e) => setSector(e.currentTarget.value)} required>
                <option value="">Elige…</option>
                {SECTORES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Web" error={r.ok ? undefined : r.campos?.website}>
              <Texto name="website" placeholder="https://" />
            </Campo>
          </div>
          {sector === "Otro" ? (
            <Campo
              etiqueta="¿Cuál?"
              ayuda="Fuera de los sectores de la convocatoria, la candidatura la revisa el equipo a mano"
              obligatorio
              error={r.ok ? undefined : r.campos?.sector_otro}
            >
              <Texto name="sector_otro" required />
            </Campo>
          ) : null}

          <Campo
            etiqueta="Estadio"
            ayuda={estadio ? DESCRIPCION_ESTADIO[estadio] : "En qué punto está el proyecto de verdad"}
            obligatorio
            error={r.ok ? undefined : r.campos?.estadio}
          >
            <Seleccion
              name="estadio"
              value={estadio}
              onChange={(e) => setEstadio(e.currentTarget.value as Estadio | "")}
              required
            >
              <option value="">Elige…</option>
              {ORDEN_ESTADIOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADIOS[e]}
                </option>
              ))}
            </Seleccion>
          </Campo>

          {estadio === "idea" ? (
            <Campo
              etiqueta="Recomendada por"
              ayuda="Un proyecto en idea entra con la recomendación de alguien del equipo de IWL, que tendrá que confirmarla"
              obligatorio
              error={r.ok ? undefined : r.campos?.recomendada_por}
            >
              <Seleccion name="recomendada_por" defaultValue="" required>
                <option value="">Elige a la persona…</option>
                {recomiendan.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
          ) : estadio ? (
            <Campo
              etiqueta="Prueba del estadio"
              ayuda={`Algo que muestre el MVP, el piloto o la facturación: capturas, el acuerdo de piloto, una factura. ${textoLimite("candidata")}`}
              obligatorio
              error={r.ok ? undefined : r.campos?.prueba}
            >
              <input
                type="file"
                name="prueba"
                required
                className="text-sm text-secundario file:mr-3 file:border file:border-filete file:bg-papel file:px-3 file:py-1.5 file:text-sm file:text-titular"
              />
            </Campo>
          ) : null}

          <fieldset className="flex flex-col gap-3" aria-describedby="suma-socios">
            <legend className="mb-1 text-sm font-semibold text-titular">Quién tiene el capital</legend>
            <p className="text-xs text-secundario">
              Cada socio o socia con su parte, y si es mujer. Entre todos, el 100 %. Si todavía no
              hay sociedad, como lo tengáis pactado.
            </p>
            {filas.map((f, i) => (
              <div key={f.clave} className="grid grid-cols-[1fr_6rem] items-end gap-3 sm:grid-cols-[1fr_6rem_auto_auto]">
                <Campo etiqueta={i === 0 ? "Nombre" : `Nombre (${i + 1})`}>
                  <Texto name="socio_nombre" value={f.nombre} onChange={(e) => cambiar(f.clave, { nombre: e.currentTarget.value })} />
                </Campo>
                <Campo etiqueta="%">
                  <Texto name="socio_pct" inputMode="decimal" value={f.pct} onChange={(e) => cambiar(f.clave, { pct: e.currentTarget.value })} />
                </Campo>
                <label className="flex items-center gap-2 pb-2 text-sm text-titular">
                  <input type="checkbox" checked={f.mujer} onChange={(e) => cambiar(f.clave, { mujer: e.currentTarget.checked })} className="size-4" />
                  Es mujer
                </label>
                {/* La casilla no viaja si está sin marcar: va su valor en un campo propio, fila a fila */}
                <input type="hidden" name="socio_mujer" value={f.mujer ? "si" : "no"} />
                {filas.length > 1 ? (
                  <button
                    type="button"
                    className="accion mb-1 text-xs"
                    onClick={() => setFilas((antes) => antes.filter((x) => x.clave !== f.clave))}
                  >
                    Quitar
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <div>
              <button
                type="button"
                className="accion text-xs"
                onClick={() =>
                  setFilas((antes) => [...antes, { clave: Math.max(...antes.map((x) => x.clave)) + 1, nombre: "", pct: "", mujer: true }])
                }
              >
                Añadir otro socio
              </button>
            </div>
            <p id="suma-socios" className="cifra text-sm text-cuerpo" role="status">
              Suman el {cifra(suma)} %{sumaCuadra(socios) ? "" : " (tienen que sumar el 100 %)"} · en manos de mujeres, el {cifra(mujeres)} %
            </p>
            {!r.ok && r.campos?.socios ? <p className="text-xs text-mal">{r.campos.socios}</p> : null}
          </fieldset>

          <BarraSubida progreso={progreso} />
          <div>
            <Boton>Enviar la candidatura</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
