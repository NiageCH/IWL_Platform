import type {
  EntradaInvertible,
  ResultadoInvertible,
  Semaforo,
} from "./tipos";

/**
 * Umbrales del estado invertible. Se exponen para que la administración los
 * pueda mover sin tocar la lógica.
 */
export const UMBRALES_INVERTIBLE = {
  scoreTecnicoMinimo: 80,
  scorePreparacionMinimo: 80,
  runwayMinimoMeses: 6,
} as const;

/**
 * Proyecto invertible · sección 3.
 *
 * «Ha superado su due diligence, cumple los hitos de producto y tracción de su
 * Anexo y está en condiciones reales de levantar una ronda institucional o de
 * sostenerse financieramente.» La plataforma lo calcula; no lo marca nadie a
 * mano.
 *
 * Devuelve lo que falta redactado como siguiente paso, que es como la interfaz
 * habla con la fundadora (§8).
 */
export function evaluarInvertible(
  entrada: EntradaInvertible,
  umbrales = UMBRALES_INVERTIBLE,
): ResultadoInvertible {
  const siguientesPasos: string[] = [];

  // Un hallazgo crítico abierto bloquea el estado invertible (§4.4, §11)
  const criticos = entrada.hallazgosAbiertos.filter(
    (h) => h.severidad === "critico",
  );
  for (const hallazgo of criticos) {
    siguientesPasos.push(`Resolver el hallazgo crítico: ${hallazgo.titulo}`);
  }

  // La evaluación técnica tiene que estar terminada para significar algo
  if (!entrada.scoreTecnico.completo) {
    const pendientes = entrada.scoreTecnico.sinEvaluar.length;
    siguientesPasos.push(
      pendientes === 1
        ? "Completar la puntuación de la dimensión técnica que queda sin evaluar"
        : `Completar la puntuación de las ${pendientes} dimensiones técnicas sin evaluar`,
    );
  } else if (entrada.scoreTecnico.valor < umbrales.scoreTecnicoMinimo) {
    siguientesPasos.push(
      `Subir el score técnico de ${entrada.scoreTecnico.valor} a ${umbrales.scoreTecnicoMinimo}, el mínimo para la etapa`,
    );
  }

  if (entrada.scorePreparacion.valor < umbrales.scorePreparacionMinimo) {
    siguientesPasos.push(
      `Subir el score de preparación de ${entrada.scorePreparacion.valor} a ${umbrales.scorePreparacionMinimo}`,
    );
  }

  const bloqueantes = entrada.scorePreparacion.areas.filter(
    (a) => a.bloqueantes > 0,
  );
  for (const area of bloqueantes) {
    siguientesPasos.push(
      `Desbloquear ${area.bloqueantes === 1 ? "el punto bloqueante" : `los ${area.bloqueantes} puntos bloqueantes`} de ${area.nombre}`,
    );
  }

  // Hitos de producto y tracción del Anexo
  const hitosPendientes = entrada.hitos.filter(
    (h) => h.condicionaInvertible && h.estado !== "cumplido",
  );
  for (const hito of hitosPendientes) {
    siguientesPasos.push(`Cumplir el hito del Anexo: ${hito.titulo}`);
  }

  // Condiciones reales de sostenerse o levantar ronda
  if (
    entrada.runwayMeses !== null &&
    entrada.runwayMeses < umbrales.runwayMinimoMeses
  ) {
    siguientesPasos.push(
      `Llevar el runway de ${entrada.runwayMeses} a ${umbrales.runwayMinimoMeses} meses`,
    );
  }

  return { invertible: siguientesPasos.length === 0, siguientesPasos };
}

/**
 * Semáforo de la cabecera (§4.1). Siempre se acompaña de texto en la
 * interfaz, nunca solo color (§8).
 */
export function calcularSemaforo(
  entrada: EntradaInvertible,
  umbrales = UMBRALES_INVERTIBLE,
): { estado: Semaforo; motivo: string } {
  const criticos = entrada.hallazgosAbiertos.filter(
    (h) => h.severidad === "critico",
  );
  if (criticos.length > 0) {
    return {
      estado: "rojo",
      motivo:
        criticos.length === 1
          ? "Un hallazgo crítico abierto"
          : `${criticos.length} hallazgos críticos abiertos`,
    };
  }

  if (
    entrada.runwayMeses !== null &&
    entrada.runwayMeses < umbrales.runwayMinimoMeses
  ) {
    return {
      estado: "rojo",
      motivo: `Runway de ${entrada.runwayMeses} meses`,
    };
  }

  const hitosRetrasados = entrada.hitos.filter((h) => h.estado === "retrasado");
  if (hitosRetrasados.length > 0) {
    return {
      estado: "ambar",
      motivo:
        hitosRetrasados.length === 1
          ? "Un hito retrasado"
          : `${hitosRetrasados.length} hitos retrasados`,
    };
  }

  const altos = entrada.hallazgosAbiertos.filter((h) => h.severidad === "alto");
  if (altos.length > 0) {
    return {
      estado: "ambar",
      motivo:
        altos.length === 1
          ? "Un hallazgo de severidad alta abierto"
          : `${altos.length} hallazgos de severidad alta abiertos`,
    };
  }

  if (!entrada.scoreTecnico.completo) {
    return { estado: "ambar", motivo: "Evaluación técnica sin terminar" };
  }

  return { estado: "verde", motivo: "Sin incidencias abiertas" };
}
