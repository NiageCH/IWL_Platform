import { clienteServidor } from "@/lib/supabase/servidor";
import { calcularDerivados } from "@/lib/scoring/kpi-derivados";
import type { ResumenCompania } from "@/lib/datos/compania";
import { SerieKpi } from "@/components/serie-kpi";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { CargaKpis, FormularioUpdate } from "@/components/formularios/kpi";
import { valorKpi as formatear } from "@/lib/etiquetas";
import { fecha, numero, porcentaje } from "@/lib/utils";

/**
 * Update mensual y KPI (§4.6).
 *
 * El valor se carga una vez en el update y desde ahí alimenta dashboard, plan
 * financiero e informe. Las métricas derivadas no se teclean: se calculan.
 */

const ESTADOS_UPDATE: Record<string, string> = {
  borrador: "Borrador",
  entregado: "Entregado",
  revisado: "Revisado por IWL",
};

/** KPI que se dibujan en el tiempo, en este orden */
const SERIES = ["mrr", "ingresos", "clientes_pago", "caja"] as const;

export async function VistaKpi({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const supabase = await clienteServidor();
  const companyId = resumen.compania.id;
  const { permisos, compania } = resumen;

  const [series, updates, cartera] = await Promise.all([
    supabase
      .from("kpi_series")
      .select("period, code, name, unit, value, target_value, category")
      .eq("company_id", companyId)
      .order("period"),
    supabase
      .from("monthly_updates")
      .select("id, period, status, achievements, blockers, requests, due_date, submitted_at")
      .eq("company_id", companyId)
      .order("period", { ascending: false }),
    // Los KPI que esta compañía sigue y se teclean: el núcleo y los de su
    // sector. Los técnicos no, que llegan del análisis del repositorio
    supabase
      .from("company_kpis")
      .select(
        "id, order_index, custom_name, custom_unit, kpi_definitions ( code, name, unit, category )",
      )
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("order_index"),
  ]);

  const filas = series.data ?? [];

  /*
   * Sin ningún valor cargado, la pantalla enseñaba solo un mensaje vacío y el
   * formulario de carga quedaba fuera: para cargar el primer dato hacía falta
   * tener datos. Una compañía recién dada de alta se quedaba atascada ahí.
   *
   * Ahora el estado vacío trae el formulario, que es lo único que hace falta
   * en ese momento.
   */
  if (filas.length === 0) {
    const cargablesIniciales = (cartera.data ?? [])
      .filter((ck) => ck.kpi_definitions?.category !== "tecnico")
      .map((ck) => ({
        companyKpiId: ck.id,
        nombre: ck.kpi_definitions?.name ?? ck.custom_name ?? "Sin nombre",
        unidad: ck.kpi_definitions?.unit ?? ck.custom_unit ?? "numero",
        valor: null,
      }));

    const mesInicial = new Date().toISOString().slice(0, 7);

    return (
      <Bloque>
        <TituloBloque accion={<Metadato>Primer mes</Metadato>}>
          Cargar los KPI del mes
        </TituloBloque>
        <SinDatos>
          Todavía no hay valores cargados. El primero fija la línea de partida
          del seguimiento, y a partir de ahí la plataforma calcula el runway, el
          crecimiento y la conversión sin que nadie los teclee.
        </SinDatos>
        {permisos.puedeEscribir && cargablesIniciales.length > 0 ? (
          <CargaKpis
            slug={compania.slug}
            companyId={companyId}
            mes={mesInicial}
            kpis={cargablesIniciales}
          />
        ) : null}
      </Bloque>
    );
  }

  const periodos = [...new Set(filas.map((f) => f.period!))].sort();

  // Las derivadas se calculan para todos los meses, no solo el último: es lo
  // que permite ver la evolución del runway sin que nadie lo introduzca
  const derivadosPorPeriodo = new Map(
    periodos.map((periodo, i) => {
      const valores = (p: string) =>
        Object.fromEntries(
          filas.filter((f) => f.period === p).map((f) => [f.code!, f.value === null ? null : Number(f.value)]),
        );
      return [
        periodo,
        calcularDerivados(
          { periodo, valores: valores(periodo) },
          i > 0 ? { periodo: periodos[i - 1], valores: valores(periodos[i - 1]) } : null,
        ),
      ];
    }),
  );

  const ultimo = periodos[periodos.length - 1];
  const tecnicos = filas.filter((f) => f.category === "tecnico" && f.period === ultimo);

  // El mes que toca cargar: el siguiente al último con datos
  const mesACargar = siguienteMes(ultimo);

  const cargables = (cartera.data ?? [])
    .filter((ck) => ck.kpi_definitions?.category !== "tecnico")
    .map((ck) => ({
      companyKpiId: ck.id,
      nombre: ck.kpi_definitions?.name ?? ck.custom_name ?? "Sin nombre",
      unidad: ck.kpi_definitions?.unit ?? ck.custom_unit ?? "numero",
      valor:
        filas.find(
          (f) =>
            f.code === ck.kpi_definitions?.code && f.period === `${mesACargar}-01`,
        )?.value ?? null,
    }))
    .map((k) => ({ ...k, valor: k.valor === null ? null : Number(k.valor) }));

  const updateDelMes = (updates.data ?? []).find(
    (u) => u.period === `${mesACargar}-01`,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        {SERIES.map((codigo) => {
          const puntos = filas
            .filter((f) => f.code === codigo)
            .map((f) => ({
              periodo: f.period!,
              valor: f.value === null ? null : Number(f.value),
              objetivo: f.target_value === null ? null : Number(f.target_value),
            }));

          if (puntos.length === 0) return null;

          const definicion = filas.find((f) => f.code === codigo)!;

          return (
            <Bloque key={codigo}>
              <TituloBloque accion={<Metadato>{puntos.length} meses</Metadato>}>
                {definicion.name}
              </TituloBloque>
              <div className="px-4 py-4">
                <SerieKpi
                  puntos={puntos}
                  unidad={definicion.unit ?? "numero"}
                  nombre={definicion.name ?? codigo}
                />
              </div>
            </Bloque>
          );
        })}
      </div>

      <Bloque>
        <TituloBloque accion={<Metadato>Calculadas, no introducidas</Metadato>}>
          Métricas derivadas
        </TituloBloque>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-filete text-left">
                <th className="px-4 py-2 font-medium text-metadato">Mes</th>
                <th className="px-4 py-2 text-right font-medium text-metadato">Runway</th>
                <th className="px-4 py-2 text-right font-medium text-metadato">
                  Crecimiento MRR
                </th>
                <th className="px-4 py-2 text-right font-medium text-metadato">
                  Conversión piloto
                </th>
                <th className="px-4 py-2 text-right font-medium text-metadato">
                  Coste cloud sobre ingresos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-filete">
              {[...periodos].reverse().map((periodo) => {
                const d = derivadosPorPeriodo.get(periodo)!;
                return (
                  <tr key={periodo}>
                    <td className="cifra px-4 py-2.5 text-titular">{periodo.slice(0, 7)}</td>
                    <td className="cifra px-4 py-2.5 text-right text-secundario">
                      {d.runway_meses === null ? "—" : `${numero(d.runway_meses, 1)} meses`}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-secundario">
                      {porcentaje(d.crecimiento_mrr)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-secundario">
                      {porcentaje(d.conversion_piloto_cliente)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-secundario">
                      {porcentaje(d.coste_cloud_sobre_ingresos)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Bloque>

      {tecnicos.length > 0 ? (
        <Bloque>
          <TituloBloque accion={<Metadato>Del análisis del repositorio</Metadato>}>
            KPI técnicos
          </TituloBloque>
          <ul className="divide-y divide-filete">
            {tecnicos.map((t) => (
              <li key={t.code} className="flex items-baseline gap-3 px-4 py-2.5">
                <span className="flex-1 text-sm text-titular">{t.name}</span>
                <span className="cifra text-sm text-secundario">
                  {formatear(t.unit, t.value === null ? null : Number(t.value))}
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      {permisos.puedeEscribir ? (
        <>
          <Bloque>
            <TituloBloque accion={<Metadato>Se carga una vez</Metadato>}>
              Cargar los KPI del mes
            </TituloBloque>
            <CargaKpis
              slug={compania.slug}
              companyId={companyId}
              mes={mesACargar}
              kpis={cargables}
            />
          </Bloque>

          <Bloque>
            <TituloBloque accion={<Metadato>{mesACargar}</Metadato>}>
              Update mensual
            </TituloBloque>
            <FormularioUpdate
              slug={compania.slug}
              companyId={companyId}
              mes={mesACargar}
              update={updateDelMes ?? null}
              puedeRevisar={permisos.esIwl}
            />
          </Bloque>
        </>
      ) : null}

      <Bloque>
        <TituloBloque accion={<Metadato>{(updates.data ?? []).length} updates</Metadato>}>
          Updates mensuales
        </TituloBloque>
        {(updates.data ?? []).length === 0 ? (
          <SinDatos>Sin updates entregados todavía.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {(updates.data ?? []).map((u) => (
              <li key={u.id} className="px-4 py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="cifra text-sm font-medium text-titular">
                    {u.period.slice(0, 7)}
                  </span>
                  <Etiqueta>{ESTADOS_UPDATE[u.status] ?? u.status}</Etiqueta>
                  {u.submitted_at ? (
                    <Metadato>Entregado {fecha(u.submitted_at)}</Metadato>
                  ) : u.due_date ? (
                    <Metadato>Vence {fecha(u.due_date)}</Metadato>
                  ) : null}
                </div>
                {u.achievements ? (
                  <p className="mt-2 text-sm text-titular">{u.achievements}</p>
                ) : null}
                {u.blockers ? (
                  <p className="mt-1 text-sm text-secundario">Bloqueos: {u.blockers}</p>
                ) : null}
                {u.requests ? (
                  <p className="mt-1 border-l-2 border-acento pl-3 text-sm text-secundario">
                    Pide a IWL: {u.requests}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}

/** El mes siguiente al último con datos, en formato AAAA-MM */
function siguienteMes(ultimo: string | undefined): string {
  const base = ultimo ? new Date(`${ultimo.slice(0, 7)}-01T00:00:00Z`) : new Date();
  if (ultimo) base.setUTCMonth(base.getUTCMonth() + 1);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
}
