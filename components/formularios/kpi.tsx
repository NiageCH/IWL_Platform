"use client";

import { guardarUpdate, guardarValoresDelMes } from "@/lib/acciones/kpi";
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
              <Seleccion name="status" defaultValue={update?.status ?? "borrador"}>
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
