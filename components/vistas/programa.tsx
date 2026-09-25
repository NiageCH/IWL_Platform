import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ResumenCompania } from "@/lib/datos/compania";
import {
  Bloque,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { euros, fecha, numero } from "@/lib/utils";

/**
 * El programa visto desde dentro: en qué fase estamos, qué se acordó y qué
 * llevamos cumplido (§4.5).
 *
 * Es lo que contesta a «¿dónde estoy y qué me toca?», que es la pregunta que
 * una fundadora se hace al entrar. Hasta ahora la plataforma enseñaba scores
 * pero no el proceso.
 */

export async function VistaPrograma({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const base = resumen.permisos.esIwl
    ? `/cartera/${resumen.compania.slug}`
    : "/proyecto";
  const supabase = await clienteServidor();
  const companyId = resumen.compania.id;
  const { compania } = resumen;

  const [anexo, hitos, fases, pilares] = await Promise.all([
    supabase
      .from("annexes")
      .select("*")
      .eq("company_id", companyId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("milestones")
      .select("*")
      .eq("company_id", companyId)
      .order("due_date", { nullsFirst: false }),
    supabase.from("phases").select("id, code, name, description, order_index").order("order_index"),
    supabase
      .from("company_pillars")
      .select("intensity, cadence, is_active, pillars ( name, description, order_index )")
      .eq("company_id", companyId),
  ]);

  const listaHitos = hitos.data ?? [];
  const cumplidos = listaHitos.filter((h) => h.status === "cumplido").length;
  const queCondicionan = listaHitos.filter((h) => h.gates_investable);

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={<Metadato>{compania.phases?.name ?? "Sin fase"}</Metadato>}
        >
          Fase del programa
        </TituloBloque>

        <ol className="flex flex-col gap-0 sm:flex-row">
          {(fases.data ?? []).map((f) => {
            const actual = f.id === compania.phase_id;
            const pasada =
              (compania.phases?.order_index ?? 0) > f.order_index;

            return (
              <li
                key={f.id}
                className={`relative flex-1 border-filete px-4 py-3 sm:border-l sm:first:border-l-0 ${
                  actual ? "bg-elevado" : ""
                }`}
              >
                {actual ? (
                  <span className="filete-acento absolute inset-x-0 top-0 h-0.5" />
                ) : null}
                <p
                  className={`text-sm ${
                    actual
                      ? "font-medium text-titular"
                      : pasada
                        ? "text-secundario"
                        : "text-metadato"
                  }`}
                >
                  {f.name}
                </p>
                <p className="mt-0.5 text-xs text-metadato">
                  {pasada ? "Superada" : actual ? "En curso" : "Por delante"}
                </p>
              </li>
            );
          })}
        </ol>
      </Bloque>

      {anexo.data ? (
        <Bloque>
          <TituloBloque
            accion={
              <Metadato>
                {anexo.data.status === "firmado"
                  ? `Firmado el ${fecha(anexo.data.signed_on)}`
                  : "Borrador"}
              </Metadato>
            }
          >
            Anexo de Programa
          </TituloBloque>

          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Dato
              etiqueta="Duración"
              valor={
                anexo.data.duration_months
                  ? `${anexo.data.duration_months} meses`
                  : "Sin fijar"
              }
              nota={
                anexo.data.starts_on
                  ? `${fecha(anexo.data.starts_on)} — ${fecha(anexo.data.ends_on)}`
                  : undefined
              }
            />
            <Dato
              etiqueta="Horas comprometidas"
              valor={
                anexo.data.committed_hours
                  ? `${numero(Number(anexo.data.committed_hours), 0)} h`
                  : "—"
              }
              nota={
                anexo.data.committed_hours_value
                  ? `Valoradas en ${euros(Number(anexo.data.committed_hours_value))}`
                  : undefined
              }
            />
            <Dato
              etiqueta="Financiación directa"
              valor={euros(
                anexo.data.committed_cash === null
                  ? null
                  : Number(anexo.data.committed_cash),
              )}
              nota={
                anexo.data.committed_seniors
                  ? `${anexo.data.committed_seniors} perfiles sénior asignados`
                  : undefined
              }
            />
            <Dato
              etiqueta="Equity"
              valor={
                anexo.data.equity_pct === null
                  ? "—"
                  : `${numero(Number(anexo.data.equity_pct), 0)} %`
              }
            />
          </div>

          {anexo.data.other_commitments ? (
            <p className="border-t border-filete px-4 py-3 text-sm text-secundario">
              {anexo.data.other_commitments}
            </p>
          ) : null}

          {(pilares.data ?? []).length > 0 ? (
            <div className="border-t border-filete px-4 py-3">
              <Metadato>Pilares activos</Metadato>
              <ul className="mt-2 flex flex-col gap-1.5">
                {(pilares.data ?? [])
                  .filter((p) => p.is_active)
                  .sort(
                    (a, b) =>
                      (a.pillars?.order_index ?? 0) - (b.pillars?.order_index ?? 0),
                  )
                  .map((p) => (
                    <li
                      key={p.pillars?.name}
                      className="flex flex-wrap items-baseline gap-3 text-sm"
                    >
                      <span className="text-titular">{p.pillars?.name}</span>
                      <Intensidad nivel={p.intensity} />
                      {p.cadence ? <Metadato>{p.cadence}</Metadato> : null}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </Bloque>
      ) : (
        <Bloque>
          <TituloBloque>Anexo de Programa</TituloBloque>
          <SinDatos>
            Todavía no hay Anexo firmado. Se firma al terminar el due diligence
            conjunto y es donde se acuerdan los pilares, la duración y los hitos.
          </SinDatos>
        </Bloque>
      )}

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {cumplidos} de {listaHitos.length} cumplidos
            </Metadato>
          }
        >
          Hitos
        </TituloBloque>
        <p className="px-4 py-4 text-sm text-secundario">
          Los hitos viven en la{" "}
          <Link
            href={`${base}/ruta`}
            className="text-acento-texto underline decoration-filete underline-offset-4"
          >
            hoja de ruta
          </Link>
          , agrupados por la etapa a la que pertenecen. Aquí se ve solo el
          recuento, porque un hito suelto sin su tramo no dice gran cosa.
          {queCondicionan.length > 0 ? (
            <>
              {" "}
              {queCondicionan.filter((h) => h.status === "cumplido").length} de{" "}
              {queCondicionan.length} de los que condicionan el estado invertible
              están cumplidos.
            </>
          ) : null}
        </p>
      </Bloque>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Metadato>{etiqueta}</Metadato>
      <span className="cifra text-lg leading-none text-titular">{valor}</span>
      {nota ? <span className="text-xs text-secundario">{nota}</span> : null}
    </div>
  );
}

/** Intensidad del pilar, siempre con su lectura en texto */
function Intensidad({ nivel }: { nivel: number }) {
  const nombre = ["Sin actividad", "Baja", "Media", "Alta"][nivel] ?? "Media";
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-3 rounded-sm ${n <= nivel ? "bg-acento" : "bg-filete"}`}
          />
        ))}
      </span>
      <span className="text-xs text-metadato">{nombre}</span>
    </span>
  );
}
