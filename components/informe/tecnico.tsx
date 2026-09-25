import type { ResumenCompania } from "@/lib/datos/compania";
import { leerDatosTecnicos, porSeveridad, quienGenera } from "@/lib/datos/informes";
import { ScorecardRadar } from "@/components/scorecard-radar";
import {
  Celda,
  Cifras,
  NoHay,
  Pie,
  Portada,
  Seccion,
  Tabla,
} from "./piezas";
import { SEVERIDADES, NIVELES, etapa, perfil } from "@/lib/etiquetas";
import { euros, fecha, numero } from "@/lib/utils";

/**
 * Informe técnico de Niage · spec §4.8, paso 11.
 *
 * Dos versiones del mismo trabajo. La interna lleva cada hallazgo con su
 * evidencia y su recomendación, que es lo que hace falta para arreglarlo. La
 * de inversor lleva el score, el scorecard y el recuento por severidad, pero
 * ningún detalle que sirva para explotar lo que todavía está abierto.
 *
 * Es la misma regla que sigue el worker: los problemas se describen por tipo
 * y ubicación, nunca con lo que haría falta para aprovecharlos. Un informe de
 * due diligence circula por correo y acaba en carpetas que nadie controla.
 */

const ESTADOS_HALLAZGO: Record<string, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
  aceptado: "Riesgo aceptado",
};

const ESTADOS_PLAN: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecho: "Hecho",
  descartado: "Descartado",
};

export async function InformeTecnico({
  resumen,
  paraInversor,
}: {
  resumen: NonNullable<ResumenCompania>;
  paraInversor: boolean;
}) {
  const { compania, scoreTecnico, semaforo, invertible } = resumen;
  const [datos, generadoPor] = await Promise.all([
    leerDatosTecnicos(compania.id),
    quienGenera(),
  ]);

  const recuento = porSeveridad(datos.hallazgos);
  const abiertos = datos.hallazgos.filter(
    (h) => h.estado === "abierto" || h.estado === "en_curso",
  );
  const aplicables = scoreTecnico.dimensiones.filter((d) => d.aplica);

  return (
    <article>
      <Portada
        titulo={
          paraInversor
            ? "Informe de due diligence técnico"
            : "Informe técnico interno"
        }
        compania={compania.name}
        subtitulo={
          paraInversor
            ? "Resumen de la evaluación técnica realizada por Niage dentro del programa de incubación de IWL. Recoge el estado de cada dimensión y el plan acordado; el detalle de los hallazgos abiertos se entrega bajo acuerdo de confidencialidad."
            : "Evaluación técnica completa, con el detalle de cada hallazgo, su evidencia y el plan de trabajo acordado con la compañía."
        }
        confidencialidad={
          paraInversor
            ? "Documento preparado para compartir con terceros en un proceso de inversión. No contiene información que permita aprovechar las debilidades que siguen abiertas."
            : "Documento interno. Contiene la evidencia de cada hallazgo, incluidos los que siguen abiertos. No debe salir de IWL, Niage y el equipo fundador."
        }
        datos={[
          { etiqueta: "Etapa", valor: etapa(compania.stage) },
          { etiqueta: "Perfil tecnológico", valor: perfil(compania.tech_profile) },
          { etiqueta: "Sector", valor: compania.sector ?? "Sin sector" },
          {
            etiqueta: "Fecha de la evaluación",
            valor: datos.evaluacion ? fecha(datos.evaluacion.fecha) : "Sin evaluación registrada",
          },
          {
            etiqueta: "Evaluación de",
            valor: datos.evaluacion?.revisor ?? "Ingeniería Niage",
          },
          {
            etiqueta: "Dimensiones evaluadas",
            valor: `${scoreTecnico.evaluadas} de ${scoreTecnico.aplicables} aplicables`,
          },
        ]}
      />

      <Seccion
        titulo="Resumen"
        descripcion="El score mide la distancia al objetivo de la etapa de la compañía, no a la perfección técnica: un proyecto pre-semilla y uno en serie A no se miden con la misma vara."
      >
        <Cifras
          items={[
            {
              etiqueta: "Score técnico",
              valor: scoreTecnico.completo ? numero(scoreTecnico.valor, 1) : "—",
              nota: scoreTecnico.completo
                ? "Sobre 100, contra el objetivo de su etapa"
                : "Evaluación sin terminar",
            },
            {
              etiqueta: "Estado",
              valor: { verde: "En curso", ambar: "Atención", rojo: "Bloqueo" }[
                semaforo.estado
              ],
              nota: semaforo.motivo,
            },
            {
              etiqueta: "Hallazgos abiertos",
              valor: numero(abiertos.length, 0),
              nota: `${recuento[0].abiertos} críticos, ${recuento[1].abiertos} altos`,
            },
            {
              etiqueta: "Coste del plan",
              valor: euros(datos.costeTotal),
              nota: `${numero(datos.esfuerzoTotal, 1)} días de esfuerzo`,
            },
          ]}
        />

        {datos.evaluacion?.resumen ? (
          <p className="text-sm text-cuerpo">{datos.evaluacion.resumen}</p>
        ) : null}

        {datos.evaluacion?.fortalezas ? (
          <div className="mt-3">
            <h3 className="cifra text-xs uppercase tracking-wide text-metadato">
              Fortalezas
            </h3>
            <p className="mt-1 text-sm text-cuerpo">{datos.evaluacion.fortalezas}</p>
          </div>
        ) : null}

        {!scoreTecnico.completo ? (
          <p className="mt-3 border-l-2 border-aviso pl-3 text-sm text-secundario">
            Quedan {scoreTecnico.sinEvaluar.length} dimensiones sin puntuar
            {scoreTecnico.sinEvaluar.length > 0
              ? `: ${scoreTecnico.sinEvaluar.join(", ")}`
              : ""}
            . El score se calcula solo con las evaluadas, así que la cifra de
            arriba no es comparable con la de una evaluación cerrada.
          </p>
        ) : null}
      </Seccion>

      <Seccion
        titulo="Scorecard por dimensión"
        descripcion="Nivel alcanzado en cada dimensión frente al objetivo de la etapa. Las dimensiones que no aplican al perfil tecnológico de la compañía no se puntúan ni cuentan para el score."
      >
        <div className="bloque-informe mb-4">
          <ScorecardRadar dimensiones={scoreTecnico.dimensiones} />
        </div>

        <Tabla
          cabeceras={["Dimensión", "Nivel", "Objetivo", "Peso", "Situación"]}
          alineadas={[1, 2, 3]}
        >
          {aplicables.map((d) => (
            <tr key={d.codigo}>
              <Celda>{d.nombre}</Celda>
              <Celda cifra>
                {d.evaluada ? `${d.nivel} · ${NIVELES[d.nivel ?? 0]}` : "Sin evaluar"}
              </Celda>
              <Celda cifra>
                {d.objetivo} · {NIVELES[d.objetivo]}
              </Celda>
              <Celda cifra>{numero(d.peso, 0)}</Celda>
              <Celda>
                {!d.evaluada
                  ? "Pendiente de puntuar"
                  : (d.nivel ?? 0) >= d.objetivo
                    ? "En el objetivo de la etapa"
                    : `A ${d.objetivo - (d.nivel ?? 0)} nivel${d.objetivo - (d.nivel ?? 0) === 1 ? "" : "es"} del objetivo`}
              </Celda>
            </tr>
          ))}
        </Tabla>
      </Seccion>

      <Seccion
        titulo="Hallazgos"
        hojaNueva
        descripcion={
          paraInversor
            ? "Recuento por severidad y estado. El detalle de cada hallazgo abierto no se incluye en esta versión del informe: describirlo sería explicar cómo aprovecharlo. Se entrega en la sala de datos, bajo acuerdo de confidencialidad."
            : "Cada hallazgo con su evidencia y su recomendación. Un riesgo aceptado sin resolver lleva siempre el motivo por escrito."
        }
      >
        <Tabla
          cabeceras={["Severidad", "Abiertos", "Resueltos", "Aceptados"]}
          alineadas={[1, 2, 3]}
        >
          {recuento.map((r) => (
            <tr key={r.severidad}>
              <Celda>{SEVERIDADES[r.severidad]}</Celda>
              <Celda cifra>{r.abiertos}</Celda>
              <Celda cifra>{r.resueltos}</Celda>
              <Celda cifra>{r.aceptados}</Celda>
            </tr>
          ))}
        </Tabla>

        {!paraInversor ? (
          <div className="mt-6 flex flex-col gap-4">
            {datos.hallazgos.length === 0 ? (
              <NoHay>
                No hay hallazgos registrados. En una evaluación cerrada esto
                significa que no se encontró ninguno; si la evaluación sigue
                abierta, significa que todavía no se ha buscado.
              </NoHay>
            ) : (
              datos.hallazgos.map((h) => (
                <div key={h.id} className="bloque-informe border border-filete px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="cifra rounded border border-filete px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-secundario">
                      {SEVERIDADES[h.severidad]}
                    </span>
                    <span className="text-sm font-medium text-titular">{h.titulo}</span>
                    <span className="flex-1" />
                    <span className="cifra text-xs text-metadato">
                      {h.dimension} · {ESTADOS_HALLAZGO[h.estado] ?? h.estado}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-cuerpo">{h.descripcion}</p>

                  {h.evidencia ? (
                    <p className="mt-2 border-l-2 border-filete pl-3 text-sm text-secundario">
                      Evidencia: {h.evidencia}
                    </p>
                  ) : null}

                  <p className="mt-2 text-sm text-cuerpo">
                    <span className="cifra text-xs uppercase tracking-wide text-metadato">
                      Recomendación
                    </span>
                    <br />
                    {h.recomendacion}
                  </p>

                  {h.notaAceptacion ? (
                    <p className="mt-2 border-l-2 border-aviso pl-3 text-sm text-secundario">
                      Riesgo aceptado: {h.notaAceptacion}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}
      </Seccion>

      <Seccion
        titulo="Plan de trabajo"
        descripcion="Lo acordado para cerrar los hallazgos, con responsable, esfuerzo y coste. El coste estimado alimenta la necesidad de capital del business plan."
      >
        {datos.plan.length === 0 ? (
          <NoHay>
            No hay plan de trabajo registrado. Los hallazgos sin plan asignado
            no tienen fecha de cierre ni responsable.
          </NoHay>
        ) : (
          <Tabla
            cabeceras={["Trabajo", "Responsable", "Trimestre", "Esfuerzo", "Coste", "Estado"]}
            alineadas={[3, 4]}
          >
            {datos.plan.map((p) => (
              <tr key={p.id}>
                <Celda>
                  {p.titulo}
                  {p.descripcion ? (
                    <span className="block text-xs text-secundario">
                      {p.descripcion}
                    </span>
                  ) : null}
                </Celda>
                <Celda>{p.responsable}</Celda>
                <Celda>
                  {p.trimestre ?? (p.fecha ? fecha(p.fecha) : "Sin fecha")}
                </Celda>
                <Celda cifra>
                  {p.esfuerzoDias === null ? "—" : `${numero(p.esfuerzoDias, 1)} d`}
                </Celda>
                <Celda cifra>{p.coste === null ? "—" : euros(p.coste)}</Celda>
                <Celda>{ESTADOS_PLAN[p.estado] ?? p.estado}</Celda>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion
        titulo="Estado invertible"
        descripcion="La definición del programa: due diligence superado, sin hallazgos críticos abiertos, hitos de producto y tracción cumplidos y en condiciones reales de levantar ronda o sostenerse."
      >
        {invertible.invertible ? (
          <p className="border-l-2 border-bien pl-3 text-sm text-cuerpo">
            La compañía cumple la definición de proyecto invertible del programa.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {invertible.siguientesPasos.map((paso, i) => (
              <li key={paso} className="flex gap-3 text-sm text-cuerpo">
                <span className="cifra text-xs text-metadato">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {paso}
              </li>
            ))}
          </ol>
        )}
      </Seccion>

      {!paraInversor && datos.sesiones.length > 0 ? (
        <Seccion
          titulo="Sesiones de revisión"
          descripcion="Las sesiones conjuntas en las que se puntuó cada dimensión. La evaluación no es un cuestionario que rellena la compañía: se revisa con ella."
        >
          <Tabla cabeceras={["Fecha", "Duración", "Asistentes", "Conclusiones"]} alineadas={[1]}>
            {datos.sesiones.map((s) => (
              <tr key={`${s.fecha}-${s.minutos}`}>
                <Celda cifra>{fecha(s.fecha)}</Celda>
                <Celda cifra>{s.minutos} min</Celda>
                <Celda>{s.asistentes}</Celda>
                <Celda>{s.conclusiones ?? "—"}</Celda>
              </tr>
            ))}
          </Tabla>
          <p className="mt-2 text-xs text-metadato">
            {numero(datos.minutosSesiones / 60, 1)} horas de revisión conjunta en
            total.
          </p>
        </Seccion>
      ) : null}

      <Pie
        generadoPor={generadoPor}
        nota={
          paraInversor
            ? "El detalle de los hallazgos abiertos está disponible en la sala de datos de la compañía, bajo acuerdo de confidencialidad."
            : undefined
        }
      />
    </article>
  );
}
