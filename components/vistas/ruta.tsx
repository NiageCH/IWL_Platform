import Link from "next/link";
import { SeguimientoTramos } from "@/components/vistas/hoja";
import { AccionesTramo, MenuHito } from "@/components/formularios/hoja-compania";
import { finDelPlazo } from "@/lib/tramos";
import { leerSeguimiento } from "@/lib/datos/hoja";
import type { ResumenCompania } from "@/lib/datos/compania";
import {
  ESTADOS_ETAPA,
  avancesDeEtapa,
  leerAvances,
  leerHojaDeRuta,
  nombreEstadoEntrada,
  leerAcompanantes,
  leerRepartoAnexo,
  leerRevisionesHitos,
  type Acompanante,
  type Avance,
  type Etapa,
  type HitoDeEtapa,
  type RepartoAnexo,
  type RevisionHito,
} from "@/lib/datos/ruta";
import { leerDocumentosElegibles, leerEvidencias } from "@/lib/datos/evidencia";
import {
  Evidencia,
  type DocumentoElegible,
  type EvidenciaAdjunta,
} from "@/components/formularios/evidencia";
import {
  EfectoEconomicoHito,
  EntregarHito,
  NotaHito,
  RevisarHito,
  RevisionDeHito,
} from "@/components/formularios/hito";
import { personaActual } from "@/lib/supabase/servidor";
import { EstadoHito } from "@/components/formularios/programa";
import { BorrarAvance, NuevaEtapa, NuevoAvance } from "@/components/formularios/ruta";
import {
  Bloque,
  Cifra,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { Estado, LeyendaEstados } from "@/components/ui/estado";
import { BarraHitos, LineaRecorrido } from "@/components/linea-recorrido";
import { estadoVisual } from "@/lib/estados";
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
  entregado: "Entregado",
  cumplido: "Cumplido",
  retrasado: "Retrasado",
};

export async function VistaRuta({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { compania, permisos } = resumen;
  const persona = await personaActual();
  const [ruta, avances, evidencias, elegibles, revisiones, acompanantes, reparto, seguimiento] = await Promise.all([
    leerHojaDeRuta(compania.id, compania.entry_state),
    leerAvances(compania.id, persona?.id ?? null),
    leerEvidencias(compania.id, "milestone"),
    permisos.esFundadora ? leerDocumentosElegibles(compania.id) : Promise.resolve([]),
    leerRevisionesHitos(compania.id),
    permisos.coordina ? leerAcompanantes(compania.id) : Promise.resolve([]),
    leerRepartoAnexo(compania.id),
    leerSeguimiento(compania.id),
  ]);
  const contexto: ContextoHitos = {
    companyId: compania.id,
    evidencias,
    elegibles,
    revisiones,
    acompanantes,
    reparto,
    firmado: Boolean(seguimiento.firma),
    finPlazo:
      seguimiento.estadio && (seguimiento.firma ?? seguimiento.tramos[0]?.inicio)
        ? finDelPlazo((seguimiento.firma ?? seguimiento.tramos[0]?.inicio)!, seguimiento.estadio)
        : null,
  };

  if (ruta.etapas.length === 0) {

    return (
      <div className="flex flex-col gap-6">
        <Bloque>
          <TituloBloque>Hoja de ruta</TituloBloque>
          <SinDatos>
            {permisos.esIwl ? (
              <>
                Este proyecto todavía no tiene hoja de ruta. Se prepara con el Anexo, desde la lista de lo que ya tiene:{" "}
                <Link href={`/cartera/${compania.slug}/programa#asistente-hoja`} className="enlace text-acento-texto">
                  Preparar la hoja de ruta, en Programa y Anexo
                </Link>
                .
              </>
            ) : (
              "IWL todavía no ha preparado la hoja de ruta de este proyecto. Se prepara con la propuesta de Acuerdo, desde lo que ya tenéis, y la verás con el Anexo."
            )}
          </SinDatos>
        </Bloque>


        {ruta.sueltos.length > 0 ? (
          <Bloque>
            <TituloBloque>Hitos ya acordados</TituloBloque>
            <ul className="divide-y divide-filete">
              {ruta.sueltos.map((h) => (
                <li key={h.id} className="px-4 py-3">
                  <Hito hito={h} slug={compania.slug} permisos={permisos} contexto={contexto} />
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
      <SeguimientoTramos seguimiento={seguimiento} hoy={new Date().toISOString().slice(0, 10)} />
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
            etiqueta={ruta.etapaAbierta ? "Tramo en curso" : "Tramo que toca"}
            nota={
              !ruta.etapaActual
                ? "Ningún tramo abierto ni en plazo"
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
            referencia={
              ruta.horasPrevistas > 0
                ? `de ${numero(ruta.horasPrevistas)} h`
                : undefined
            }
            nota={
              ruta.horasPrevistas > 0
                ? "previstas en el plan"
                : "sin previsión por tramo"
            }
          />
          <Cifra
            valor={`${ruta.etapas.filter((e) => e.estado === "completada").length} / ${ruta.etapas.length}`}
            etiqueta="Tramos cerrados"
          />
        </div>

        {/*
          El plan entero en una línea.

          Seis tarjetas de media pantalla cada una no contestan «¿por dónde
          vamos?» sin leérselas las seis. Aquí se ve de un vistazo, con el
          tramo en el que se está marcado, y cada punto baja a su tarjeta.
        */}
        <div className="border-t border-filete">
          <LineaRecorrido
            etapas={ruta.etapas}
            etapaActualId={ruta.etapaActual?.id ?? null}
          />
        </div>

        <div className="border-t border-filete px-4 py-4">
          <BarraHitos etapas={ruta.etapas} sueltos={ruta.sueltos} />
        </div>
      </Bloque>

      <ol className="flex flex-col gap-4">
        {ruta.etapas.map((etapa) => (
          <li key={etapa.id}>
            <TarjetaEtapa
              etapa={etapa}
              etapas={ruta.etapas.map((e) => ({ id: e.id, nombre: e.nombre }))}
              avances={avancesDeEtapa(avances, etapa.id)}
              slug={compania.slug}
              companyId={compania.id}
              permisos={permisos}
              contexto={contexto}
              // Y la que tiene algo entregado: el aviso lleva a ese hito, y plegado no se ve
              abierta={etapa.id === ruta.etapaActual?.id || etapa.hitos.some((h) => h.estado === "entregado")}
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
                <Hito
                  hito={h}
                  slug={compania.slug}
                  permisos={permisos}
                  contexto={contexto}
                  stageId={null}
                  etapas={ruta.etapas.map((e) => ({
                    id: e.id,
                    nombre: e.nombre,
                  }))}
                />
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      <LeyendaEstados />
    </div>
  );
}

/**
 * Un tramo del plan.
 *
 * Solo se abre el que está en curso. Los demás se pliegan en una línea con
 * su estado y sus cifras: con seis tramos abiertos había que bajar tres
 * pantallas para llegar al que se está trabajando, que es el único sobre
 * el que se puede hacer algo hoy. Los cerrados siguen a un clic, que
 * consultarlos es legítimo —solo que no es lo que se viene a hacer—.
 */
function TarjetaEtapa({
  etapa,
  etapas,
  avances,
  slug,
  companyId,
  permisos,
  contexto,
  abierta,
}: {
  etapa: Etapa;
  /** Todas, para poder mover un hito de carril */
  etapas: Array<{ id: string; nombre: string }>;
  avances: Avance[];
  slug: string;
  companyId: string;
  permisos: NonNullable<ResumenCompania>["permisos"];
  contexto: ContextoHitos;
  /** El tramo en el que está el proyecto se abre solo */
  abierta: boolean;
}) {
  const cumplidos = etapa.hitos.filter((h) => h.estado === "cumplido").length;
  const estado = estadoVisual("etapa", { estado: etapa.estado, fin: etapa.fin });

  /*
   * La tarjeta del tramo con el patrón de Administración (REVISION, 23
   * nov): la cabecera siempre a la vista, con su estado, sus cifras en
   * chips y, para IWL, «Añadir hito» y el menú del tramo. Lo de dentro
   * —objetivo, hitos y diario— se pliega salvo en el tramo en curso.
   */
  return (
    <Bloque
      id={`etapa-${etapa.id}`}
      className={cn("scroll-mt-24 border-l-2 filete-estado", `es-${estado}`)}
    >
      <header className="titulo-bloque flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-titular">
          {etapa.tramo ? `Tramo ${etapa.tramo} · ${etapa.nombre}` : `${etapa.orden + 1}. ${etapa.nombre}`}
        </h2>
        <Estado
          valor={estado}
          rotulo={ESTADOS_ETAPA[etapa.estado]}
          motivo={etapa.fin ? `Cierra el ${fecha(etapa.fin)}` : undefined}
        />
        <span className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <span className="pastilla">
            {etapa.hitos.length === 0 ? "Sin hitos" : `${cumplidos} de ${etapa.hitos.length} hitos`}
          </span>
          <span className="pastilla">
            {etapa.horasPrevistas === null
              ? `${numero(etapa.horasImputadas)} h`
              : `${numero(etapa.horasImputadas)} de ${numero(etapa.horasPrevistas)} h`}
          </span>
          <span className="pastilla cifra">
            {etapa.inicio && etapa.fin ? `${fecha(etapa.inicio)} → ${fecha(etapa.fin)}` : "Sin fechas"}
          </span>
          {permisos.esIwl ? (
            <AccionesTramo
              slug={slug}
              companyId={companyId}
              esDireccion={permisos.esAdmin}
              etapa={{
                id: etapa.id,
                tramo: etapa.tramo,
                nombre: etapa.nombre,
                objetivo: etapa.objetivo,
                orden: etapa.orden,
                inicio: etapa.inicio,
                fin: etapa.fin,
                estado: etapa.estado,
                horasPrevistas: etapa.horasPrevistas,
                cajaPrevista: etapa.cajaPrevista,
                notas: etapa.notas,
                hitos: etapa.hitos.length,
              }}
            />
          ) : null}
        </span>
      </header>

      <details open={abierta}>
        <summary className="desplegable-titulo cursor-pointer border-t border-filete px-4 py-2.5 text-sm">
          <span className="accion">{abierta ? "Hitos y diario del tramo" : "Ver los hitos y el diario"}</span>
        </summary>

        <div className="flex flex-col gap-2 border-y border-filete px-4 py-3">
          <p className="text-sm text-cuerpo">{etapa.objetivo}</p>
          {etapa.cajaPrevista || etapa.horasPct !== null ? (
            <p className="text-xs text-secundario">
              {[
                etapa.horasPct !== null ? `Horas de IWL al ${etapa.horasPct} %` : null,
                etapa.cajaPrevista ? `Caja prevista ${euros(etapa.cajaPrevista)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {etapa.notas ? <p className="text-xs text-secundario">{etapa.notas}</p> : null}
        </div>

        {etapa.hitos.length === 0 ? (
          <SinDatos>
            {permisos.esIwl
              ? "Este tramo no tiene hitos. Pulsa «Añadir hito»: sin hitos con criterio de éxito, cerrarlo es una opinión."
              : "Este tramo no tiene hitos todavía."}
          </SinDatos>
        ) : (
          <ol className="divide-y divide-filete">
            {etapa.hitos.map((h, i) => (
              <li key={h.id} className="px-4 py-3" data-fila-hito={h.titulo}>
                <Hito
                  hito={h}
                  orden={i + 1}
                  slug={slug}
                  permisos={permisos}
                  contexto={contexto}
                  stageId={etapa.id}
                  etapas={etapas}
                />
              </li>
            ))}
          </ol>
        )}

        <Diario
          avances={avances}
          slug={slug}
          companyId={companyId}
          stageId={etapa.id}
          puedeEscribir={permisos.puedeEscribir}
          esIwl={permisos.esIwl}
        />
      </details>
    </Bloque>
  );
}

/**
 * Lo que un hito necesita además de su fila: su evidencia, su historial,
 * quién puede revisarlo y cuánto queda por repartir del Anexo. Se lee una
 * vez por pantalla y no una por hito.
 */
export interface ContextoHitos {
  companyId: string;
  evidencias: Map<string, EvidenciaAdjunta[]>;
  elegibles: DocumentoElegible[];
  revisiones: Map<string, RevisionHito[]>;
  acompanantes: Acompanante[];
  reparto: RepartoAnexo;
  /** Con el Acuerdo firmado, cambiar un hito fundamental pide dirección y motivo */
  firmado: boolean;
  /** El último día del plazo del programa, para avisar antes de guardar */
  finPlazo: string | null;
}

const TEXTO_REVISION: Record<RevisionHito["tipo"], string> = {
  entrega: "Entregado",
  validacion: "Validado",
  cambios: "Cambios pedidos",
  nota: "Nota",
};

function Hito({
  hito,
  orden,
  slug,
  permisos,
  contexto,
  stageId = null,
  etapas = [],
}: {
  hito: HitoDeEtapa;
  /** Su número en el tramo; fuera de un tramo no lleva */
  orden?: number;
  slug: string;
  permisos: NonNullable<ResumenCompania>["permisos"];
  contexto: ContextoHitos;
  /** La etapa en la que está ahora, para poder moverlo a otra */
  stageId?: string | null;
  etapas?: Array<{ id: string; nombre: string }>;
}) {
  const economico = hito.equityPct !== null || hito.financiacion !== null;
  const revisa =
    hito.estado === "entregado" &&
    (permisos.coordina || (hito.revisorId !== null && hito.revisorId === permisos.personaId));
  const visual = estadoVisual("hito", {
    estado: hito.estado,
    fecha: hito.fecha,
    entregadoEl: hito.entregadoEl,
    revisa,
  });
  const vencido = visual === "vencido";
  const evidencias = contexto.evidencias.get(hito.id) ?? [];
  const historial = contexto.revisiones.get(hito.id) ?? [];
  const ultimaValidacion = [...historial].reverse().find((r) => r.tipo === "validacion");
  const cambiosPendientes =
    hito.estado !== "entregado" && hito.estado !== "cumplido"
      ? [...historial].reverse().find((r) => r.tipo === "cambios" || r.tipo === "entrega")
      : undefined;
  const abierto = hito.estado !== "entregado" && hito.estado !== "cumplido";
  // Entrega ella; la evidencia la toca mientras el hito está abierto
  const entrega = permisos.esFundadora && abierto;
  const efecto = [
    hito.financiacion !== null ? `Libera ${euros(hito.financiacion)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const rotulo =
    hito.estado === "entregado" ? "Entregado · por revisar" : ESTADOS_HITO[hito.estado] ?? hito.estado;
  // El selector de estado: no para lo entregado, que se revisa, ni para lo cumplido de ella
  const conSelector =
    hito.estado !== "entregado" &&
    (permisos.coordina || (permisos.puedeEscribir && hito.estado !== "cumplido"));
  // El historial y los ajustes, en el panel del menú ⋯ (REVISION, 23 nov)
  const hayAjustes = historial.length > 0 || permisos.coordina || permisos.acompana || permisos.esAdmin;
  const ajustes = hayAjustes
    ? {
        texto: historial.length > 0 ? (permisos.coordina || permisos.acompana || permisos.esAdmin ? "Historial y ajustes" : "Historial") : "Ajustes del hito",
        contenido: (
          <>
            {historial.length > 0 ? (
              <ol className="flex flex-col gap-2">
                {historial.map((r) => (
                  <li key={r.id} className="border-l-2 border-l-filete pl-3">
                    <p className="text-metadato">
                      {TEXTO_REVISION[r.tipo]} el {fecha(r.cuando)}
                      {/* Ella ve lo que le dicen; quién lo validó, IWL */}
                      {r.autor && (!permisos.esFundadora || r.tipo === "entrega") ? ` · ${r.autor}` : ""}
                    </p>
                    {r.comentario ? <p className="whitespace-pre-line text-cuerpo">{r.comentario}</p> : null}
                    {r.tipo === "entrega" && r.evidencias.length > 0 ? (
                      <p className="text-metadato">
                        Con: {r.evidencias.map((e) => e.label).join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {permisos.acompana || (permisos.coordina && !revisa) ? <NotaHito slug={slug} id={hito.id} /> : null}

            {permisos.coordina && hito.estado !== "cumplido" ? (
              <RevisionDeHito
                slug={slug}
                id={hito.id}
                requiere={hito.requiereValidacion}
                obligatoria={economico || hito.condicionaInvertible}
                revisorId={hito.revisorId}
                acompanantes={contexto.acompanantes}
              />
            ) : null}

            {permisos.esAdmin && hito.estado !== "cumplido" ? (
              contexto.reparto.abierto ? (
                <EfectoEconomicoHito
                  slug={slug}
                  id={hito.id}
                  financiacion={hito.financiacion}
                  financiacionPactada={contexto.reparto.financiacionPactada}
                  financiacionLibre={libre(
                    contexto.reparto.financiacionPactada,
                    contexto.reparto.financiacionRepartida,
                    hito.financiacion,
                  )}
                />
              ) : (
                <p className="text-metadato">
                  {contexto.reparto.hayAnexo
                    ? "El equity y la financiación de los hitos quedan fijos con el Anexo propuesto o firmado. Para cambiarlos, abre una versión nueva del Anexo."
                    : "Para marcar un hito con equity o financiación, abre antes el Anexo de Programa."}
                </p>
              )
            ) : null}
          </>
        ),
      }
    : undefined;
  // Ajustar el hito —su fecha, quitarlo—: quien coordina, mientras no esté cumplido
  const ajusta =
    permisos.coordina &&
    stageId !== null &&
    hito.estado !== "cumplido" &&
    (!hito.fundamental || !contexto.firmado || permisos.esAdmin);

  return (
    <div id={`hito-${hito.id}`} className="flex scroll-mt-24 flex-col gap-3">
      {/*
        La fila, como las de Administración (REVISION, 23 nov): número,
        título en negrita, el criterio en gris si no repite el título, sus
        chips, y a la derecha la fecha, el estado y el menú ⋯. Cambiar la
        fecha, moverlo y quitarlo van en el menú y se hacen en el panel.
      */}
      <div className="flex items-start gap-3">
        {orden ? (
          <span className="cifra w-6 shrink-0 pt-0.5 text-right text-sm text-metadato">{orden}</span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-semibold text-titular">{hito.titulo}</p>
            {hito.criterio.trim() !== hito.titulo.trim() ? (
              <p className="text-xs text-secundario">{hito.criterio}</p>
            ) : null}
            {hito.evidencia ? <p className="text-xs text-metadato">Se espera: {hito.evidencia}</p> : null}
            {hito.condicionaInvertible || hito.financiacion !== null || !hito.requiereValidacion ? (
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {hito.condicionaInvertible ? <span className="pastilla">Condiciona invertible</span> : null}
                {hito.financiacion !== null ? <span className="pastilla">Libera {euros(hito.financiacion)}</span> : null}
                {!hito.requiereValidacion ? <span className="pastilla">Sin validación</span> : null}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <span className={cn("cifra text-xs", vencido ? "es-vencido texto-estado" : "text-metadato")}>
              {hito.estado === "cumplido" && hito.completadoEl
                ? fecha(hito.completadoEl)
                : hito.estado === "entregado" && hito.entregadoEl
                  ? `Entregado el ${fecha(hito.entregadoEl)}`
                  : hito.fecha
                    ? fecha(hito.fecha)
                    : "Sin fecha"}
            </span>
            {/*
              El estado se ve siempre, se pueda tocar o no. Con el control
              delante va solo el icono, que si no la fila dice «Cumplido» dos
              veces.
            */}
            {conSelector ? (
              <>
                <Estado valor={visual} soloIcono />
                <EstadoHito
                  slug={slug}
                  id={hito.id}
                  estado={hito.estado}
                  visual={visual}
                  // Con efecto económico, cumplido solo por «Validar»
                  puedeConfirmar={permisos.coordina && !economico}
                />
              </>
            ) : (
              <Estado valor={visual} rotulo={rotulo} />
            )}
            {/*
              Tras la firma, uno fundamental solo lo toca dirección, con
              motivo (REVISION, 23 nov); la base lo exige igual.
            */}
            <MenuHito
              slug={slug}
              hito={{ id: hito.id, titulo: hito.titulo, fecha: hito.fecha, fundamental: hito.fundamental }}
              fecha={
                ajusta
                  ? {
                      finPlazo: contexto.finPlazo,
                      esDireccion: permisos.esAdmin,
                      pideMotivo: hito.fundamental && contexto.firmado,
                    }
                  : undefined
              }
              mover={permisos.esIwl ? { stageId, etapas } : undefined}
              quitar={ajusta && (!hito.fundamental || permisos.esAdmin)}
              ajustes={ajustes}
            />
          </div>
        </div>
      </div>

      {/* Lo último que dijo quien revisa, cuando ella tiene que volver a entregar */}
      {cambiosPendientes?.tipo === "cambios" ? (
        <div className="rounded-md border-l-2 border-l-filete-fuerte bg-hundido px-3 py-2 text-xs">
          <p className="text-metadato">
            Cambios pedidos el {fecha(cambiosPendientes.cuando)}
            {permisos.esFundadora ? "" : cambiosPendientes.autor ? ` por ${cambiosPendientes.autor}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-line text-cuerpo">{cambiosPendientes.comentario}</p>
        </div>
      ) : null}

      {/* La evidencia: la ve todo el que ve el hito; la toca ella mientras está abierto */}
      {evidencias.length > 0 && !entrega ? (
        <Evidencia
          slug={slug}
          companyId={contexto.companyId}
          entidad="milestone"
          entidadId={hito.id}
          adjuntas={evidencias}
          puedeEscribir={false}
        />
      ) : null}

      {entrega ? (
        <EntregarHito
          slug={slug}
          id={hito.id}
          titulo={hito.titulo}
          requiereValidacion={hito.requiereValidacion}
          hayEvidencia={evidencias.length > 0}
          evidencia={
            <Evidencia
              slug={slug}
              companyId={contexto.companyId}
              entidad="milestone"
              entidadId={hito.id}
              adjuntas={evidencias}
              elegibles={contexto.elegibles}
              puedeEscribir
            />
          }
        />
      ) : null}

      {revisa ? <RevisarHito slug={slug} id={hito.id} titulo={hito.titulo} efecto={efecto || null} /> : null}

      {/* Quién validó y cuándo: lo ve IWL */}
      {hito.estado === "cumplido" && permisos.esIwl ? (
        <p className="text-xs text-metadato">
          {ultimaValidacion
            ? `Validado por ${ultimaValidacion.autor ?? "alguien"} el ${fecha(ultimaValidacion.cuando)}`
            : hito.requiereValidacion
              ? `Confirmado el ${fecha(hito.confirmadoEl ?? hito.completadoEl)}`
              : "Cumplido al entregarlo, sin validación"}
        </p>
      ) : null}

    </div>
  );
}

/** Lo que queda por repartir sin contar lo que ya tiene este hito, en céntimos para no arrastrar decimales */
function libre(pactado: number | null, repartido: number, propio: number | null): number {
  if (pactado === null) return 0;
  return Math.max(0, Math.round((pactado - repartido + (propio ?? 0)) * 100) / 100);
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
            className="accion text-xs text-acento-texto"
          >
            Evidencia
          </a>
        ) : null}
        {puedeQuitar ? <BorrarAvance slug={slug} id={avance.id} /> : null}
      </div>
    </article>
  );
}
