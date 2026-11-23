import Link from "next/link";
import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import {
  ContestarHito,
  FechaHito,
  GenerarHoja,
  QuitarHito,
  RehacerHoja,
  VerificarHito,
} from "@/components/formularios/lista-entrada";
import { NuevoHito } from "@/components/formularios/ruta";
import { resumenLista, type ItemLista, type ListaEntrada, type Seguimiento } from "@/lib/datos/hoja";
import type { EstadoVisual } from "@/lib/estados";
import {
  TRAMOS,
  dondeEstamos,
  finDelPlazo,
  plazo,
  plazoMaximoMeses,
  retrasoTramo,
  textoPlazo,
  tramoDeEntrada,
  type NumeroTramo,
} from "@/lib/tramos";
import { fecha } from "@/lib/utils";

/*
 * La hoja de ruta en cuatro tramos (REVISION, 22 y 23 nov · bloque 5): la
 * lista de entrada, el asistente para prepararla y el seguimiento.
 *
 * Estructura y recorrido, no aspecto: lo visual sigue en pausa y se
 * repintará cuando se retome. Todo va con las piezas de siempre.
 */

function estadoItem(i: ItemLista): { valor: EstadoVisual; rotulo: string } {
  if (i.verificacion === "verificado") return { valor: "hecho", rotulo: "Verificado" };
  if (i.verificacion === "no_basta") return { valor: "atencion", rotulo: "No basta" };
  if (i.respuesta === "si") return { valor: "curso", rotulo: "Por verificar" };
  if (i.respuesta === "no") return { valor: "no_aplica", rotulo: "Todavía no" };
  return { valor: "pendiente", rotulo: "Sin contestar" };
}

/**
 * La lista de entrada: «Diagnóstico» en idea, «Lo que ya tenéis» en el
 * resto. Ella contesta; quien coordina verifica cada «ya lo tenemos».
 * Con la hoja de ruta hecha, queda como estaba, para leer.
 */
export function ListaDeEntrada({
  lista,
  companyId,
  slug,
  contesta,
  verifica,
}: {
  lista: ListaEntrada;
  companyId: string;
  slug: string;
  /** Ella, mientras no hay hoja de ruta */
  contesta: boolean;
  /** Quien coordina: dirección, el equipo o el mentor principal */
  verifica: boolean;
}) {
  const r = resumenLista(lista.items);
  const tramos = [...new Set(lista.items.map((i) => i.tramo))];
  const abierta = !lista.hayHoja;
  return (
    <Bloque id="lista-entrada" className="mb-8 scroll-mt-48">
      <TituloBloque
        accion={
          <Metadato>
            {r.verificados} verificados · {r.porVerificar} por verificar
            {r.sinContestar ? ` · ${r.sinContestar} sin contestar` : ""}
          </Metadato>
        }
      >
        {lista.nombre}
      </TituloBloque>
      <p className="border-b border-filete px-5 py-3 text-sm text-secundario">
        {lista.estadio === "idea"
          ? "Los hitos del primer tramo, de la idea al MVP. Di cuáles tenéis ya, con su archivo, y cuáles todavía no."
          : `Los hitos fundamentales de los tramos anteriores al vuestro: entrar en un estadio no los da por hechos. Di cuáles tenéis ya, con su archivo, y cuáles todavía no.`}{" "}
        Lo que el mentor verifique entra en la hoja de ruta como cumplido; lo demás, como pendiente.
        {lista.hayHoja ? " La hoja de ruta ya está hecha: esto queda como estaba." : ""}
      </p>
      {tramos.map((t) => (
        <div key={t} className="border-b border-filete last:border-b-0">
          <p className="px-5 pt-3 text-xs text-metadato">
            Tramo {t} · {TRAMOS[t].nombre}
          </p>
          <ul className="divide-y divide-filete">
            {lista.items
              .filter((i) => i.tramo === t)
              .map((i) => {
                const e = estadoItem(i);
                return (
                  <li key={i.hitoId} className="flex flex-col gap-2 px-5 py-3" data-hito={i.titulo}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm text-titular">{i.titulo}</span>
                      <Estado valor={e.valor} rotulo={e.rotulo} />
                    </div>
                    {i.evidencia ? (
                      <p className="text-xs text-secundario">
                        Archivo:{" "}
                        {i.evidencia.url ? (
                          <a href={i.evidencia.url} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
                            {i.evidencia.nombre}
                          </a>
                        ) : (
                          i.evidencia.nombre
                        )}
                      </p>
                    ) : null}
                    {i.verificacion === "no_basta" && i.comentario ? (
                      <p className="text-xs text-cuerpo">No basta: {i.comentario}</p>
                    ) : null}
                    {i.verificacion && i.verificadoPor && verifica ? (
                      <p className="text-xs text-metadato">
                        {i.verificacion === "verificado" ? "Verificado" : "Revisado"} por {i.verificadoPor}
                      </p>
                    ) : null}
                    {contesta && abierta && i.verificacion !== "verificado" ? (
                      <ContestarHito
                        companyId={companyId}
                        hitoId={i.hitoId}
                        respuesta={i.respuesta}
                        actual={i.evidencia ? { ruta: i.evidencia.ruta, nombre: i.evidencia.nombre } : null}
                      />
                    ) : null}
                    {verifica && abierta && i.checkId && i.respuesta === "si" && !i.verificacion ? (
                      <VerificarHito checkId={i.checkId} slug={slug} />
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </Bloque>
  );
}

const PASOS = ["Punto de partida", "Ajustar", "Revisar y proponer"] as const;

/** Hasta qué paso se puede llegar, y en cuál se está si nadie pide otro */
export function pasosDelAsistente({
  hay,
  anexoEnBorrador,
  porVerificar,
}: {
  hay: boolean;
  anexoEnBorrador: boolean;
  porVerificar: number;
}): { porDefecto: 1 | 2 | 3; maximo: 1 | 2 | 3 } {
  if (!hay) return { porDefecto: 1, maximo: 1 };
  if (!anexoEnBorrador) return { porDefecto: 3, maximo: 3 };
  return { porDefecto: 2, maximo: porVerificar ? 2 : 3 };
}

/**
 * El asistente para preparar la hoja de ruta, con el Anexo en borrador:
 * punto de partida, ajustar y proponer. Solo se ve el paso en el que se
 * está (REVISION, 23 nov); los anteriores quedan en una línea con su
 * botón para volver. El paso va en la dirección (`?paso=`), así que
 * volver atrás no borra nada.
 */
export function AsistenteHoja({
  lista,
  seguimiento,
  companyId,
  slug,
  hoy,
  anexoEnBorrador,
  paso: pasoPedido,
  esDireccion,
}: {
  lista: ListaEntrada;
  seguimiento: Seguimiento;
  companyId: string;
  slug: string;
  hoy: string;
  anexoEnBorrador: boolean;
  /** El que viene en la dirección, si viene */
  paso?: number;
  esDireccion: boolean;
}) {
  const r = resumenLista(lista.items);
  const entrada = tramoDeEntrada(lista.estadio);
  const hay = seguimiento.tramos.length > 0;
  const { porDefecto, maximo } = pasosDelAsistente({ hay, anexoEnBorrador, porVerificar: r.porVerificar });
  const paso = pasoPedido && pasoPedido >= 1 && pasoPedido <= maximo ? pasoPedido : porDefecto;
  const aqui = `/cartera/${slug}/programa`;
  const irA = (n: number) => `${aqui}?paso=${n}#asistente-hoja`;
  const cumplidos = seguimiento.tramos.flatMap((t) => t.hitos).filter((h) => h.alEntrar).length;

  // Lo que dice cada paso cuando ya se ha pasado por él
  const resumenes = [
    `Tramo ${entrada}, ${plazoMaximoMeses(lista.estadio)} meses de plazo. ${lista.nombre}: ${r.verificados} verificados${
      r.porVerificar ? `, ${r.porVerificar} por verificar` : ""
    }.`,
    hay ? `${seguimiento.tramos.length} tramos, ${seguimiento.tramos.flatMap((t) => t.hitos).length} hitos, ${cumplidos} cumplidos al entrar.` : "",
  ];

  return (
    <Bloque id="asistente-hoja" className="mb-8 scroll-mt-48" elevacion={2}>
      <TituloBloque accion={<Metadato>Paso {paso} de 3</Metadato>}>Preparar la hoja de ruta</TituloBloque>

      <ol className="flex flex-col divide-y divide-filete">
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          if (n < paso) {
            return (
              <li key={nombre} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="mr-2 inline-flex">
                    <Estado valor="hecho" soloIcono />
                  </span>
                  <span className="font-medium text-titular">
                    {n}. {nombre}
                  </span>
                  <span className="text-secundario"> · {resumenes[i]}</span>
                </span>
                <Link href={irA(n)} className="accion text-xs">
                  Volver
                </Link>
              </li>
            );
          }
          if (n > paso) {
            return (
              <li key={nombre} className="px-5 py-2.5 text-sm text-metadato">
                {n}. {nombre}
              </li>
            );
          }
          return (
            <li key={nombre} className="flex flex-col gap-3 px-5 py-4 text-sm" aria-current="step">
              <h3 className="font-semibold text-titular">
                {n}. {nombre}
              </h3>
              {n === 1 ? (
                <PasoPartida
                  lista={lista}
                  hay={hay}
                  companyId={companyId}
                  slug={slug}
                  hoy={hoy}
                  anexoEnBorrador={anexoEnBorrador}
                  siguiente={irA(2)}
                />
              ) : n === 2 ? (
                <PasoAjustar
                  lista={lista}
                  seguimiento={seguimiento}
                  companyId={companyId}
                  slug={slug}
                  esDireccion={esDireccion}
                  porVerificar={r.porVerificar}
                  siguiente={irA(3)}
                />
              ) : (
                <p className="text-cuerpo">
                  {anexoEnBorrador
                    ? "La hoja de ruta va en la propuesta de Acuerdo, en su sección I. Repasa las cifras del Anexo aquí debajo y, cuando esté a punto, proponle el Acuerdo: la verá con su hoja de ruta y la aceptará con él."
                    : "Ya va en la propuesta de Acuerdo. Al firmar, las fechas se corren a la de la firma y lo firmado queda congelado en la versión del Anexo."}{" "}
                  <a href="#anexo" className="enlace text-acento-texto">
                    Ir al Anexo
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </Bloque>
  );
}

function PasoPartida({
  lista,
  hay,
  companyId,
  slug,
  hoy,
  anexoEnBorrador,
  siguiente,
}: {
  lista: ListaEntrada;
  hay: boolean;
  companyId: string;
  slug: string;
  hoy: string;
  anexoEnBorrador: boolean;
  siguiente: string;
}) {
  const r = resumenLista(lista.items);
  const entrada = tramoDeEntrada(lista.estadio);
  return (
    <>
      <p className="text-cuerpo">
        Entra en el <strong>tramo {entrada}</strong>, {TRAMOS[entrada].nombre.toLowerCase()}, con un plazo máximo de{" "}
        <strong>{plazoMaximoMeses(lista.estadio)} meses</strong> desde la firma.
      </p>
      <p className="text-secundario">
        {lista.nombre}: {r.verificados} verificados, {r.noBasta} «no basta», {r.todaviaNo} «todavía no»
        {r.porVerificar ? `, ${r.porVerificar} por verificar` : ""}
        {r.sinContestar ? `, ${r.sinContestar} sin contestar` : ""}. Lo verificado entra como cumplido; lo demás, como
        pendiente.
      </p>
      {hay ? (
        <>
          <p className="text-cuerpo">La hoja de ruta ya está generada.</p>
          <div className="flex flex-wrap items-start gap-3">
            <Link href={siguiente} className="boton-marca px-4 py-2 text-xs">
              Seguir: ajustar
            </Link>
          </div>
          {anexoEnBorrador ? <RehacerHoja companyId={companyId} slug={slug} /> : null}
        </>
      ) : (
        <>
          {r.sinContestar + r.porVerificar ? (
            <p className="text-cuerpo" role="status">
              Conviene que la lista esté contestada y verificada antes: lo que quede sin verificar entra como pendiente.
            </p>
          ) : null}
          <GenerarHoja companyId={companyId} slug={slug} hoy={hoy} />
        </>
      )}
    </>
  );
}

/**
 * Ajustar, aquí mismo (REVISION, 23 nov): mover la fecha de un hito,
 * añadir uno propio y quitar uno —un fundamental solo dirección, con
 * motivo—. Con las mismas piezas que la pestaña Hoja de ruta.
 */
function PasoAjustar({
  lista,
  seguimiento,
  companyId,
  slug,
  esDireccion,
  porVerificar,
  siguiente,
}: {
  lista: ListaEntrada;
  seguimiento: Seguimiento;
  companyId: string;
  slug: string;
  esDireccion: boolean;
  porVerificar: number;
  siguiente: string;
}) {
  const entrada = tramoDeEntrada(lista.estadio);
  // Antes de firmar, el plazo cuenta desde la fecha prevista: el inicio del primer tramo
  const desde = seguimiento.firma ?? seguimiento.tramos[0]?.inicio ?? null;
  const fin = desde ? finDelPlazo(desde, lista.estadio) : null;
  return (
    <>
      <p className="text-secundario">
        Mueve las fechas, añade los hitos propios de esta compañía y quita lo que no aplique.
        {fin ? ` Todo dentro del plazo del programa, que acaba el ${fecha(fin)}.` : ""}
      </p>
      <div className="flex flex-col gap-5">
        {seguimiento.tramos.map((t) => {
          const alEntrar = t.hitos.filter((h) => h.alEntrar);
          // Primero los que vienen de tramos anteriores, con su etiqueta; luego los del tramo
          const pendientes = t.hitos
            .filter((h) => !h.alEntrar)
            .sort((a, b) => (a.deTramo ?? 9) - (b.deTramo ?? 9));
          return (
            <section key={t.id} className="rounded-md border border-filete" aria-label={`Tramo ${t.tramo}`}>
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-filete px-4 py-2.5">
                <span className="font-medium text-titular">
                  Tramo {t.tramo} · {t.nombre}
                </span>
                <span className="cifra text-xs text-metadato">
                  {t.inicio ? fecha(t.inicio) : "—"} a {t.fin ? fecha(t.fin) : "—"}
                </span>
              </header>
              {t.tramo === entrada && alEntrar.length ? (
                <details className="border-b border-filete px-4 py-2.5">
                  <summary className="cursor-pointer text-secundario">
                    {alEntrar.length === 1 ? "1 hito ya cumplido al entrar" : `${alEntrar.length} hitos ya cumplidos al entrar`}
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-cuerpo">
                    {alEntrar.map((h) => (
                      <li key={h.id} className="flex flex-wrap gap-x-2">
                        <span>✓ {h.titulo}</span>
                        {h.deTramo ? <span className="text-metadato">del tramo {h.deTramo}</span> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <ul className="divide-y divide-filete">
                {pendientes.map((h) => (
                  <li
                    key={h.id}
                    data-hito={h.titulo}
                    className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-titular">{h.titulo}</span>
                      <span className="flex flex-wrap gap-x-2 text-xs text-metadato">
                        {h.deTramo ? <span>Pendiente del tramo {h.deTramo}</span> : null}
                        {h.fundamental ? <span>Fundamental</span> : <span>Propio</span>}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <FechaHito id={h.id} slug={slug} actual={h.fecha} finPlazo={fin} esDireccion={esDireccion} />
                      {!h.fundamental || esDireccion ? (
                        <QuitarHito id={h.id} slug={slug} fundamental={h.fundamental} />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-filete px-4 py-2.5">
                <NuevoHito slug={slug} companyId={companyId} stageId={t.id} />
              </div>
            </section>
          );
        })}
      </div>
      {porVerificar ? (
        <p className="es-atencion texto-estado" role="status">
          Faltan {porVerificar} por verificar en {lista.nombre === "Diagnóstico" ? "el diagnóstico" : "«Lo que ya tenéis»"}: sin eso no se puede
          proponer.{" "}
          <Link href={`/cartera/${slug}#lista-entrada`} className="enlace">
            Ir a la lista
          </Link>
        </p>
      ) : (
        <div>
          <Link href={siguiente} className="boton-marca inline-block px-4 py-2 text-xs">
            Seguir: revisar y proponer
          </Link>
        </div>
      )}
    </>
  );
}

/** Los tramos con sus hitos, en corto: para el asistente y la sección I del Anexo */
export function ResumenTramos({ seguimiento }: { seguimiento: Seguimiento }) {
  if (!seguimiento.tramos.length) return <SinDatos>Todavía no hay hoja de ruta.</SinDatos>;
  return (
    <div className="flex flex-col gap-3">
      {seguimiento.tramos.map((t) => (
        <div key={t.id}>
          <p className="text-sm font-medium text-titular">
            Tramo {t.tramo} · {t.nombre}
            <span className="text-xs text-metadato">
              {" "}
              · {t.inicio ? fecha(t.inicio) : "—"} a {t.fin ? fecha(t.fin) : "—"}
            </span>
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-xs text-cuerpo">
            {t.hitos.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2">
                <span>
                  {h.estado === "cumplido" ? "✓ " : "· "}
                  {h.titulo}
                </span>
                {h.deTramo ? <span className="text-metadato">del tramo {h.deTramo}</span> : null}
                {!h.fundamental ? <span className="text-metadato">propio</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * El seguimiento, arriba de la hoja de ruta (REVISION, 23 nov): los tramos
 * en una línea con el actual marcado, «dónde estamos» en una frase, el plazo
 * que queda y si el tramo va con retraso.
 */
export function SeguimientoTramos({ seguimiento, hoy }: { seguimiento: Seguimiento; hoy: string }) {
  const { tramos, firma, estadio } = seguimiento;
  if (!tramos.length) return null;
  const actual = tramos.find((t) => !t.cerrado) ?? null;
  const p = firma && estadio ? plazo(firma, estadio, hoy) : null;
  const retraso = actual ? retrasoTramo({ fin: actual.fin, cerrado: actual.cerrado }, hoy) : null;

  return (
    <Bloque id="seguimiento" className="mb-6" elevacion={2}>
      <TituloBloque
        accion={
          <Metadato>
            {actual ? `Tramo ${actual.tramo} de 4` : "Todos los tramos cerrados"}
            {firma ? "" : " · borrador, hasta la firma"}
          </Metadato>
        }
      >
        {actual ? actual.nombre : "Hoja de ruta cumplida"}
      </TituloBloque>
      <ol className="grid grid-cols-2 gap-1 px-4 pt-4 sm:grid-cols-4" aria-label="Los tramos">
        {([1, 2, 3, 4] as NumeroTramo[]).map((n) => {
          const t = tramos.find((x) => x.tramo === n);
          const valor: EstadoVisual = !t ? "no_aplica" : t.cerrado ? "hecho" : t === actual ? "curso" : "pendiente";
          const rotulo = !t ? "Antes de su entrada" : t.cerrado ? "Cerrado" : t === actual ? "En curso" : "Por hacer";
          return (
            <li key={n} className="flex flex-col gap-1 rounded-md border border-filete px-3 py-2" aria-current={t === actual ? "step" : undefined}>
              <span className="text-xs text-metadato">Tramo {n}</span>
              <span className="text-sm text-titular">{TRAMOS[n].nombre}</span>
              <Estado valor={valor} rotulo={rotulo} />
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-1 px-4 py-4 text-sm">
        {actual ? <p className="text-titular">{dondeEstamos(actual.hitos)}</p> : null}
        {p ? (
          <p className={p.vencido ? "es-vencido texto-estado" : "text-secundario"}>
            {textoPlazo(p)}: plazo máximo de {p.meses} meses desde la firma, hasta el {fecha(p.vence)}.
          </p>
        ) : (
          <p className="text-secundario">El plazo empieza a contar con la firma del Acuerdo.</p>
        )}
        {retraso ? (
          <p className="es-atencion texto-estado">
            Este tramo va con {retraso === 1 ? "1 semana" : `${retraso} semanas`} de retraso sobre su duración.
          </p>
        ) : null}
      </div>
    </Bloque>
  );
}
