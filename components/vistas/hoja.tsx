import Link from "next/link";
import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import {
  ContestarHito,
  GenerarHoja,
  RehacerHoja,
  VerificarHito,
} from "@/components/formularios/lista-entrada";
import { resumenLista, type ItemLista, type ListaEntrada, type Seguimiento } from "@/lib/datos/hoja";
import type { EstadoVisual } from "@/lib/estados";
import {
  TRAMOS,
  dondeEstamos,
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

/**
 * El asistente para preparar la hoja de ruta, en tres pasos, con el Anexo
 * en borrador (REVISION, 20 nov): punto de partida, ajustar y proponer.
 */
export function AsistenteHoja({
  lista,
  seguimiento,
  companyId,
  slug,
  hoy,
  anexoEnBorrador,
}: {
  lista: ListaEntrada;
  seguimiento: Seguimiento;
  companyId: string;
  slug: string;
  hoy: string;
  anexoEnBorrador: boolean;
}) {
  const r = resumenLista(lista.items);
  const entrada = tramoDeEntrada(lista.estadio);
  const hay = seguimiento.tramos.length > 0;
  const paso = !hay ? 1 : 2;
  const pendientes = r.sinContestar + r.porVerificar;
  return (
    <Bloque id="asistente-hoja" className="mb-8 scroll-mt-48" elevacion={2}>
      <TituloBloque accion={<Metadato>Paso {hay ? (anexoEnBorrador ? 2 : 3) : 1} de 3</Metadato>}>
        Preparar la hoja de ruta
      </TituloBloque>

      <ol className="flex flex-wrap gap-1 border-b border-filete px-5 py-3 text-xs">
        {["Punto de partida", "Ajustar", "Revisar y proponer"].map((nombre, i) => (
          <li
            key={nombre}
            className={
              i + 1 === paso || (hay && !anexoEnBorrador && i === 2)
                ? "rounded-md bg-acento-solido px-2.5 py-1 font-semibold text-white"
                : "rounded-md px-2.5 py-1 text-secundario"
            }
          >
            {i + 1}. {nombre}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2 border-b border-filete px-5 py-4 text-sm" aria-label="Punto de partida">
        <h3 className="font-semibold text-titular">1. Punto de partida</h3>
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
        {pendientes && !hay ? (
          <p className="text-cuerpo" role="status">
            Antes de generarla conviene que esté contestada y verificada: lo que quede sin verificar entrará como
            pendiente.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 border-b border-filete px-5 py-4 text-sm" aria-label="Ajustar">
        <h3 className="font-semibold text-titular">2. Ajustar</h3>
        {!hay ? (
          <GenerarHoja companyId={companyId} slug={slug} hoy={hoy} />
        ) : (
          <>
            <ResumenTramos seguimiento={seguimiento} />
            <p className="text-secundario">
              Las fechas, los textos y los hitos propios se ajustan en{" "}
              <Link href={`/cartera/${slug}/ruta`} className="enlace text-acento-texto">
                Hoja de ruta
              </Link>
              . Un hito fundamental solo lo quita dirección, con motivo.
            </p>
            {anexoEnBorrador ? <RehacerHoja companyId={companyId} slug={slug} /> : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 px-5 py-4 text-sm" aria-label="Revisar y proponer">
        <h3 className="font-semibold text-titular">3. Revisar y proponer</h3>
        <p className="text-secundario">
          {hay
            ? anexoEnBorrador
              ? "La hoja de ruta va en la propuesta de Acuerdo, en su sección I. Cuando esté a punto, proponle el Acuerdo aquí debajo: la verá con el Anexo y la aceptará con él."
              : "Va en la propuesta de Acuerdo. Al firmar queda viva, y lo firmado queda congelado en la versión del Anexo."
            : "Cuando la hayas generado y ajustado, irá en la propuesta de Acuerdo, en su sección I."}
        </p>
      </section>
    </Bloque>
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
