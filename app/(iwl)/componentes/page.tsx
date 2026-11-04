import { notFound } from "next/navigation";
import { CircleDollarSign } from "lucide-react";

import { personaActual } from "@/lib/supabase/servidor";
import { capacidades } from "@/lib/permisos";
import {
  BarraPorEstado,
  BarraProgreso,
} from "@/components/ui/barra-progreso";
import {
  BarraSegmentada,
  Estado,
  LeyendaEstados,
  NodoEstado,
} from "@/components/ui/estado";
import {
  Bloque,
  Cifra,
  Etiqueta,
  Metadato,
  Semaforo,
  Severidad,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { CINCO, ESTADOS, type EstadoVisual } from "@/lib/estados";

/**
 * La muestra de componentes.
 *
 * Una pantalla sola, de dirección, con cada pieza en todos sus estados.
 * No es documentación: es el sitio donde se ve si algo está roto **sin
 * tener que encontrar una compañía que lo tenga**. Un estado que solo
 * aparece cuando un documento caduca se revisaba esperando a que
 * caducara; aquí está siempre.
 *
 * Se mira antes de dar por cerrada una pantalla: si una pieza se ve mal
 * aquí, se ve mal en las ocho pantallas que la usan, y arreglarla aquí las
 * arregla todas.
 */
export const metadata = { title: "Componentes · IWL" };

export default async function Componentes() {
  const persona = await personaActual();

  /* Solo quien configura el programa: es una pantalla de taller y no
     cuenta nada de ninguna compañía, pero tampoco tiene por qué estar en
     el camino de nadie */
  if (!persona || !capacidades(persona.role).configurarPrograma) notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="titular-marca text-3xl text-titular">Componentes</h1>
        <p className="text-sm text-secundario">
          Cada pieza en todos sus estados. Si algo se ve mal aquí, se ve mal
          en todas las pantallas que lo usan.
        </p>
      </header>

      <Bloque>
        <TituloBloque accion={<Metadato>Icono, palabra y color</Metadato>}>
          Estado
        </TituloBloque>
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {[...CINCO, "no_aplica" as const].map((e) => (
              <Estado key={e} valor={e} />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Metadato>Con su palabra propia, cuando dice más</Metadato>
            <div className="flex flex-wrap items-center gap-2">
              <Estado valor="hecho" rotulo="Validado" />
              <Estado valor="curso" rotulo="Entregado" />
              <Estado valor="curso" rotulo="En revisión" />
              <Estado valor="vencido" rotulo="Bloqueante" />
              <Estado valor="vencido" rotulo="Caducado el 14 oct 2026" />
              <Estado valor="pendiente" rotulo="Sin encargar" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Metadato>Solo el icono, cuando la palabra ya está al lado</Metadato>
            <div className="flex flex-wrap items-center gap-2">
              {[...CINCO].map((e) => (
                <Estado key={e} valor={e} soloIcono />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Metadato>Como nodo de una línea de tiempo</Metadato>
            <div className="flex flex-wrap items-center gap-3">
              {[...CINCO].map((e) => (
                <NodoEstado key={e} valor={e} titulo={ESTADOS[e].nombre} />
              ))}
            </div>
          </div>
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>El color sale del estado</Metadato>}>
          Severidad de un hallazgo
        </TituloBloque>
        <div className="flex flex-wrap items-center gap-2 px-4 py-4">
          <Severidad nivel="critico" />
          <Severidad nivel="alto" />
          <Severidad nivel="medio" />
          <Severidad nivel="bajo" />
          <Severidad nivel="critico" estado="resuelto" />
          <Severidad nivel="alto" estado="aceptado" />
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>El peor de lo que hay abierto</Metadato>}>
          Semáforo de la compañía
        </TituloBloque>
        <div className="flex flex-col gap-3 px-4 py-4">
          <Semaforo estado="verde" motivo="Nada vencido ni bloqueado" />
          <Semaforo estado="ambar" motivo="Un hallazgo de severidad alta abierto" />
          <Semaforo estado="rojo" motivo="Un hallazgo crítico abierto" />
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={<Metadato>Dos tamaños, los mismos en todas partes</Metadato>}
        >
          Cifra
        </TituloBloque>
        <div className="grid gap-6 px-4 py-4 sm:grid-cols-3">
          <Cifra
            destacada
            etiqueta="Recorrido"
            valor="55 %"
            nota="6 de 11 hitos cumplidos"
            ayuda="Cuántos hitos del plan están cumplidos sobre el total acordado. Se compara contra el plan, no contra el calendario: ir al 55 % en el mes seis no dice si vas tarde."
          />
          <Cifra
            etiqueta="MRR"
            valor="13.900 €"
            estado="hecho"
            nota="Objetivo 13.000 €"
            ayuda="Ingreso recurrente del último mes cargado. Se compara con el objetivo del Anexo para esta etapa. Verde es en objetivo o por encima."
            href="/comparativa"
          />
          <Cifra
            etiqueta="Caja"
            valor="227.510 €"
            estado="vencido"
            nota="Objetivo 300.000 €"
            ayuda="Saldo disponible al cierre del mes. Rojo es más de un 20 % por debajo del objetivo."
          />
          <Cifra
            etiqueta="Clientes de pago"
            valor="13"
            estado="atencion"
            nota="Objetivo 15"
            ayuda="Clientes que pagan, sin contar pilotos. Ámbar es hasta un 20 % por debajo del objetivo."
          />
          <Cifra
            etiqueta="Horas de IWL"
            valor="212"
            icono={CircleDollarSign}
            nota="de 410 previstas en el plan"
          />
          <Cifra etiqueta="Sin objetivo" valor="9,8 meses" nota="Burn de 23.186 €" />
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>El relleno sale del par</Metadato>}>
          Barra de progreso
        </TituloBloque>
        <div className="flex flex-col gap-5 px-4 py-4">
          {(
            [
              ["Hitos del Anexo", 6, 11, "curso"],
              ["Puntos validados", 23, 29, "curso"],
              ["Todo cumplido", 8, 8, "hecho"],
              ["Fuera de plazo", 2, 9, "vencido"],
              ["Sin empezar", 0, 5, "pendiente"],
            ] as Array<[string, number, number, EstadoVisual]>
          ).map(([etiqueta, hecho, total, estado]) => (
            <div key={etiqueta} className="flex flex-col gap-1.5">
              <span className="text-xs text-metadato">{etiqueta}</span>
              <BarraProgreso
                etiqueta={etiqueta}
                hecho={hecho}
                total={total}
                estado={estado}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-metadato">Sin nada que contar</span>
            <BarraProgreso etiqueta="Hitos acordados" hecho={0} total={0} />
          </div>
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Repartido por estado</Metadato>}>
          Barra por estado y barra segmentada
        </TituloBloque>
        <div className="flex flex-col gap-5 px-4 py-4">
          <BarraPorEstado etiqueta="Hitos del plan" tramos={EJEMPLO} />
          <BarraSegmentada etiqueta="Hitos del plan" segmentos={EJEMPLO} />
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Lo que acompaña a un dato</Metadato>}>
          Etiqueta y estado vacío
        </TituloBloque>
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta>Opcional</Etiqueta>
            <Etiqueta>Condiciona invertible</Etiqueta>
            <Metadato>Un metadato, en texto normal</Metadato>
          </div>
        </div>
        <SinDatos>
          Un estado vacío dice qué hacer, no que no hay nada.
        </SinDatos>
      </Bloque>

      <LeyendaEstados />
    </div>
  );
}

/** Once hitos repartidos, para enseñar las dos barras con el mismo dato */
const EJEMPLO = [
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `h${i}`,
    estado: "hecho" as const,
    rotulo: `Hito cumplido ${i + 1}`,
  })),
  { id: "c1", estado: "curso" as const, rotulo: "Data room completo" },
  { id: "a1", estado: "atencion" as const, rotulo: "Vence en cinco días" },
  { id: "v1", estado: "vencido" as const, rotulo: "Carta de intenciones" },
  { id: "p1", estado: "pendiente" as const, rotulo: "Tres inversores" },
  { id: "n1", estado: "no_aplica" as const, rotulo: "Descartado" },
];
