import { AsistenteHoja, ResumenTramos } from "@/components/vistas/hoja";
import { conAcuerdoFirmado, esEstadio, etiquetaEtapa } from "@/lib/estadios";
import { leerListaEntrada, leerSeguimiento, resumenLista } from "@/lib/datos/hoja";
import { plazoMaximoMeses } from "@/lib/tramos";
import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ResumenCompania } from "@/lib/datos/compania";
import { estadoEquity } from "@/lib/entrada";
import {
  Bloque,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { AbrirAnexo, EditarAnexo } from "@/components/formularios/programa";
import { BloqueEstadio, ESTADOS_ANEXO, PropuestaAcuerdo } from "@/components/vistas/acuerdo";
import { equity, euros, fecha, numero } from "@/lib/utils";
import { tarifaAnexo } from "@/lib/anexo";

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
  paso,
}: {
  resumen: NonNullable<ResumenCompania>;
  /** El paso del asistente de la hoja de ruta, si viene en la dirección */
  paso?: number;
}) {
  const base = resumen.permisos.esIwl
    ? `/cartera/${resumen.compania.slug}`
    : "/proyecto";
  const supabase = await clienteServidor();
  const companyId = resumen.compania.id;
  const { compania } = resumen;
  const esIwl = resumen.permisos.esIwl;
  // El mentor principal prepara la hoja de ruta en entrada (REVISION, 23 nov)
  const coordina = resumen.permisos.coordina;

  const [anexo, hitos, pilares, ajusteTarifa, versiones] = await Promise.all([
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
    supabase
      .from("company_pillars")
      .select("intensity, cadence, is_active, pillars ( name, description, order_index )")
      .eq("company_id", companyId),
    supabase.from("platform_settings").select("value").eq("key", "anexo_tarifa_hora").maybeSingle(),
    supabase
      .from("anexo_versiones")
      .select("id, momento, contenido, autor_nombre, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  const [seguimiento, lista] = await Promise.all([
    leerSeguimiento(companyId),
    coordina ? leerListaEntrada(companyId) : Promise.resolve(null),
  ]);

  const listaHitos = hitos.data ?? [];
  // La base no deja proponer con la lista a medio verificar (`annexes_guard_lista`)
  const porVerificar = lista ? resumenLista(lista.items).porVerificar : 0;
  const cumplidos = listaHitos.filter((h) => h.status === "cumplido").length;
  const queCondicionan = listaHitos.filter((h) => h.gates_investable);

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {etiquetaEtapa(esEstadio(compania.entry_state) ? compania.entry_state : null, conAcuerdoFirmado(compania.annexes))}
            </Metadato>
          }
        >
          Estadio
        </TituloBloque>
        {/*
          Aquí iban las fases antiguas del programa (Due diligence conjunto,
          Incubación…) en una fila. No conviven con los cuatro tramos de la
          hoja de ruta y se quitaron (REVISION, 24 nov). Queda el estadio,
          que es de lo que salen el programa y los tramos.
        */}
        <BloqueEstadio compania={compania} esAdmin={resumen.permisos.esAdmin} />
      </Bloque>

      {/* Preparar la hoja de ruta, con el Anexo en borrador (REVISION, 22 y 23 nov) */}
      {/* Mientras el Acuerdo no esté firmado: en entrada, o una compañía sin hoja de ruta todavía */}
      {coordina && lista && (compania.tramo === "entrada" || !seguimiento.tramos.length || !seguimiento.firma) ? (
        <AsistenteHoja
          lista={lista}
          seguimiento={seguimiento}
          companyId={companyId}
          slug={compania.slug}
          hoy={new Date().toISOString().slice(0, 10)}
          anexoEnBorrador={!anexo.data || anexo.data.status === "borrador"}
          paso={paso}
          esDireccion={resumen.permisos.esAdmin}
        />
      ) : null}

      {/* La sección I del Anexo: los tramos con sus hitos y el plazo máximo */}
      {seguimiento.tramos.length && seguimiento.estadio ? (
        <Bloque id="anexo-hoja">
          <TituloBloque accion={<Metadato>Plazo máximo: {plazoMaximoMeses(seguimiento.estadio)} meses desde la firma</Metadato>}>
            I · Hitos y calendario
          </TituloBloque>
          <div className="px-4 py-4">
            <ResumenTramos seguimiento={seguimiento} />
          </div>
        </Bloque>
      ) : null}

      {anexo.data ? (
        <Bloque>
          <TituloBloque
            accion={
              <Metadato>
                {anexo.data.status === "firmado"
                  ? `Firmado el ${fecha(anexo.data.signed_on)}`
                  : (ESTADOS_ANEXO[anexo.data.status] ?? anexo.data.status)}
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
                  ? `Valoradas en ${euros(Number(anexo.data.committed_hours_value))}${
                      anexo.data.committed_hours_value_motivo
                        ? `, no con la tarifa del programa: ${anexo.data.committed_hours_value_motivo}`
                        : ""
                    }`
                  : undefined
              }
            />
            <Dato
              etiqueta="Financiación directa"
              // Vacía o 0 es lo mismo: no hay financiación (REVISION, 10 nov)
              valor={
                Number(anexo.data.committed_cash ?? 0) > 0
                  ? euros(Number(anexo.data.committed_cash))
                  : "Sin financiación"
              }
            />
            <Dato
              etiqueta="Equity"
              valor={
                equity(anexo.data.equity_pct)
              }
              /*
               * Sin sociedad no hay participaciones que comprar: el equity
               * queda comprometido y se materializa al constituirla, con el
               * hito «Constituir la sociedad». La cláusula la define
               * Luciana con asesoría legal.
               */
              nota={
                estadoEquity(compania.situacion_societaria, anexo.data.equity_materializado_on) === "materializado"
                  ? `Materializado el ${fecha(anexo.data.equity_materializado_on)}`
                  : estadoEquity(compania.situacion_societaria, null) === "comprometido"
                    ? "Comprometido · se materializa al constituir"
                    : undefined
              }
            />
          </div>

          {/* El Anexo con su sección I, en PDF: propuesto o firmado, tal como se propuso o firmó */}
          <p className="border-t border-filete px-4 py-3 text-sm">
            <a href={`/anexo/${anexo.data.id}`} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
              Descargar el Anexo en PDF
            </a>
          </p>

          {anexo.data.other_commitments ? (
            <p className="border-t border-filete px-4 py-3 text-sm text-secundario">
              {anexo.data.other_commitments}
            </p>
          ) : null}

          {/*
            Un borrador se rellena aquí mismo. Firmado, solo se lee: la base
            deja de aceptar cambios en horas, dinero y equity.
          */}
          {esIwl && anexo.data.status === "borrador" ? (
            <EditarAnexo slug={compania.slug} anexo={anexo.data} tarifa={tarifaAnexo(ajusteTarifa.data?.value)} />
          ) : null}

          {/* El Anexo es también la propuesta de Acuerdo: proponerlo, comentarlo, aceptarlo y firmarlo */}
          <div id="anexo" className="scroll-mt-48">
            <PropuestaAcuerdo
              anexo={anexo.data}
              compania={compania}
              esIwl={esIwl}
              esFundadora={resumen.permisos.esFundadora}
              bloqueo={porVerificar ? `Faltan ${porVerificar} por verificar en la lista de entrada: hasta entonces no se puede proponer.` : null}
            />
          </div>

          <HistorialAnexo versiones={versiones.data ?? []} />

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
            {esIwl
              ? "Todavía no hay Anexo. Ábrelo y queda en borrador: pones la duración, lo que IWL compromete y el equity; después se lo propones, ella lo acepta en la plataforma y se firma. Sin Anexo no se pueden imputar horas."
              : compania.tramo === "entrada"
                ? "Todavía no hay propuesta de Acuerdo. Cuando IWL decida tu incorporación, la verás aquí con sus cifras para comentarla y aceptarla."
                : "Todavía no hay Anexo firmado. Se firma tras la revisión de entrada, que es el diagnóstico en idea y el due diligence en los demás estadios. En él se acuerdan los pilares, la duración y los hitos."}
          </SinDatos>
          {esIwl ? (
            <div className="px-4 pb-4">
              <AbrirAnexo
                slug={compania.slug}
                companyId={companyId}
                hayFirmado={false}
              />
            </div>
          ) : null}
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
            className="enlace text-acento-texto"
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

type ContenidoVersion = {
  version?: number;
  equity_pct?: number | null;
  committed_hours?: number | null;
  committed_hours_value?: number | null;
  committed_hours_value_motivo?: string | null;
  committed_cash?: number | null;
  duration_months?: number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  other_commitments?: string | null;
  firmantes?: { nombre?: string }[] | null;
  signed_on?: string | null;
};

/**
 * Las copias que hace la base al proponer y al firmar (REVISION, 11 nov).
 * Solo se leen: si ella comentó unas cifras y después cambiaron, aquí se
 * ve qué decía cada propuesta.
 */
function HistorialAnexo({
  versiones,
}: {
  versiones: { id: string; momento: string; contenido: unknown; autor_nombre: string | null; created_at: string }[];
}) {
  if (versiones.length === 0) return null;
  return (
    <details className="border-t border-filete px-4 py-3">
      <summary className="accion cursor-pointer text-xs">
        Historial de versiones · {versiones.length}
      </summary>
      <ol className="mt-3 flex flex-col gap-3">
        {versiones.map((v) => {
          const c = (v.contenido ?? {}) as ContenidoVersion;
          const firmantes = (Array.isArray(c.firmantes) ? c.firmantes : []).map((f) => f.nombre).filter(Boolean);
          return (
            <li key={v.id} className="flex flex-col gap-1 text-xs">
              <p className="flex flex-wrap gap-x-3">
                <span className="text-titular">
                  {v.momento === "firmado" ? "Firmado" : "Propuesto"}
                  {c.version ? ` · versión ${c.version}` : ""}
                </span>
                <span className="cifra text-metadato">
                  {fecha(v.momento === "firmado" && c.signed_on ? c.signed_on : v.created_at)}
                </span>
                {v.autor_nombre ? <span className="text-secundario">{v.autor_nombre}</span> : null}
              </p>
              <p className="text-secundario">
                {[
                  c.equity_pct === null || c.equity_pct === undefined
                    ? "Sin equity"
                    : `Equity ${equity(c.equity_pct)}`,
                  c.committed_hours
                    ? `${numero(Number(c.committed_hours), 0)} h${
                        c.committed_hours_value ? ` valoradas en ${euros(Number(c.committed_hours_value))}` : ""
                      }`
                    : "Sin horas",
                  Number(c.committed_cash ?? 0) > 0 ? `Financiación ${euros(Number(c.committed_cash))}` : "Sin financiación",
                  c.duration_months
                    ? `${c.duration_months} meses${c.starts_on ? `, ${fecha(c.starts_on)} — ${fecha(c.ends_on)}` : ""}`
                    : "Duración sin fijar",
                ].join(" · ")}
              </p>
              {c.committed_hours_value_motivo ? (
                <p className="text-secundario">Otro valor que el calculado: {c.committed_hours_value_motivo}</p>
              ) : null}
              {c.other_commitments ? <p className="text-secundario">{c.other_commitments}</p> : null}
              {firmantes.length ? <p className="text-secundario">Firman: {firmantes.join(", ")}</p> : null}
            </li>
          );
        })}
      </ol>
    </details>
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
