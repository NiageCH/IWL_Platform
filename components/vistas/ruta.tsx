import type { ResumenCompania } from "@/lib/datos/compania";
import {
  ESTADOS_ETAPA,
  avancesDeEtapa,
  leerAvances,
  leerHojaDeRuta,
  leerPlantillas,
  nombreEstadoEntrada,
  type Avance,
  type Etapa,
  type HitoDeEtapa,
} from "@/lib/datos/ruta";
import { personaActual } from "@/lib/supabase/servidor";
import { EstadoHito } from "@/components/formularios/programa";
import {
  BorrarAvance,
  DisenarHojaDeRuta,
  EditorEtapa,
  NuevaEtapa,
  NuevoAvance,
  NuevoHito,
} from "@/components/formularios/ruta";
import {
  Bloque,
  Cifra,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { euros, fecha, numero } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * La hoja de ruta del proyecto.
 *
 * Las fases del programa son iguales para todos y dicen en qué punto del
 * contrato está la compañía. Esto es lo contrario: el recorrido que IWL
 * diseñó para este proyecto concreto, según el estado en que entró, con lo
 * que se persigue en cada tramo y lo que IWL pone en cada uno.
 *
 * Se lee de arriba abajo como una línea de tiempo, porque la pregunta que
 * contesta es «¿por dónde vamos?».
 */

const ESTADOS_HITO: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  retrasado: "Retrasado",
};

const TONO_ETAPA: Record<string, string> = {
  completada: "border-bien",
  en_curso: "border-acento",
  planificada: "border-filete",
  cancelada: "border-filete",
};

export async function VistaRuta({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { compania, permisos } = resumen;
  const persona = await personaActual();
  const [ruta, avances] = await Promise.all([
    leerHojaDeRuta(compania.id, compania.entry_state),
    leerAvances(compania.id, persona?.id ?? null),
  ]);

  if (ruta.etapas.length === 0) {
    const plantillas = permisos.esIwl ? await leerPlantillas() : [];

    return (
      <div className="flex flex-col gap-6">
        <Bloque>
          <TituloBloque>Hoja de ruta</TituloBloque>
          <SinDatos>
            {permisos.esIwl
              ? "Este proyecto todavía no tiene hoja de ruta. Se diseña partiendo de la plantilla que corresponda al estado en que entró, y a partir de ahí se edita libremente: la plantilla es el punto de partida, no el programa cerrado."
              : "IWL todavía no ha publicado la hoja de ruta de este proyecto. Se acuerda al firmar el Anexo, después del diagnóstico inicial."}
          </SinDatos>
        </Bloque>

        {permisos.esIwl && plantillas.length > 0 ? (
          <DisenarHojaDeRuta
            slug={compania.slug}
            companyId={compania.id}
            estadoEntrada={compania.entry_state}
            plantillas={plantillas.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              estadoEntrada: p.estadoEntrada,
              descripcion: p.descripcion,
              etapas: p.etapas.length,
              hitos: p.etapas.reduce((t, e) => t + e.hitos.length, 0),
              meses: p.meses,
            }))}
          />
        ) : null}

        {ruta.sueltos.length > 0 ? (
          <Bloque>
            <TituloBloque>Hitos ya acordados</TituloBloque>
            <ul className="divide-y divide-filete">
              {ruta.sueltos.map((h) => (
                <li key={h.id} className="px-4 py-3">
                  <Hito hito={h} slug={compania.slug} permisos={permisos} />
                </li>
              ))}
            </ul>
          </Bloque>
        ) : null}
      </div>
    );
  }

  const pctHitos =
    ruta.hitosTotales > 0
      ? Math.round((ruta.hitosCumplidos / ruta.hitosTotales) * 100)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Bloque elevacion={2}>
        <TituloBloque
          accion={
            compania.entry_state ? (
              <Etiqueta>Entró en {nombreEstadoEntrada(compania.entry_state)}</Etiqueta>
            ) : null
          }
        >
          Hoja de ruta
        </TituloBloque>
        <div className="grid gap-6 px-4 py-4 sm:grid-cols-4">
          <Cifra
            destacada
            valor={pctHitos === null ? "—" : `${pctHitos} %`}
            etiqueta="Recorrido"
            nota={`${ruta.hitosCumplidos} de ${ruta.hitosTotales} hitos cumplidos`}
          />
          <Cifra
            valor={ruta.etapaActual ? ruta.etapaActual.nombre : "—"}
            etiqueta={ruta.etapaAbierta ? "Etapa en curso" : "Etapa que toca"}
            nota={
              !ruta.etapaActual
                ? "Ninguna etapa abierta ni en plazo"
                : ruta.etapaAbierta
                  ? ruta.etapaActual.fin
                    ? `Hasta el ${fecha(ruta.etapaActual.fin)}`
                    : "Sin fecha de cierre"
                  : "Por calendario. Nadie la ha abierto todavía"
            }
          />
          <Cifra
            valor={numero(ruta.horasImputadas)}
            etiqueta="Horas de IWL"
            nota={
              ruta.horasPrevistas > 0
                ? `de ${numero(ruta.horasPrevistas)} previstas en el plan`
                : "sin previsión por etapa"
            }
          />
          <Cifra
            valor={`${ruta.etapas.filter((e) => e.estado === "completada").length} / ${ruta.etapas.length}`}
            etiqueta="Etapas cerradas"
          />
        </div>
      </Bloque>

      <ol className="flex flex-col gap-4">
        {ruta.etapas.map((etapa) => (
          <li key={etapa.id}>
            <TarjetaEtapa
              etapa={etapa}
              avances={avancesDeEtapa(avances, etapa.id)}
              slug={compania.slug}
              companyId={compania.id}
              permisos={permisos}
            />
          </li>
        ))}
      </ol>

      {permisos.esIwl ? (
        <NuevaEtapa
          slug={compania.slug}
          companyId={compania.id}
          siguienteOrden={Math.max(...ruta.etapas.map((e) => e.orden), -1) + 1}
        />
      ) : null}

      {ruta.sueltos.length > 0 ? (
        <Bloque>
          <TituloBloque
            accion={<Metadato>{ruta.sueltos.length} sin etapa</Metadato>}
          >
            Hitos fuera del plan
          </TituloBloque>
          <p className="border-b border-filete px-4 py-3 text-xs text-secundario">
            Nacen del due diligence o del plan técnico, cuando aparecen. No
            siempre encajan en un tramo previsto y por eso van aparte.
          </p>
          <ul className="divide-y divide-filete">
            {ruta.sueltos.map((h) => (
              <li key={h.id} className="px-4 py-3">
                <Hito hito={h} slug={compania.slug} permisos={permisos} />
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}
    </div>
  );
}

function TarjetaEtapa({
  etapa,
  avances,
  slug,
  companyId,
  permisos,
}: {
  etapa: Etapa;
  avances: Avance[];
  slug: string;
  companyId: string;
  permisos: NonNullable<ResumenCompania>["permisos"];
}) {
  const cumplidos = etapa.hitos.filter((h) => h.estado === "cumplido").length;

  return (
    <Bloque className={cn("border-l-2", TONO_ETAPA[etapa.estado])}>
      <TituloBloque accion={<Etiqueta>{ESTADOS_ETAPA[etapa.estado]}</Etiqueta>}>
        {etapa.orden + 1}. {etapa.nombre}
      </TituloBloque>

      <div className="flex flex-col gap-3 border-b border-filete px-4 py-3">
        <p className="text-sm text-cuerpo">{etapa.objetivo}</p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <Dato etiqueta="Plazo">
            {etapa.inicio && etapa.fin
              ? `${fecha(etapa.inicio)} → ${fecha(etapa.fin)}`
              : "Sin fechas"}
          </Dato>
          <Dato etiqueta="Hitos">
            {etapa.hitos.length === 0
              ? "Ninguno"
              : `${cumplidos} de ${etapa.hitos.length} cumplidos`}
          </Dato>
          <Dato etiqueta="Horas de IWL">
            {etapa.horasPrevistas === null
              ? `${numero(etapa.horasImputadas)} imputadas`
              : `${numero(etapa.horasImputadas)} de ${numero(etapa.horasPrevistas)}${etapa.horasPct === null ? "" : ` · ${etapa.horasPct} %`}`}
          </Dato>
          {etapa.cajaPrevista ? (
            <Dato etiqueta="Caja prevista">{euros(etapa.cajaPrevista)}</Dato>
          ) : null}
        </dl>
        {etapa.notas ? (
          <p className="text-xs text-secundario">{etapa.notas}</p>
        ) : null}
      </div>

      {etapa.hitos.length === 0 ? (
        <SinDatos>
          Esta etapa no tiene hitos. Sin hitos con criterio de éxito, cerrarla
          es una opinión.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {etapa.hitos.map((h) => (
            <li key={h.id} className="px-4 py-3">
              <Hito hito={h} slug={slug} permisos={permisos} />
            </li>
          ))}
        </ul>
      )}

      <Diario
        avances={avances}
        slug={slug}
        companyId={companyId}
        stageId={etapa.id}
        puedeEscribir={permisos.puedeEscribir}
        esIwl={permisos.esIwl}
      />

      {permisos.esIwl ? (
        <div className="flex flex-col gap-4 border-t border-filete px-4 py-3">
          <NuevoHito slug={slug} companyId={companyId} stageId={etapa.id} />
          <EditorEtapa
            slug={slug}
            etapa={{
              id: etapa.id,
              nombre: etapa.nombre,
              objetivo: etapa.objetivo,
              orden: etapa.orden,
              inicio: etapa.inicio,
              fin: etapa.fin,
              estado: etapa.estado,
              horasPrevistas: etapa.horasPrevistas,
              cajaPrevista: etapa.cajaPrevista,
              notas: etapa.notas,
            }}
          />
        </div>
      ) : null}
    </Bloque>
  );
}

function Hito({
  hito,
  slug,
  permisos,
}: {
  hito: HitoDeEtapa;
  slug: string;
  permisos: NonNullable<ResumenCompania>["permisos"];
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido =
    hito.estado !== "cumplido" && hito.fecha !== null && hito.fecha < hoy;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm text-titular">{hito.titulo}</span>
          {hito.condicionaInvertible ? (
            <Etiqueta>Condiciona invertible</Etiqueta>
          ) : null}
        </div>
        <p className="text-xs text-secundario">{hito.criterio}</p>
        {hito.evidencia ? (
          <p className="text-xs text-metadato">Evidencia: {hito.evidencia}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={cn(
            "cifra text-xs",
            vencido ? "text-mal" : "text-metadato",
          )}
        >
          {hito.estado === "cumplido" && hito.completadoEl
            ? fecha(hito.completadoEl)
            : hito.fecha
              ? fecha(hito.fecha)
              : "Sin fecha"}
        </span>
        {permisos.puedeEscribir ? (
          <EstadoHito
            slug={slug}
            id={hito.id}
            estado={hito.estado}
            puedeConfirmar={permisos.esIwl}
          />
        ) : (
          <Etiqueta>{ESTADOS_HITO[hito.estado]}</Etiqueta>
        )}
      </div>
    </div>
  );
}

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Metadato>{etiqueta}</Metadato>
      <dd className="text-sm text-cuerpo">{children}</dd>
    </div>
  );
}

/**
 * Los dos carriles.
 *
 * A la izquierda lo que hace la compañía, a la derecha lo que hace IWL, sobre
 * la misma etapa y en orden. Leídos juntos cuentan quién ha movido qué, que
 * es lo que ni un contador de horas ni una lista de hitos dicen por separado.
 *
 * En pantalla estrecha los dos carriles se apilan en una sola columna y cada
 * avance lleva su etiqueta: la distinción no puede depender de la posición.
 */
function Diario({
  avances,
  slug,
  companyId,
  stageId,
  puedeEscribir,
  esIwl,
}: {
  avances: Avance[];
  slug: string;
  companyId: string;
  stageId: string;
  puedeEscribir: boolean;
  esIwl: boolean;
}) {
  if (avances.length === 0 && !puedeEscribir) return null;

  return (
    <div className="border-t border-filete px-4 py-3">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Metadato>Avances</Metadato>
        {puedeEscribir ? (
          <NuevoAvance slug={slug} companyId={companyId} stageId={stageId} />
        ) : null}
      </div>

      {avances.length === 0 ? (
        <p className="text-xs text-secundario">
          Sin avances registrados en esta etapa todavía.
        </p>
      ) : (
        <>
          <div className="mb-2 hidden gap-4 sm:grid sm:grid-cols-2">
            <Metadato>La compañía</Metadato>
            <Metadato>IWL</Metadato>
          </div>
          <ol className="flex flex-col gap-2">
            {avances.map((a) => (
              <li key={a.id} className="grid gap-4 sm:grid-cols-2">
                <div className={a.lado === "iwl" ? "hidden sm:block" : ""}>
                  {a.lado === "compania" ? (
                    <Tarjeta avance={a} slug={slug} puedeQuitar={a.esMio || esIwl} />
                  ) : null}
                </div>
                <div className={a.lado === "compania" ? "hidden sm:block" : ""}>
                  {a.lado === "iwl" ? (
                    <Tarjeta avance={a} slug={slug} puedeQuitar={a.esMio || esIwl} />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function Tarjeta({
  avance,
  slug,
  puedeQuitar,
}: {
  avance: Avance;
  slug: string;
  puedeQuitar: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-md border border-filete bg-elevado px-3 py-2",
        avance.lado === "iwl" ? "border-l-2 border-l-acento" : "",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-titular">{avance.titulo}</span>
        <span className="cifra shrink-0 text-xs text-metadato">
          {fecha(avance.fecha)}
        </span>
      </div>

      {avance.cuerpo ? (
        <p className="mt-1 text-xs text-secundario">{avance.cuerpo}</p>
      ) : null}

      <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
        <span className="cifra text-[11px] uppercase tracking-wide text-metadato">
          {avance.lado === "iwl" ? "IWL" : "La compañía"}
          {avance.autor ? ` · ${avance.autor}` : ""}
        </span>
        {avance.enlace ? (
          <a
            href={avance.enlace}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-acento-texto underline decoration-filete underline-offset-4"
          >
            Evidencia
          </a>
        ) : null}
        {puedeQuitar ? <BorrarAvance slug={slug} id={avance.id} /> : null}
      </div>
    </article>
  );
}
