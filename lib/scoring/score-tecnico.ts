import type {
  DimensionTecnica,
  ResultadoDimension,
  ScoreTecnico,
} from "./tipos";

/**
 * Score técnico · sección 4.4 del documento de alcance.
 *
 * Mide la distancia al nivel objetivo de la etapa, no la distancia a la
 * perfección. Una compañía pre-semilla con nivel 2 donde el objetivo es 2 está
 * al 100 por cien: no le falta nada para su etapa. La misma puntuación en
 * serie A, donde el objetivo es 4, da 50.
 *
 * Reglas:
 * - Peso cero desactiva la dimensión. Es como se apagan las dimensiones «si
 *   aplica» para quien no las tiene, sin penalizar.
 * - Superar el objetivo no suma extra. La cobertura se corta en 1.
 * - Objetivo 0 significa que la etapa no exige nada ahí: cobertura 1.
 * - Una dimensión aplicable sin puntuar cuenta como 0. El score de una
 *   evaluación a medias tiene que doler, no maquillarse.
 */
export function calcularScoreTecnico(
  dimensiones: DimensionTecnica[],
): ScoreTecnico {
  const resultados: ResultadoDimension[] = dimensiones.map((d) => {
    const aplica = d.peso > 0;
    const evaluada = d.nivel !== null;
    const nivel = d.nivel ?? 0;
    const alcanzado = Math.min(nivel, d.objetivo);
    const cobertura = d.objetivo === 0 ? 1 : alcanzado / d.objetivo;

    return {
      ...d,
      aplica,
      evaluada,
      cobertura,
      brecha: Math.max(0, d.objetivo - nivel),
    };
  });

  const aplicables = resultados.filter((r) => r.aplica);
  const pesoTotal = aplicables.reduce((acc, r) => acc + r.peso, 0);

  const valor =
    pesoTotal === 0
      ? 0
      : redondear(
          (aplicables.reduce((acc, r) => acc + r.peso * r.cobertura, 0) /
            pesoTotal) *
            100,
        );

  const sinEvaluar = aplicables.filter((r) => !r.evaluada).map((r) => r.codigo);

  return {
    valor,
    dimensiones: resultados,
    sinEvaluar,
    evaluadas: aplicables.length - sinEvaluar.length,
    aplicables: aplicables.length,
    completo: aplicables.length > 0 && sinEvaluar.length === 0,
  };
}

/**
 * Dimensiones ordenadas por lo que más aporta cerrarlas: peso por brecha.
 * Es lo que la interfaz presenta como siguiente paso, en lugar de una lista
 * de todo lo que está mal.
 */
export function dimensionesPorPrioridad(
  score: ScoreTecnico,
): ResultadoDimension[] {
  return score.dimensiones
    .filter((d) => d.aplica && d.brecha > 0)
    .sort((a, b) => b.peso * b.brecha - a.peso * a.brecha);
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}
