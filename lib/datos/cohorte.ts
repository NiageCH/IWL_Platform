import { clienteServidor } from "@/lib/supabase/servidor";
import { dimensionesPorPrioridad } from "@/lib/scoring/score-tecnico";
import type { ResumenCompania } from "./compania";

/**
 * Lectura de la cohorte entera: bandas, embudo, mapa de intervención y la
 * frase con la que abre el dashboard (§4.7).
 *
 * Todo sale de lo que ya se ha calculado por compañía. Aquí no se vuelve a
 * puntuar nada: se agrega.
 */

export interface Banda {
  codigo: string;
  nombre: string;
  desde: number;
  hasta: number;
}

/** Bandas por defecto, si la configuración no las trae */
const BANDAS_POR_DEFECTO: Banda[] = [
  { codigo: "inicio", nombre: "Inicio", desde: 0, hasta: 40 },
  { codigo: "en_desarrollo", nombre: "En desarrollo", desde: 40, hasta: 65 },
  { codigo: "consolidada", nombre: "Consolidada", desde: 65, hasta: 85 },
  { codigo: "preparada", nombre: "Preparada", desde: 85, hasta: 100 },
];

export async function leerBandas(): Promise<Banda[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "bandas_preparacion")
    .maybeSingle();

  const bandas = data?.value as Banda[] | null;
  return Array.isArray(bandas) && bandas.length > 0 ? bandas : BANDAS_POR_DEFECTO;
}

export function bandaDe(valor: number, bandas: Banda[]): Banda {
  // La última banda incluye su extremo superior: un 100 es «preparada»
  return (
    bandas.find((b, i) =>
      i === bandas.length - 1
        ? valor >= b.desde && valor <= b.hasta
        : valor >= b.desde && valor < b.hasta,
    ) ?? bandas[0]
  );
}

type Compania = NonNullable<ResumenCompania>;

export interface DemandaDimension {
  codigo: string;
  nombre: string;
  /** Suma de peso por brecha en toda la cohorte: dónde más rinde intervenir */
  demanda: number;
  /** Compañías a las que afecta, de mayor a menor brecha */
  companias: Array<{ nombre: string; slug: string; nivel: number; objetivo: number }>;
}

/**
 * Mapa de intervención: dónde poner la capacidad de mentoría este trimestre.
 *
 * Ordena las dimensiones técnicas por la demanda acumulada de la cohorte, no
 * por cuántas compañías fallan: una brecha grande en una dimensión que pesa
 * mucho rinde más que dos brechas pequeñas en una que pesa poco.
 */
export function mapaIntervencion(companias: Compania[]): DemandaDimension[] {
  const porDimension = new Map<string, DemandaDimension>();

  for (const c of companias) {
    for (const d of dimensionesPorPrioridad(c.scoreTecnico)) {
      if (!porDimension.has(d.codigo)) {
        porDimension.set(d.codigo, {
          codigo: d.codigo,
          nombre: d.nombre,
          demanda: 0,
          companias: [],
        });
      }

      const entrada = porDimension.get(d.codigo)!;
      entrada.demanda += d.peso * d.brecha;
      entrada.companias.push({
        nombre: c.compania.name,
        slug: c.compania.slug,
        nivel: d.nivel ?? 0,
        objetivo: d.objetivo,
      });
    }
  }

  return [...porDimension.values()]
    .map((d) => ({
      ...d,
      demanda: Math.round(d.demanda * 10) / 10,
      companias: d.companias.sort(
        (a, b) => b.objetivo - b.nivel - (a.objetivo - a.nivel),
      ),
    }))
    .sort((a, b) => b.demanda - a.demanda);
}

export interface TramoEmbudo {
  banda: Banda;
  companias: Array<{ nombre: string; slug: string; valor: number }>;
}

/** Embudo hacia invertible: cuántas compañías hay en cada banda (§4.7) */
export function embudo(companias: Compania[], bandas: Banda[]): TramoEmbudo[] {
  return bandas.map((banda) => ({
    banda,
    companias: companias
      .filter((c) => bandaDe(c.scorePreparacion.valor, bandas).codigo === banda.codigo)
      .map((c) => ({
        nombre: c.compania.name,
        slug: c.compania.slug,
        valor: c.scorePreparacion.valor,
      }))
      .sort((a, b) => b.valor - a.valor),
  }));
}

/**
 * La frase con la que abre el dashboard.
 *
 * Una sola lectura de la cohorte, en la voz de IWL: qué ha cambiado, dónde
 * está el hueco y cuántas están listas. Se construye con reglas, no con un
 * modelo: tiene que decir siempre lo mismo ante los mismos datos.
 */
export function lecturaDeCohorte(
  companias: Compania[],
  movimientos: Map<string, { deltaPreparacion: number | null }>,
  mapa: DemandaDimension[],
  objetivoCohorte: number | null,
): string {
  if (companias.length === 0) return "No hay compañías en seguimiento todavía.";

  const invertibles = companias.filter((c) => c.invertible.invertible).length;

  const deltas = companias
    .map((c) => movimientos.get(c.compania.id)?.deltaPreparacion)
    .filter((d): d is number => typeof d === "number");

  const medio =
    deltas.length > 0
      ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
      : null;

  const frases: string[] = [];

  if (medio !== null && medio !== 0) {
    frases.push(
      medio > 0
        ? `La cohorte avanza ${formatear(medio)} puntos de preparación de media desde su medición de partida`
        : `La cohorte retrocede ${formatear(Math.abs(medio))} puntos de preparación de media desde su medición de partida`,
    );
  } else {
    frases.push("La cohorte no se ha movido desde su medición de partida");
  }

  if (mapa[0]) {
    frases.push(
      `donde más rinde intervenir es ${mapa[0].nombre.toLowerCase()}, que afecta a ${
        mapa[0].companias.length === 1
          ? "una compañía"
          : `${mapa[0].companias.length} compañías`
      }`,
    );
  }

  const meta = objetivoCohorte ? ` de un objetivo de ${objetivoCohorte}` : "";
  frases.push(
    invertibles === 0
      ? `ninguna alcanza todavía el estado invertible${meta}`
      : `${invertibles} de ${companias.length} alcanzan el estado invertible${meta}`,
  );

  return `${frases.join(", y ")}.`;
}

function formatear(valor: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(valor);
}

// -----------------------------------------------------------------------------
// Series para los gráficos de cohorte
// -----------------------------------------------------------------------------

export interface PuntoCohorte {
  fecha: string;
  media: number;
  companias: number;
}

/**
 * Preparación media de la cohorte en el tiempo.
 *
 * Se agrupa por mes, no por fecha exacta: dos compañías medidas con tres días
 * de diferencia son el mismo punto de la serie, y separarlas dibujaría un eje
 * con el mismo mes repetido.
 *
 * Solo cuenta las compañías que ya tenían medición. Si una entra al programa
 * en junio, no arrastra la media de marzo hacia abajo: en marzo no estaba.
 */
export function evolucionCohorte(
  instantaneas: Array<{ company_id: string; taken_on: string; preparation_score: number | null }>,
): PuntoCohorte[] {
  const meses = [...new Set(instantaneas.map((s) => s.taken_on.slice(0, 7)))].sort();

  return meses.map((mes) => {
    // Para cada compañía, su medición más reciente hasta el final de ese mes
    const porCompania = new Map<string, number>();

    for (const s of [...instantaneas].sort((a, b) =>
      a.taken_on.localeCompare(b.taken_on),
    )) {
      if (s.taken_on.slice(0, 7) > mes || s.preparation_score === null) continue;
      porCompania.set(s.company_id, Number(s.preparation_score));
    }

    const valores = [...porCompania.values()];
    const media =
      valores.length === 0
        ? 0
        : Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;

    return { fecha: `${mes}-01`, media, companias: valores.length };
  });
}

/** Hallazgos abiertos de toda la cohorte, agrupados por severidad */
export function hallazgosPorSeveridad(companias: Compania[]) {
  const orden = [
    { severidad: "critico", nombre: "Crítico", critica: true },
    { severidad: "alto", nombre: "Alto", critica: false },
    { severidad: "medio", nombre: "Medio", critica: false },
    { severidad: "bajo", nombre: "Bajo", critica: false },
  ];

  return orden.map((s) => ({
    ...s,
    cuenta: companias.reduce(
      (acc, c) => acc + c.hallazgos.filter((h) => h.severidad === s.severidad).length,
      0,
    ),
  }));
}

/** Scorecards de la cohorte, para verlos en paralelo */
export function radaresCohorte(companias: Compania[]) {
  const NOMBRES_CORTOS: Record<string, string> = {
    arquitectura_producto: "Arquitectura",
    codigo_calidad: "Código",
    seguridad: "Seguridad",
    infraestructura_operacion: "Infra",
    escalabilidad_rendimiento: "Escala",
    datos_privacidad: "Datos",
    ia_modelos: "IA",
    hardware: "Hardware",
    propiedad_intelectual_tecnica: "PI",
    equipo_proceso: "Equipo",
  };

  return companias.map((c) => ({
    nombre: c.compania.name,
    slug: c.compania.slug,
    score: c.scoreTecnico.valor,
    dimensiones: c.scoreTecnico.dimensiones
      .filter((d) => d.aplica)
      .map((d) => ({
        nombre: NOMBRES_CORTOS[d.codigo] ?? d.nombre,
        nivel: d.nivel ?? 0,
        objetivo: d.objetivo,
      })),
  }));
}

/** Meses de caja por compañía */
export function runwayCohorte(companias: Compania[]) {
  return companias.map((c) => ({
    nombre: c.compania.name,
    meses: c.kpis.derivados.runway_meses,
  }));
}
