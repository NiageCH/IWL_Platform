import type {
  EntradaInvertible,
  EstadoInvertible,
  HitoAnexo,
  ResultadoInvertible,
  Semaforo,
  Umbrales, PasoPendiente } from "./tipos";

/** Una cifra como se escribe en castellano: 26,7 y no 26.7 */
function cifra(n: number): string {
  return String(n).replace(".", ",");
}

/**
 * Invertible, con la regla del 23 nov (REVISION, 24 nov). Un proyecto es
 * invertible cuando tiene validados los hitos marcados «Condiciona
 * invertible» y dirección lo confirma al graduarlo: «Sí» solo graduada.
 * Antes de eso, cuántos de sus hitos marcados lleva validados.
 */
export function estadoInvertible(entrada: { graduada: boolean; hitos: HitoAnexo[] }): EstadoInvertible {
  const marcados = entrada.hitos.filter((h) => h.condicionaInvertible);
  const validados = marcados.filter((h) => h.estado === "cumplido").length;
  if (entrada.graduada) {
    return { invertible: true, marcados: marcados.length, validados, texto: "Sí" };
  }
  return {
    invertible: false,
    marcados: marcados.length,
    validados,
    texto: marcados.length ? `${validados} de ${marcados.length} hitos` : "Sin hitos marcados",
  };
}

/**
 * Umbrales del estado invertible. Se exponen para que la administración los
 * pueda mover sin tocar la lógica.
 */
export const UMBRALES_INVERTIBLE: Umbrales = {
  scoreTecnicoMinimo: 80,
  scorePreparacionMinimo: 80,
  runwayMinimoMeses: 6,
};

/**
 * Lo que falta, como siguientes pasos (§8).
 *
 * Fue el cálculo del estado invertible: umbrales de score, runway y
 * hallazgos críticos. Desde el 23 nov invertible es otra cosa
 * (`estadoInvertible`), y esto se queda como **señales**: los hitos
 * marcados son de invertible (`paraInvertible`), y lo demás, recomendado.
 * No decide nada; al graduar se le enseña a dirección para que lo revise.
 * `invertible` aquí solo dice que no queda ningún paso.
 */
export function evaluarInvertible(
  entrada: EntradaInvertible,
  umbrales: Umbrales = UMBRALES_INVERTIBLE,
): ResultadoInvertible {
  const siguientesPasos: PasoPendiente[] = [];

  // Un hallazgo crítico abierto bloquea el estado invertible (§4.4, §11)
  const criticos = entrada.hallazgosAbiertos.filter(
    (h) => h.severidad === "critico",
  );
  for (const hallazgo of criticos) {
    siguientesPasos.push({
      texto: `Resolver el hallazgo crítico: ${hallazgo.titulo}`,
      seccion: "tecnico",
      paraInvertible: false,
    });
  }

  // La evaluación técnica tiene que estar terminada para significar algo
  if (!entrada.scoreTecnico.completo) {
    const pendientes = entrada.scoreTecnico.sinEvaluar.length;
    siguientesPasos.push({
      texto:
        pendientes === 1
          ? "Completar la puntuación de la dimensión técnica que queda sin evaluar"
          : `Completar la puntuación de las ${pendientes} dimensiones técnicas sin evaluar`,
      seccion: "tecnico",
      paraInvertible: false,
    });
  } else if (entrada.scoreTecnico.valor < umbrales.scoreTecnicoMinimo) {
    siguientesPasos.push({
      texto: `Subir el score técnico de ${cifra(entrada.scoreTecnico.valor)} a ${cifra(umbrales.scoreTecnicoMinimo)}, el mínimo para la etapa`,
      seccion: "tecnico",
      paraInvertible: false,
    });
  }

  if (entrada.scorePreparacion.valor < umbrales.scorePreparacionMinimo) {
    siguientesPasos.push({
      texto: `Subir el score de preparación de ${cifra(entrada.scorePreparacion.valor)} a ${cifra(umbrales.scorePreparacionMinimo)}`,
      seccion: "diligencia",
      paraInvertible: false,
    });
  }

  const bloqueantes = entrada.scorePreparacion.areas.filter(
    (a) => a.bloqueantes > 0,
  );
  for (const area of bloqueantes) {
    siguientesPasos.push({
      texto: `Desbloquear ${area.bloqueantes === 1 ? "el punto bloqueante" : `los ${area.bloqueantes} puntos bloqueantes`} de ${area.nombre}`,
      seccion: "diligencia",
      paraInvertible: false,
    });
  }

  // Hitos de producto y tracción del Anexo
  const hitosPendientes = entrada.hitos.filter(
    (h) => h.condicionaInvertible && h.estado !== "cumplido",
  );
  for (const hito of hitosPendientes) {
    siguientesPasos.push({
      texto: `Cumplir el hito del Anexo: ${hito.titulo}`,
      seccion: "programa",
      paraInvertible: true,
    });
  }

  // Condiciones reales de sostenerse o levantar ronda
  if (
    entrada.runwayMeses !== null &&
    entrada.runwayMeses < umbrales.runwayMinimoMeses
  ) {
    siguientesPasos.push({
      texto: `Llevar el runway de ${cifra(entrada.runwayMeses)} a ${cifra(umbrales.runwayMinimoMeses)} meses`,
      seccion: "kpi",
      paraInvertible: false,
    });
  }

  return { invertible: siguientesPasos.length === 0, siguientesPasos };
}

/**
 * Semáforo de la cabecera (§4.1). Siempre se acompaña de texto en la
 * interfaz, nunca solo color (§8).
 */
export function calcularSemaforo(
  entrada: EntradaInvertible,
  umbrales: Umbrales = UMBRALES_INVERTIBLE,
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
