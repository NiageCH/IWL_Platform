/**
 * Índice de madurez · cinco ejes.
 *
 * El score técnico dice si la tecnología aguanta y el de preparación si el
 * expediente está en orden. Ninguno de los dos contesta a «¿está este
 * proyecto más maduro que hace seis meses?», que es la pregunta de una
 * incubadora.
 *
 * Los cinco ejes se calculan solo con datos que la plataforma ya tiene y que
 * alguien ha validado. No hay ningún eje estimado: si un eje no tiene con qué
 * calcularse, se queda sin medir y se dice, igual que con las dimensiones
 * técnicas sin puntuar. Un índice que rellena huecos con suposiciones da un
 * número más bonito y una decisión peor.
 */

export type EjeMadurez =
  | "tecnologia"
  | "gobierno"
  | "plan"
  | "traccion"
  | "solidez";

export interface PesosMadurez {
  tecnologia: number;
  gobierno: number;
  plan: number;
  traccion: number;
  solidez: number;
}

export const PESOS_MADUREZ: PesosMadurez = {
  tecnologia: 30,
  gobierno: 20,
  plan: 20,
  traccion: 20,
  solidez: 10,
};

export const NOMBRES_EJE: Record<EjeMadurez, string> = {
  tecnologia: "Tecnología",
  gobierno: "Gobierno",
  plan: "Plan",
  traccion: "Tracción",
  solidez: "Solidez",
};

export const EXPLICACION_EJE: Record<EjeMadurez, string> = {
  tecnologia: "El score técnico: distancia al objetivo de su etapa.",
  gobierno: "El score de preparación: expediente, documentos y checklist.",
  plan: "Hitos de la hoja de ruta cumplidos sobre los que ya tocaban.",
  traccion: "Ingreso recurrente frente al objetivo de su etapa.",
  solidez: "Runway frente al mínimo que exige el programa.",
};

export interface EntradaMadurez {
  /** De 0 a 100, o null si la evaluación técnica no está hecha */
  scoreTecnico: number | null;
  scorePreparacion: number | null;
  /** Hitos de la hoja de ruta cuya fecha ya ha pasado o está en curso */
  hitosExigibles: number;
  hitosCumplidos: number;
  /** Ingreso recurrente mensual, y el objetivo de la etapa */
  mrr: number | null;
  mrrObjetivo: number | null;
  runwayMeses: number | null;
  runwayMinimo: number;
}

export interface ResultadoEje {
  eje: EjeMadurez;
  nombre: string;
  /** De 0 a 100, o null si no hay con qué medirlo */
  valor: number | null;
  peso: number;
  /** Por qué sale ese número, para poder discutirlo */
  motivo: string;
}

export interface Madurez {
  /** De 0 a 100 sobre los ejes medidos, o null si no hay ninguno */
  valor: number | null;
  ejes: ResultadoEje[];
  sinMedir: string[];
  /** Cuánto del peso total está realmente medido */
  cobertura: number;
}

function recortar(valor: number): number {
  return Math.max(0, Math.min(100, Math.round(valor * 10) / 10));
}

export function calcularMadurez(
  entrada: EntradaMadurez,
  pesos: PesosMadurez = PESOS_MADUREZ,
): Madurez {
  const ejes: ResultadoEje[] = [
    {
      eje: "tecnologia",
      nombre: NOMBRES_EJE.tecnologia,
      peso: pesos.tecnologia,
      valor: entrada.scoreTecnico === null ? null : recortar(entrada.scoreTecnico),
      motivo:
        entrada.scoreTecnico === null
          ? "Due diligence técnico sin terminar"
          : "Score técnico frente al objetivo de su etapa",
    },
    {
      eje: "gobierno",
      nombre: NOMBRES_EJE.gobierno,
      peso: pesos.gobierno,
      valor:
        entrada.scorePreparacion === null
          ? null
          : recortar(entrada.scorePreparacion),
      motivo:
        entrada.scorePreparacion === null
          ? "Sin checklist de due diligence"
          : "Score de preparación",
    },
    {
      eje: "plan",
      nombre: NOMBRES_EJE.plan,
      peso: pesos.plan,
      /*
       * Se mide contra los hitos que ya tocaban, no contra todos.
       *
       * Si se midiera contra el total, un proyecto que va perfecto en su
       * primer mes puntuaría bajísimo solo por tener el plan por delante, y
       * la madurez bajaría cada vez que se alarga la hoja de ruta.
       */
      valor:
        entrada.hitosExigibles === 0
          ? null
          : recortar((entrada.hitosCumplidos / entrada.hitosExigibles) * 100),
      motivo:
        entrada.hitosExigibles === 0
          ? "Todavía no vencía ningún hito"
          : `${entrada.hitosCumplidos} de ${entrada.hitosExigibles} hitos ya exigibles`,
    },
    {
      eje: "traccion",
      nombre: NOMBRES_EJE.traccion,
      peso: pesos.traccion,
      valor:
        entrada.mrr === null || entrada.mrrObjetivo === null || entrada.mrrObjetivo <= 0
          ? null
          : recortar((entrada.mrr / entrada.mrrObjetivo) * 100),
      motivo:
        entrada.mrr === null
          ? "Sin ingreso recurrente cargado"
          : entrada.mrrObjetivo === null || entrada.mrrObjetivo <= 0
            ? "Sin objetivo de ingreso para su etapa"
            : "Ingreso recurrente frente al objetivo de su etapa",
    },
    {
      eje: "solidez",
      nombre: NOMBRES_EJE.solidez,
      peso: pesos.solidez,
      valor:
        entrada.runwayMeses === null || entrada.runwayMinimo <= 0
          ? null
          : recortar((entrada.runwayMeses / entrada.runwayMinimo) * 100),
      motivo:
        entrada.runwayMeses === null
          ? "Sin caja ni consumo cargados"
          : `Runway de ${entrada.runwayMeses} meses sobre el mínimo de ${entrada.runwayMinimo}`,
    },
  ];

  const medidos = ejes.filter((e) => e.valor !== null && e.peso > 0);
  const pesoMedido = medidos.reduce((t, e) => t + e.peso, 0);
  const pesoTotal = ejes.reduce((t, e) => t + e.peso, 0);

  return {
    /*
     * Se reparte sobre el peso medido, no sobre el total.
     *
     * Si se dividiera entre el total, un eje sin datos contaría como un cero y
     * un proyecto sin evaluar parecería inmaduro en vez de no evaluado. Es la
     * misma regla que en el score técnico.
     */
    valor:
      pesoMedido === 0
        ? null
        : Math.round(
            (medidos.reduce((t, e) => t + e.valor! * e.peso, 0) / pesoMedido) * 10,
          ) / 10,
    ejes,
    sinMedir: ejes.filter((e) => e.valor === null).map((e) => e.nombre),
    cobertura: pesoTotal === 0 ? 0 : Math.round((pesoMedido / pesoTotal) * 100),
  };
}
