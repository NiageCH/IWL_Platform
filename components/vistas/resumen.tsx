import Link from "next/link";

/** Los dos diccionarios que bajaron de la cabecera con sus datos */
const ETAPAS: Record<string, string> = {
  pre_semilla: "Pre-semilla",
  semilla: "Semilla",
  serie_a: "Serie A",
};

const PERFILES: Record<string, string> = {
  software: "Software",
  software_ia: "Software con IA",
  hardware: "Hardware",
};
import type { ResumenCompania } from "@/lib/datos/compania";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { leerAvance } from "@/lib/datos/avance";
import { AvanceDelProgramaVista } from "@/components/avance-programa";
import { VistaTareas } from "./tareas";
import { Evolucion } from "@/components/evolucion";
import { VistaMadurez } from "./madurez";
import { EnlacesInforme } from "@/components/informe/enlace";
import {
  Bloque,
  Cifra,
  Metadato,
  Semaforo,
  Severidad,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { LeyendaEstados } from "@/components/ui/estado";
import { euros, numero, porcentaje } from "@/lib/utils";

/**
 * Resumen del proyecto. Lo primero que se ve al entrar: qué falta y cómo van
 * las cifras del último mes.
 *
 * Los siguientes pasos van arriba porque son lo accionable. La interfaz los
 * presenta como siguiente paso con fecha, no como lista de reproches (§8).
 */
export async function VistaResumen({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { compania, invertible, kpis, hallazgos, scorePreparacion, scoreTecnico, semaforo } =
    resumen;
  const movimiento = await leerMovimiento(resumen.compania.id);
  const avance = await leerAvance(
    resumen.compania.id,
    resumen.compania.phase_id,
  );

  /* El mismo prefijo que usa la cabecera: la fundadora ve `/proyecto`, IWL
     la ficha de esa compañía dentro de la cartera */
  const base = resumen.permisos.esIwl
    ? `/cartera/${resumen.compania.slug}`
    : "/proyecto";

  const criticos = hallazgos.filter((h) => h.severidad === "critico");
  const altos = hallazgos.filter((h) => h.severidad === "alto");

  return (
    <div className="flex flex-col gap-6">
      {/*
        Por dónde va, lo primero.
        
        Era la pregunta que la plataforma no contestaba de un vistazo: la
        fase estaba en letra pequeña en la cabecera y no decía ni cuántas
        hay, ni cuál viene después, ni cuánto queda. Para saberlo había que
        leerse cinco bloques.
      */}
      <Bloque elevacion={2}>
        <TituloBloque
          accion={
            <Metadato>
              {avance.faseActual
                ? `Fase ${avance.faseActual.orden + 1} de ${avance.fases.length}`
                : "Sin fase"}
            </Metadato>
          }
        >
          Por dónde va
        </TituloBloque>

        {/*
          Lo que bajó de la cabecera.
          
          La descripción, el sector, la etapa y el perfil estaban arriba, y
          arriba se repetían en las ocho pantallas de la compañía. Aquí se
          leen una vez, que es las que hacen falta.
        */}
        <div className="border-b border-filete px-4 py-3">
          <p className="text-sm text-cuerpo">
            {compania.one_liner ?? "Sin descripción todavía."}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Metadato>{compania.sector ?? "Sin sector"}</Metadato>
            <Metadato>{ETAPAS[compania.stage] ?? compania.stage}</Metadato>
            <Metadato>
              {PERFILES[compania.tech_profile] ?? compania.tech_profile}
            </Metadato>
            {compania.website ? (
              <a
                href={compania.website}
                target="_blank"
                rel="noreferrer noopener"
                className="enlace text-xs text-acento-texto"
              >
                {compania.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </p>
        </div>

        {/*
          El estado, con su porqué.
          
          Esto estaba en la cabecera: el semáforo con su motivo, el
          «invertible» y la lectura de cada score. De la cabecera se fue
          porque la hacía pesar más que el contenido y se repetía en las
          ocho pantallas. Aquí se lee una vez y entero, que es lo que hacía
          falta: arriba queda la señal, aquí el motivo.
        */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-filete px-4 py-3">
          <Semaforo estado={semaforo.estado} motivo={semaforo.motivo} />

          <span className="flex items-baseline gap-2 text-xs">
            <span className="text-metadato">Invertible</span>
            <span className="cifra text-sm text-titular">
              {invertible.invertible ? "Sí" : "No"}
            </span>
            <span className="text-metadato">
              {invertible.invertible
                ? "cumple la definición del programa"
                : invertible.siguientesPasos.length === 1
                  ? "un paso por delante"
                  : `${invertible.siguientesPasos.length} pasos por delante`}
            </span>
          </span>

          <span className="text-xs text-metadato">
            {scoreTecnico.evaluadas === 0
              ? "Due diligence técnico pendiente"
              : scoreTecnico.completo
                ? `Score técnico sobre el objetivo de ${(ETAPAS[compania.stage] ?? compania.stage).toLowerCase()}`
                : `${scoreTecnico.evaluadas} de ${scoreTecnico.aplicables} dimensiones técnicas evaluadas`}
          </span>

          <span className="text-xs text-metadato">
            Preparación sobre {scorePreparacion.areas.length} áreas y la técnica
          </span>
        </div>

        <AvanceDelProgramaVista avance={avance} />
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {invertible.invertible ? "Proyecto invertible" : "Camino a invertible"}
            </Metadato>
          }
        >
          Siguientes pasos
        </TituloBloque>

        {invertible.siguientesPasos.length === 0 ? (
          <SinDatos>
            La compañía cumple la definición de proyecto invertible del programa:
            due diligence superado, sin hallazgos críticos abiertos y en
            condiciones de levantar ronda.
          </SinDatos>
        ) : (
          /*
            Cada paso lleva a donde se hace.
            
            Eran frases sueltas: se leían y no llevaban a ninguna parte, así
            que había que buscar a mano la sección donde actuar. Ahora la
            fila entera es una entrada, con su flecha al final.
          */
          <ol className="divide-y divide-filete">
            {invertible.siguientesPasos.map((paso, i) => (
              <li key={paso.texto} className="fila-enlace flex gap-4 px-4 py-3">
                <span className="cifra text-xs text-metadato">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link
                  href={`${base}/${paso.seccion}`}
                  className="estirado enlace min-w-0 flex-1 text-sm text-titular"
                >
                  {paso.texto}
                </Link>
                <span
                  aria-hidden="true"
                  className="flecha cifra shrink-0 text-acento-texto"
                >
                  →
                </span>
              </li>
            ))}
          </ol>
        )}
        <EnlacesInforme
          slug={resumen.compania.slug}
          tipos={["mensual"]}
        />
      </Bloque>

      {/*
        Quién hace qué, pegado a los siguientes pasos.
        
        Los siguientes pasos dicen lo que falta; esto dice quién lo está
        haciendo. Separarlos en pantallas distintas era obligar a cruzar
        las dos listas de cabeza.
      */}
      <VistaTareas resumen={resumen} />

      <VistaMadurez resumen={resumen} />

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {movimiento.lineaBase
                ? `Desde ${movimiento.lineaBase.fecha}`
                : "Sin medición de partida"}
            </Metadato>
          }
        >
          Recorrido
        </TituloBloque>
        <Evolucion puntos={movimiento.puntos} />
      </Bloque>

      <div className="grid gap-6 md:grid-cols-2">
        <Bloque>
          <TituloBloque
            accion={<Metadato>{kpis.periodo ?? "Sin datos"}</Metadato>}
          >
            Último mes
          </TituloBloque>

          {kpis.periodo ? (
            <div className="grid grid-cols-2 gap-6 px-4 py-4">
              <Cifra etiqueta="MRR" valor={euros(kpis.valores.mrr)} />
              <Cifra
                etiqueta="Crecimiento"
                valor={porcentaje(kpis.derivados.crecimiento_mrr)}
                nota="Respecto al mes anterior"
              />
              <Cifra etiqueta="Caja" valor={euros(kpis.valores.caja)} />
              <Cifra
                etiqueta="Runway"
                valor={
                  kpis.derivados.runway_meses === null
                    ? "—"
                    : `${numero(kpis.derivados.runway_meses, 1)} meses`
                }
                nota={`Burn de ${euros(kpis.valores.burn_mensual)}`}
              />
              <Cifra
                etiqueta="Clientes de pago"
                valor={numero(kpis.valores.clientes_pago)}
                nota={`${numero(kpis.valores.pilotos_activos)} pilotos abiertos`}
              />
              <Cifra
                etiqueta="Coste cloud"
                valor={porcentaje(kpis.derivados.coste_cloud_sobre_ingresos)}
                nota="Sobre ingresos del mes"
              />
            </div>
          ) : (
            <SinDatos>
              Todavía no hay ningún update mensual cargado. El primero fija la
              línea de partida.
            </SinDatos>
          )}
        </Bloque>

        <Bloque>
          <TituloBloque accion={<Metadato>{hallazgos.length} abiertos</Metadato>}>
            Hallazgos
          </TituloBloque>

          {hallazgos.length === 0 ? (
            <SinDatos>Ningún hallazgo abierto ahora mismo.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {[...criticos, ...altos]
                .concat(hallazgos.filter((h) => !["critico", "alto"].includes(h.severidad)))
                .slice(0, 6)
                .map((h) => (
                  <li key={h.id} className="flex items-baseline gap-3 px-4 py-3">
                    <Severidad nivel={h.severidad} />
                    <span className="flex-1 text-sm text-titular">{h.titulo}</span>
                    <Metadato>{h.origen === "tecnico" ? "Técnico" : "General"}</Metadato>
                  </li>
                ))}
            </ul>
          )}
        </Bloque>
      </div>

      <Bloque>
        <TituloBloque
          accion={<Metadato>Score {numero(scorePreparacion.valor, 1)}</Metadato>}
        >
          Preparación por área
        </TituloBloque>

        <ul className="divide-y divide-filete">
          {scorePreparacion.areas.map((area) => (
            <li key={area.codigo} className="flex items-center gap-4 px-4 py-3">
              <span className="w-32 shrink-0 text-sm text-titular sm:w-56">
                {area.nombre}
              </span>
              <span className="h-1.5 flex-1 rounded-sm bg-hundido" aria-hidden="true">
                <span
                  className="barra-acento block h-full rounded-sm"
                  style={{ width: `${area.valor}%` }}
                />
              </span>
              <span className="cifra w-14 shrink-0 text-right text-sm text-titular">
                {numero(area.valor, 0)}
              </span>
              <span className="hidden w-44 shrink-0 text-right text-xs text-secundario sm:inline">
                {area.bloqueantes > 0
                  ? `${area.bloqueantes} bloqueante${area.bloqueantes > 1 ? "s" : ""}`
                  : area.pendientes > 0
                    ? `${area.pendientes} por entregar`
                    : "Completa"}
              </span>
            </li>
          ))}

          {scorePreparacion.aportacionTecnica ? (
            <li className="flex items-center gap-4 bg-elevado px-4 py-3">
              <span className="w-32 shrink-0 text-sm font-medium text-titular sm:w-56">
                Due diligence técnico
              </span>
              <span className="h-1.5 flex-1 rounded-sm bg-hundido" aria-hidden="true">
                <span
                  className="barra-acento block h-full rounded-sm"
                  style={{ width: `${scorePreparacion.aportacionTecnica.valor}%` }}
                />
              </span>
              <span className="cifra w-14 shrink-0 text-right text-sm text-titular">
                {numero(scorePreparacion.aportacionTecnica.valor, 0)}
              </span>
              <span className="hidden w-44 shrink-0 text-right text-xs text-secundario sm:inline">
                Peso {numero(scorePreparacion.aportacionTecnica.peso, 1)}
              </span>
            </li>
          ) : null}
        </ul>
      </Bloque>

      <LeyendaEstados />
    </div>
  );
}
