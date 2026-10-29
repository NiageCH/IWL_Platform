"use client";

import { useState } from "react";
import { Pencil, Unlock } from "lucide-react";
import type { MesCargado } from "@/lib/datos/correcciones";

import {
  guardarUpdate,
  guardarValorKpi,
  guardarValoresDelMes,
  reabrirUpdate,
} from "@/lib/acciones/kpi";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/**
 * Carga de los KPI del mes (§4.6).
 *
 * Una columna con todos los KPI del núcleo y se guarda una vez. Los KPI
 * técnicos no aparecen: llegan del análisis del repositorio, no se teclean.
 * Las métricas derivadas tampoco: se calculan de estos valores.
 */
export function CargaKpis({
  slug,
  companyId,
  mes,
  kpis,
}: {
  slug: string;
  companyId: string;
  mes: string;
  kpis: Array<{
    companyKpiId: string;
    nombre: string;
    unidad: string;
    valor: number | null;
  }>;
}) {
  return (
    <Formulario accion={guardarValoresDelMes} className="px-4 py-4">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="company_id" value={companyId} />

          <Campo etiqueta="Mes" ayuda="El mes al que corresponden los valores">
            <Texto
              name="period"
              defaultValue={mes}
              pattern="\d{4}-\d{2}"
              placeholder="2026-09"
              required
              className="w-32"
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k) => (
              <Campo
                key={k.companyKpiId}
                etiqueta={k.nombre}
                ayuda={UNIDADES[k.unidad]}
                error={
                  !resultado.ok
                    ? resultado.campos?.[`kpi:${k.companyKpiId}`]
                    : undefined
                }
              >
                <Texto
                  name={`kpi:${k.companyKpiId}`}
                  inputMode="decimal"
                  defaultValue={k.valor === null ? "" : String(k.valor)}
                  error={
                    !resultado.ok &&
                    Boolean(resultado.campos?.[`kpi:${k.companyKpiId}`])
                  }
                />
              </Campo>
            ))}
          </div>

          <div>
            <Boton>Guardar los valores del mes</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

const UNIDADES: Record<string, string> = {
  moneda: "En euros",
  porcentaje: "En porcentaje",
  numero: "Número",
  meses: "En meses",
  dias: "En días",
  ratio: "Ratio",
};

/**
 * Update mensual: logros, bloqueos y lo que la compañía pide a IWL.
 * Entregarlo es de la compañía; darlo por revisado, de IWL.
 */
export function FormularioUpdate({
  slug,
  companyId,
  mes,
  update,
  puedeRevisar,
}: {
  slug: string;
  companyId: string;
  mes: string;
  update: {
    status: string;
    achievements: string | null;
    blockers: string | null;
    requests: string | null;
  } | null;
  puedeRevisar: boolean;
}) {
  return (
    <Formulario accion={guardarUpdate} className="px-4 py-4">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="company_id" value={companyId} />

          <Campo
            etiqueta="Mes"
            error={!resultado.ok ? resultado.campos?.period : undefined}
          >
            <Texto
              name="period"
              defaultValue={mes}
              pattern="\d{4}-\d{2}"
              required
              className="w-32"
              error={!resultado.ok && Boolean(resultado.campos?.period)}
            />
          </Campo>

          <Campo etiqueta="Logros del mes">
            <AreaTexto
              name="achievements"
              rows={3}
              defaultValue={update?.achievements ?? ""}
              placeholder="Qué se ha conseguido"
            />
          </Campo>

          <Campo etiqueta="Bloqueos">
            <AreaTexto
              name="blockers"
              rows={2}
              defaultValue={update?.blockers ?? ""}
              placeholder="Qué impide avanzar. Si no hay, se dice"
            />
          </Campo>

          <Campo etiqueta="Qué pides a IWL">
            <AreaTexto
              name="requests"
              rows={2}
              defaultValue={update?.requests ?? ""}
              placeholder="Contactos, revisión, decisiones"
            />
          </Campo>

          <div className="flex flex-wrap items-end gap-3">
            <Campo etiqueta="Estado">
              <Seleccion
                key={update?.status ?? "borrador"}
                name="status"
                defaultValue={update?.status ?? "borrador"}
              >
                <option value="borrador">Borrador</option>
                <option value="entregado">Entregado</option>
                {puedeRevisar ? <option value="revisado">Revisado por IWL</option> : null}
              </Seleccion>
            </Campo>
            <Boton>Guardar update</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/**
 * Corregir un mes ya cargado.
 *
 * No existía: la pantalla solo ofrece cargar «el siguiente al último con
 * datos», así que un MRR mal tecleado quedaba mal para siempre y arrastraba
 * el runway, el crecimiento y la comparativa.
 *
 * Un campo por KPI, con el valor actual puesto. Se guarda uno a uno y no
 * en bloque: una corrección es puntual —un número concreto que estaba
 * mal— y guardar la columna entera metería en el historial cambios que
 * nadie hizo.
 */
export function CorregirMes({
  slug,
  companyId,
  mes,
}: {
  slug: string;
  companyId: string;
  mes: MesCargado;
}) {
  const [abierto, setAbierto] = useState(false);

  if (mes.revisado) {
    return (
      <span className="text-xs text-metadato">
        Revisado por IWL. Para corregirlo, que lo reabran
      </span>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs"
      >
        <Pencil aria-hidden="true" className="size-3.5 text-acento-texto" />
        Corregir este mes
      </button>
    );
  }

  return (
    <div className="w-full border-t border-filete pt-3">
      <ul className="flex flex-col gap-3">
        {mes.valores.map((v) => (
          <li key={v.companyKpiId}>
            <Formulario accion={guardarValorKpi} className="gap-2">
              {(r) => (
                <>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="company_id" value={companyId} />
                  <input
                    type="hidden"
                    name="company_kpi_id"
                    value={v.companyKpiId}
                  />
                  <input type="hidden" name="period" value={mes.periodo} />

                  <Campo
                    etiqueta={v.nombre}
                    error={r.ok ? undefined : r.campos?.value}
                  >
                    <div className="flex gap-2">
                      <Texto
                        name="value"
                        inputMode="decimal"
                        defaultValue={v.valor === null ? "" : String(v.valor)}
                        className="flex-1"
                      />
                      <Boton>Corregir</Boton>
                    </div>
                  </Campo>

                  <Campo
                    etiqueta="Por qué cambia"
                    ayuda="Queda en el historial del mes, junto al valor anterior"
                  >
                    <Texto name="note" placeholder="Error al teclear" />
                  </Campo>
                </>
              )}
            </Formulario>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="mt-3 rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
      >
        Cerrar
      </button>
    </div>
  );
}

/**
 * Reabrir un mes que IWL ya revisó.
 *
 * Solo lo ve IWL. Deshacer una validación tiene que poder explicarse
 * después, así que la función de la base lo apunta en el registro de
 * actividad.
 */
export function ReabrirMes({
  slug,
  updateId,
}: {
  slug: string;
  updateId: string;
}) {
  return (
    <Formulario accion={reabrirUpdate} className="gap-0">
      {() => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={updateId} />
          <button type="submit" className="accion text-xs">
            <Unlock aria-hidden="true" className="size-3.5 text-acento-texto" />
            Reabrir para corregir
          </button>
        </>
      )}
    </Formulario>
  );
}
