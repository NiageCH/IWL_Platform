import Link from "next/link";
import { redirect } from "next/navigation";
import { personaActual, esIwl, clienteServidor } from "@/lib/supabase/servidor";
import { leerCartera } from "@/lib/datos/cartera";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { euros, numero, porcentaje } from "@/lib/utils";

export const metadata = { title: "Comparativa · Plataforma IWL" };

/**
 * Comparativa entre compañías en KPI comunes y dimensiones técnicas (§4.7).
 *
 * Las dimensiones se comparan por la distancia al objetivo de cada etapa, no
 * por el nivel bruto: un 2 en una pre-semilla y un 2 en una serie A no
 * significan lo mismo, y ponerlos en la misma columna sin más sería engañoso.
 */

const ETAPAS: Record<string, string> = {
  pre_semilla: "Pre-semilla",
  semilla: "Semilla",
  serie_a: "Serie A",
};

/** KPI que se comparan bien entre compañías de sectores distintos */
const KPI_COMUNES = [
  { codigo: "mrr", nombre: "MRR", formato: "moneda" },
  { codigo: "ingresos", nombre: "Ingresos", formato: "moneda" },
  { codigo: "clientes_pago", nombre: "Clientes de pago", formato: "numero" },
  { codigo: "caja", nombre: "Caja", formato: "moneda" },
  { codigo: "burn_mensual", nombre: "Burn", formato: "moneda" },
  { codigo: "equipo_personas", nombre: "Equipo", formato: "numero" },
] as const;

export default async function Comparativa() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (!esIwl(persona.role) && persona.role !== "revisor_niage") redirect("/proyecto");

  const { companias } = await leerCartera();

  if (companias.length < 2) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <Bloque>
            <TituloBloque>Comparativa</TituloBloque>
            <SinDatos>
              Hacen falta al menos dos compañías a tu alcance para comparar.
            </SinDatos>
        </Bloque>
      </main>
    );
  }

  // Todas las dimensiones que aplican a alguna de las compañías comparadas
  const dimensiones = new Map<string, string>();
  for (const c of companias) {
    for (const d of c.scoreTecnico.dimensiones) {
      if (d.aplica) dimensiones.set(d.codigo, d.nombre);
    }
  }

  const supabase = await clienteServidor();
  const periodo = companias
    .map((c) => c.kpis.periodo)
    .filter((p): p is string => Boolean(p))
    .sort()
    .reverse()[0];

  const { data: kpis } = periodo
    ? await supabase
        .from("kpi_series")
        .select("company_id, code, value")
        .eq("period", periodo)
    : { data: [] };

  const valor = (companyId: string, codigo: string) => {
    const fila = (kpis ?? []).find(
      (k) => k.company_id === companyId && k.code === codigo,
    );
    return fila?.value === null || fila?.value === undefined
      ? null
      : Number(fila.value);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="relative mb-6 pl-4">
        <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
          <h1 className="text-lg font-semibold tracking-tight text-titular">
            Comparativa
          </h1>
          <p className="mt-1 text-sm text-secundario">
            {companias.length} compañías, sobre la misma vara.
          </p>
        </div>

        <Bloque className="mb-6">
          <TituloBloque accion={<Metadato>Nivel · objetivo de su etapa</Metadato>}>
            Dimensiones técnicas
          </TituloBloque>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-filete text-left">
                  <th className="px-4 py-2 font-medium text-metadato">Dimensión</th>
                  {companias.map((c) => (
                    <th key={c.compania.id} className="px-4 py-2 font-medium">
                      <Link
                        href={`/cartera/${c.compania.slug}/tecnico`}
                        className="text-titular underline-offset-4 hover:underline"
                      >
                        {c.compania.name}
                      </Link>
                      <span className="block text-xs font-normal text-metadato">
                        {ETAPAS[c.compania.stage] ?? c.compania.stage}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-filete">
                {[...dimensiones.entries()].map(([codigo, nombre]) => (
                  <tr key={codigo}>
                    <td className="px-4 py-2.5 text-titular">{nombre}</td>
                    {companias.map((c) => {
                      const d = c.scoreTecnico.dimensiones.find(
                        (x) => x.codigo === codigo,
                      );

                      if (!d || !d.aplica) {
                        return (
                          <td key={c.compania.id} className="px-4 py-2.5 text-metadato">
                            No aplica
                          </td>
                        );
                      }

                      return (
                        <td key={c.compania.id} className="px-4 py-2.5">
                          <span className="cifra text-titular">
                            {d.evaluada ? d.nivel : "—"}{" "}
                            <span className="text-metadato">/ {d.objetivo}</span>
                          </span>
                          {d.brecha > 0 ? (
                            <span className="ml-2 text-xs text-mal">
                              −{d.brecha}
                            </span>
                          ) : d.objetivo === 0 ? (
                            /* Un objetivo de 0 no es un aprobado: es que la
                               etapa no exige nada todavía en esa dimensión */
                            <span className="ml-2 text-xs text-metadato">
                              sin exigencia en su etapa
                            </span>
                          ) : (
                            <span className="ml-2 text-xs text-metadato">
                              en objetivo
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="bg-elevado">
                  <td className="px-4 py-2.5 font-medium text-titular">
                    Score técnico
                  </td>
                  {companias.map((c) => (
                    <td key={c.compania.id} className="cifra px-4 py-2.5 text-titular">
                      {numero(c.scoreTecnico.valor, 1)}
                      {!c.scoreTecnico.completo ? (
                        <Etiqueta>
                          {c.scoreTecnico.sinEvaluar.length} sin evaluar
                        </Etiqueta>
                      ) : null}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Bloque>

        <Bloque className="mb-6">
          <TituloBloque
            accion={<Metadato>{periodo ? periodo.slice(0, 7) : "Sin datos"}</Metadato>}
          >
            KPI comunes
          </TituloBloque>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-filete text-left">
                  <th className="px-4 py-2 font-medium text-metadato">KPI</th>
                  {companias.map((c) => (
                    <th key={c.compania.id} className="px-4 py-2 font-medium text-titular">
                      {c.compania.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-filete">
                {KPI_COMUNES.map((kpi) => (
                  <tr key={kpi.codigo}>
                    <td className="px-4 py-2.5 text-titular">{kpi.nombre}</td>
                    {companias.map((c) => (
                      <td
                        key={c.compania.id}
                        className="cifra px-4 py-2.5 text-secundario"
                      >
                        {formatear(valor(c.compania.id, kpi.codigo), kpi.formato)}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr>
                  <td className="px-4 py-2.5 text-titular">Runway</td>
                  {companias.map((c) => (
                    <td key={c.compania.id} className="cifra px-4 py-2.5 text-secundario">
                      {c.kpis.derivados.runway_meses === null
                        ? "—"
                        : `${numero(c.kpis.derivados.runway_meses, 1)} meses`}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-4 py-2.5 text-titular">Crecimiento de MRR</td>
                  {companias.map((c) => (
                    <td key={c.compania.id} className="cifra px-4 py-2.5 text-secundario">
                      {porcentaje(c.kpis.derivados.crecimiento_mrr)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-elevado">
                  <td className="px-4 py-2.5 font-medium text-titular">Preparación</td>
                  {companias.map((c) => (
                    <td key={c.compania.id} className="cifra px-4 py-2.5 text-titular">
                      {numero(c.scorePreparacion.valor, 1)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
            Los KPI de sector, como unidades fabricadas o coste de inferencia, no
            entran aquí: no se comparan entre compañías de sectores distintos.
          </p>
        </Bloque>
    </main>
  );
}

function formatear(valor: number | null, formato: string): string {
  if (valor === null) return "—";
  if (formato === "moneda") return euros(valor);
  return numero(valor, 0);
}
