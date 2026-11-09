import type {
  AreaDd,
  EstadoPuntoDd,
  ResultadoArea,
  ScorePreparacion,
  ScoreTecnico,
} from "./tipos";

/**
 * Cuánto cuenta cada estado de un punto de due diligence.
 *
 * El documento define los estados (§4.3) pero no su valor en el score. Se fija
 * aquí, no en la interfaz: entregado ya suma, porque el trabajo está hecho y lo
 * que falta es la revisión de IWL; bloqueante suma cero aunque haya documento,
 * porque hay algo que impide seguir.
 */
const VALOR_ESTADO: Record<EstadoPuntoDd, number> = {
  pendiente: 0,
  entregado: 0.5,
  en_revision: 0.75,
  validado: 1,
  bloqueante: 0,
  // No se cuenta: sale del denominador antes de llegar aquí
  no_aplica: 0,
};

/**
 * Un punto con documento caducado vuelve a pendiente (§4.3). El cálculo lo
 * aplica en el momento de puntuar, sin esperar a que un proceso lo reescriba.
 */
function estadoEfectivo(
  estado: EstadoPuntoDd,
  caducaEl: Date | null | undefined,
  ahora: Date,
): EstadoPuntoDd {
  if (caducaEl && caducaEl.getTime() < ahora.getTime()) {
    return "pendiente";
  }
  return estado;
}

export function calcularAreas(areas: AreaDd[], ahora = new Date()): ResultadoArea[] {
  return areas.map((area) => {
    /*
     * Lo que no aplica no existe para el score: ni suma ni resta. Contarlo
     * como cero haría que un proyecto sin sociedad pareciera peor
     * preparado por no tener escritura, y lo sin medir no es un cero.
     */
    const aplicables = area.puntos.filter((p) => p.estado !== "no_aplica");
    const obligatorios = aplicables.filter((p) => p.obligatorio);
    // Los puntos opcionales suman si están, pero no restan si faltan
    const opcionalesAportados = aplicables.filter(
      (p) => !p.obligatorio && estadoEfectivo(p.estado, p.caducaEl, ahora) !== "pendiente",
    );
    const contados = [...obligatorios, ...opcionalesAportados];

    const suma = contados.reduce(
      (acc, p) => acc + VALOR_ESTADO[estadoEfectivo(p.estado, p.caducaEl, ahora)],
      0,
    );

    const valor = contados.length === 0 ? 0 : redondear((suma / contados.length) * 100);

    const estadosEfectivos = aplicables.map((p) =>
      estadoEfectivo(p.estado, p.caducaEl, ahora),
    );

    return {
      codigo: area.codigo,
      nombre: area.nombre,
      peso: area.peso,
      valor,
      total: aplicables.length,
      validados: estadosEfectivos.filter((e) => e === "validado").length,
      pendientes: estadosEfectivos.filter((e) => e === "pendiente").length,
      bloqueantes: estadosEfectivos.filter((e) => e === "bloqueante").length,
    };
  });
}

/**
 * Score de preparación · sección 4.3.
 *
 * Media ponderada de las áreas de due diligence general. La tecnología tiene
 * módulo propio pero su resultado entra en el total: se suma como una área más,
 * con el peso configurado en `platform_settings`.
 */
export function calcularScorePreparacion(
  areas: AreaDd[],
  scoreTecnico: ScoreTecnico | null,
  pesoTecnico: number,
  ahora = new Date(),
): ScorePreparacion {
  const resultados = calcularAreas(areas, ahora);

  /*
   * Un área donde no aplica nada —todo lo societario de un proyecto sin
   * sociedad— no entra en la media. Con su cero dentro, el proyecto
   * parecería peor preparado por algo que no se le puede pedir.
   */
  const noAplica = new Set(
    areas
      .filter((a) => a.puntos.length > 0 && a.puntos.every((p) => p.estado === "no_aplica"))
      .map((a) => a.codigo),
  );
  const medibles = resultados.filter((r) => !noAplica.has(r.codigo));

  let sumaPonderada = medibles.reduce((acc, a) => acc + a.peso * a.valor, 0);
  let pesoTotal = medibles.reduce((acc, a) => acc + a.peso, 0);

  let aportacionTecnica: ScorePreparacion["aportacionTecnica"] = null;

  if (scoreTecnico && pesoTecnico > 0) {
    aportacionTecnica = { peso: pesoTecnico, valor: scoreTecnico.valor };
    sumaPonderada += pesoTecnico * scoreTecnico.valor;
    pesoTotal += pesoTecnico;
  }

  return {
    valor: pesoTotal === 0 ? 0 : redondear(sumaPonderada / pesoTotal),
    areas: resultados,
    aportacionTecnica,
  };
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}
