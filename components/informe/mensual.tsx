import type { ResumenCompania } from "@/lib/datos/compania";
import { leerUmbralesPublicos } from "@/lib/datos/compania";
import { leerMes, quienGenera } from "@/lib/datos/informes";
import { leerHojaDeRuta } from "@/lib/datos/ruta";
import { leerTransformacion } from "@/lib/datos/madurez";
import { nombreTipo, type TipoAportacion } from "@/lib/datos/aportacion-extra";
import { RadarMadurez } from "@/components/radar-madurez";
import { Celda, Cifras, NoHay, Pie, Portada, Seccion, Tabla } from "./piezas";
import { etapa, valorKpi, variacionKpi } from "@/lib/etiquetas";
import { euros, fecha, numero } from "@/lib/utils";

/**
 * Informe mensual de la compañía · paso 15.
 *
 * Es lo que la fundadora manda a su consejo y lo que IWL archiva. Cuenta el
 * mes, no el acumulado: qué movieron los KPI, qué se hizo por cada lado, qué
 * hitos cambiaron y qué puso IWL en esas cuatro semanas.
 *
 * La madurez sí va acumulada, porque un mes no transforma nada: ahí la
 * pregunta es dónde estamos respecto del día que empezamos.
 */

const ESTADOS_HITO: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  retrasado: "Retrasado",
};

const ESTADOS_UPDATE: Record<string, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  revisado: "Revisado",
};

export async function InformeMensual({
  resumen,
  periodo,
}: {
  resumen: NonNullable<ResumenCompania>;
  periodo?: string;
}) {
  const { compania } = resumen;

  const umbrales = await leerUmbralesPublicos();
  const [mes, ruta, transformacion, generadoPor] = await Promise.all([
    leerMes(compania.id, periodo),
    leerHojaDeRuta(compania.id, compania.entry_state),
    leerTransformacion(resumen, umbrales.runwayMinimoMeses),
    quienGenera(),
  ]);

  if (!mes) {
    return (
      <article>
        <Portada
          titulo="Informe mensual"
          compania={compania.name}
          subtitulo="No hay ningún mes con KPI cargados todavía."
          confidencialidad="Documento compartido entre IWL y el equipo fundador."
          datos={[{ etiqueta: "Etapa", valor: etapa(compania.stage) }]}
        />
        <NoHay>
          Este informe se construye sobre los KPI del mes. Sin ningún periodo
          cargado no hay nada que contar: el primer paso es cargar los KPI desde
          la pantalla de la compañía.
        </NoHay>
        <Pie generadoPor={generadoPor} />
      </article>
    );
  }

  const deLaCompania = mes.avances.filter((a) => a.lado === "compania");
  const deIwl = mes.avances.filter((a) => a.lado === "iwl");
  const cumplidos = mes.hitos.filter((h) => h.estado === "cumplido");
  const costeItems = mes.items.reduce((t, i) => t + (i.coste ?? 0), 0);

  return (
    <article>
      <Portada
        titulo={`Informe de ${mes.etiqueta}`}
        compania={compania.name}
        subtitulo="Qué ha pasado este mes: cómo se han movido los indicadores, qué ha avanzado cada parte, qué hitos han cambiado y qué ha puesto IWL."
        confidencialidad="Documento compartido entre IWL y el equipo fundador. La fundadora puede compartirlo con su consejo y con inversores."
        datos={[
          { etiqueta: "Etapa", valor: etapa(compania.stage) },
          {
            etiqueta: "Etapa del plan",
            valor: ruta.etapaActual?.nombre ?? "Sin hoja de ruta",
          },
          {
            etiqueta: "Update del mes",
            valor: mes.update
              ? (ESTADOS_UPDATE[mes.update.estado] ?? mes.update.estado)
              : "Sin enviar",
          },
        ]}
      />

      <Seccion
        titulo="Indicadores"
        descripcion="El valor del mes y cómo se ha movido respecto del anterior. La variación se lee según lo que persigue cada indicador: en la quema mensual, bajar es mejorar."
      >
        {mes.kpis.length === 0 ? (
          <NoHay>No hay indicadores cargados en este periodo.</NoHay>
        ) : (
          <Tabla
            cabeceras={["Indicador", "Este mes", "Mes anterior", "Variación", "Objetivo"]}
            alineadas={[1, 2, 3, 4]}
          >
            {mes.kpis.map((k) => {
              const v = variacionKpi(k.valor, k.anterior, k.unidad, k.direccion);
              return (
                <tr key={k.codigo}>
                  <Celda>{k.nombre}</Celda>
                  <Celda cifra>{valorKpi(k.unidad, k.valor)}</Celda>
                  <Celda cifra>{valorKpi(k.unidad, k.anterior)}</Celda>
                  <Celda cifra className={v.mejora === false ? "text-mal" : undefined}>
                    {v.texto}
                  </Celda>
                  <Celda cifra>{valorKpi(k.unidad, k.objetivo)}</Celda>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>

      {mes.update ? (
        <Seccion
          titulo="Lo que cuenta la compañía"
          descripcion="El update mensual, escrito por el equipo fundador."
        >
          <div className="flex flex-col gap-4">
            {mes.update.logros ? (
              <div className="bloque-informe">
                <h3 className="cifra text-xs uppercase tracking-wide text-metadato">
                  Logros
                </h3>
                <p className="mt-1 text-sm text-cuerpo">{mes.update.logros}</p>
              </div>
            ) : null}
            {mes.update.bloqueos ? (
              <div className="bloque-informe">
                <h3 className="cifra text-xs uppercase tracking-wide text-metadato">
                  Bloqueos
                </h3>
                <p className="mt-1 text-sm text-cuerpo">{mes.update.bloqueos}</p>
              </div>
            ) : null}
            {mes.update.peticiones ? (
              <div className="bloque-informe">
                <h3 className="cifra text-xs uppercase tracking-wide text-metadato">
                  Qué pide a IWL
                </h3>
                <p className="mt-1 text-sm text-cuerpo">{mes.update.peticiones}</p>
              </div>
            ) : null}
          </div>
        </Seccion>
      ) : null}

      <Seccion
        titulo="Avance del plan"
        hojaNueva
        descripcion="Lo que ha hecho cada parte este mes, sobre la hoja de ruta acordada. Se lee en dos columnas a propósito: el programa lo mueven las dos."
      >
        <Cifras
          items={[
            {
              etiqueta: "Avances de la compañía",
              valor: numero(deLaCompania.length, 0),
            },
            { etiqueta: "Avances de IWL", valor: numero(deIwl.length, 0) },
            {
              etiqueta: "Hitos cumplidos",
              valor: numero(cumplidos.length, 0),
              nota: `${ruta.hitosCumplidos} de ${ruta.hitosTotales} en todo el plan`,
            },
            {
              etiqueta: "Horas de IWL",
              valor: numero(mes.horas, 1),
              nota: `${euros(mes.valorHoras)} a tarifa de programa`,
            },
          ]}
        />

        {mes.avances.length === 0 ? (
          <NoHay>
            No hay avances registrados este mes por ninguna de las dos partes.
            Un mes sin avances registrados no es lo mismo que un mes sin
            trabajo, pero para quien lea esto dentro de un año lo parecerá.
          </NoHay>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="cifra mb-2 text-xs uppercase tracking-wide text-metadato">
                La compañía
              </h3>
              {deLaCompania.length === 0 ? (
                <p className="text-sm text-secundario">Sin avances registrados.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {deLaCompania.map((a) => (
                    <li key={a.id} className="bloque-informe">
                      <p className="text-sm text-titular">{a.titulo}</p>
                      {a.cuerpo ? (
                        <p className="mt-0.5 text-xs text-secundario">{a.cuerpo}</p>
                      ) : null}
                      <p className="cifra mt-0.5 text-[11px] text-metadato">
                        {fecha(a.fecha)}
                        {a.etapa ? ` · ${a.etapa}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="cifra mb-2 text-xs uppercase tracking-wide text-metadato">
                IWL
              </h3>
              {deIwl.length === 0 ? (
                <p className="text-sm text-secundario">Sin avances registrados.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {deIwl.map((a) => (
                    <li key={a.id} className="bloque-informe border-l-2 border-acento pl-3">
                      <p className="text-sm text-titular">{a.titulo}</p>
                      {a.cuerpo ? (
                        <p className="mt-0.5 text-xs text-secundario">{a.cuerpo}</p>
                      ) : null}
                      <p className="cifra mt-0.5 text-[11px] text-metadato">
                        {fecha(a.fecha)}
                        {a.etapa ? ` · ${a.etapa}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Seccion>

      {mes.hitos.length > 0 ? (
        <Seccion
          titulo="Hitos"
          descripcion="Los hitos que vencían o se cerraron en el periodo. Los que condicionan el estado invertible van marcados: son los que bloquean una ronda mientras sigan abiertos."
        >
          <Tabla cabeceras={["Hito", "Etapa", "Fecha", "Estado"]}>
            {mes.hitos.map((h) => (
              <tr key={`${h.titulo}-${h.fecha}`}>
                <Celda>
                  {h.titulo}
                  {h.condiciona ? (
                    <span className="cifra ml-2 text-[11px] uppercase tracking-wide text-metadato">
                      condiciona invertible
                    </span>
                  ) : null}
                </Celda>
                <Celda>{h.etapa ?? "Sin etapa"}</Celda>
                <Celda>{h.fecha ? fecha(h.fecha) : "Sin fecha"}</Celda>
                <Celda>{ESTADOS_HITO[h.estado] ?? h.estado}</Celda>
              </tr>
            ))}
          </Tabla>
        </Seccion>
      ) : null}

      {mes.items.length > 0 ? (
        <Seccion
          titulo="Aportación de IWL este mes"
          descripcion="Además de las horas: compras asumidas, eventos, reuniones con inversores y gestiones."
        >
          <Tabla cabeceras={["Aportación", "Tipo", "Coste asumido"]} alineadas={[2]}>
            {mes.items.map((i) => (
              <tr key={i.titulo}>
                <Celda>{i.titulo}</Celda>
                <Celda>{nombreTipo(i.tipo as TipoAportacion)}</Celda>
                <Celda cifra>{i.coste === null ? "—" : euros(i.coste)}</Celda>
              </tr>
            ))}
            {costeItems > 0 ? (
              <tr className="border-t border-filete-fuerte font-medium">
                <Celda>Total</Celda>
                <Celda />
                <Celda cifra>{euros(costeItems)}</Celda>
              </tr>
            ) : null}
          </Tabla>
        </Seccion>
      ) : null}

      <Seccion
        titulo="Madurez"
        hojaNueva
        descripcion="Este apartado no es del mes: es acumulado. Un mes no transforma un proyecto, y la pregunta aquí es dónde estamos respecto del día que empezamos."
      >
        <Cifras
          items={[
            {
              etiqueta: "Madurez hoy",
              valor:
                transformacion.hoy.valor === null
                  ? "—"
                  : numero(transformacion.hoy.valor, 1),
              nota:
                transformacion.hoy.cobertura === 100
                  ? "Los cinco ejes medidos"
                  : `${transformacion.hoy.cobertura} % del peso medido`,
            },
            {
              etiqueta: "Al empezar",
              valor:
                transformacion.inicio?.valor == null
                  ? "—"
                  : numero(transformacion.inicio.valor, 1),
              nota: transformacion.lineaBaseFecha
                ? `Línea base del ${fecha(transformacion.lineaBaseFecha)}`
                : "Sin línea base congelada",
            },
            {
              etiqueta: "Transformación",
              valor:
                transformacion.hoy.valor !== null &&
                transformacion.inicio?.valor != null
                  ? `${transformacion.hoy.valor - transformacion.inicio.valor >= 0 ? "+" : ""}${numero(transformacion.hoy.valor - transformacion.inicio.valor, 1)}`
                  : "—",
              nota:
                transformacion.inicio === null
                  ? "Hace falta una línea base para medirla"
                  : "Puntos desde el inicio del programa",
            },
            {
              etiqueta: "Recorrido del plan",
              valor:
                ruta.hitosTotales === 0
                  ? "—"
                  : `${Math.round((ruta.hitosCumplidos / ruta.hitosTotales) * 100)} %`,
              nota: `${ruta.hitosCumplidos} de ${ruta.hitosTotales} hitos`,
            },
          ]}
        />

        {transformacion.deltas.length >= 3 ? (
          <div className="bloque-informe">
            <RadarMadurez
              ejes={transformacion.deltas.map((d) => ({
                nombre: d.nombre,
                hoy: d.hoy,
                inicio: d.inicio,
              }))}
              conLineaBase={transformacion.inicio !== null}
            />
          </div>
        ) : null}

        <Tabla cabeceras={["Eje", "Hoy", "Al empezar", "De dónde sale"]} alineadas={[1, 2]}>
          {transformacion.hoy.ejes.map((eje) => {
            const partida =
              transformacion.deltas.find((d) => d.eje === eje.eje)?.inicio ?? null;
            return (
              <tr key={eje.eje}>
                <Celda>{eje.nombre}</Celda>
                <Celda cifra>
                  {eje.valor === null ? "sin medir" : numero(eje.valor, 0)}
                </Celda>
                <Celda cifra>{partida === null ? "—" : numero(partida, 0)}</Celda>
                <Celda>{eje.motivo}</Celda>
              </tr>
            );
          })}
        </Tabla>

        {transformacion.hoy.sinMedir.length > 0 ? (
          <p className="mt-2 text-xs text-metadato">
            Sin medir: {transformacion.hoy.sinMedir.join(", ")}. No cuentan como
            cero: el índice se reparte sobre los ejes con datos. Un eje sin
            evaluar no es un eje malo.
          </p>
        ) : null}
      </Seccion>

      <Pie
        generadoPor={generadoPor}
        nota={`Los indicadores y los avances son los del periodo de ${mes.etiqueta}. La madurez y el recorrido del plan son acumulados desde el inicio del programa.`}
      />
    </article>
  );
}
