/**
 * Los cinco estados de la plataforma.
 *
 * Un solo lenguaje para los tres públicos —fundadora, IWL y mentor— y para
 * todo lo que tiene estado: hitos, tareas, puntos de due diligence,
 * secciones del plan, updates, KPI, hallazgos y tramos de la hoja de ruta.
 * Antes cada pantalla elegía su tono: el due diligence sacaba una etiqueta
 * gris, el hito una palabra sin color y la compañía un semáforo de tres
 * luces. Tres vocabularios para la misma pregunta.
 *
 * Aquí está la traducción, y solo aquí. Ninguna pantalla decide un color
 * por su cuenta: pide el estado a esta función y lo pinta con `<Estado>`.
 *
 * Las reglas son del documento de estados visuales (v1, 30 oct 2026).
 */

export type EstadoVisual =
  | "hecho"
  | "curso"
  | "pendiente"
  | "atencion"
  | "vencido"
  | "no_aplica";

/**
 * El nombre de cada estado, que va **siempre** junto al color.
 *
 * El color ayuda a encontrar; nunca es la única señal. Con la pantalla en
 * escala de grises cada estado se sigue distinguiendo por su palabra y por
 * su icono, que es el criterio de aceptación.
 */
export const ESTADOS: Record<EstadoVisual, { nombre: string; orden: number }> = {
  // `orden` es la gravedad, para poder sacar el peor de un conjunto
  hecho: { nombre: "Hecho", orden: 1 },
  curso: { nombre: "En curso", orden: 3 },
  pendiente: { nombre: "Por hacer", orden: 2 },
  atencion: { nombre: "Atención", orden: 4 },
  vencido: { nombre: "Vencido", orden: 5 },
  no_aplica: { nombre: "No aplica", orden: 0 },
};

/** Los cinco que se enseñan en la leyenda. «No aplica» no es un estado de trabajo */
export const CINCO: EstadoVisual[] = [
  "hecho",
  "curso",
  "pendiente",
  "atencion",
  "vencido",
];

/** Cuántos días antes de la fecha una cosa pasa a «Atención» */
export const DIAS_DE_AVISO = 7;

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Qué dice una fecha límite sobre algo que todavía no está hecho.
 *
 * `null` cuando no hay fecha o cuando queda tiempo de sobra: entonces el
 * estado lo decide el propio dato, no el calendario.
 */
function porFecha(limite: string | null | undefined, hoy: string): EstadoVisual | null {
  if (!limite) return null;
  if (limite < hoy) return "vencido";

  const aviso = new Date(`${hoy}T00:00:00Z`);
  aviso.setUTCDate(aviso.getUTCDate() + DIAS_DE_AVISO);
  return limite <= aviso.toISOString().slice(0, 10) ? "atencion" : null;
}

/**
 * Las filas que sabe traducir, una por tipo de cosa.
 *
 * Cada una pide lo mínimo para decidir, no la fila entera de la base: así
 * la traducción se puede probar sin montar una compañía, y una pantalla que
 * lee campos distintos sigue pudiendo llamarla.
 */
export interface Filas {
  hito: { estado: string; fecha?: string | null };
  /** También los pasos de un hito, que son tareas con otro nombre */
  tarea: { estado: string; fecha?: string | null };
  punto_dd: {
    estado: string;
    caducado?: boolean;
    vence?: string | null;
  };
  seccion_bp: {
    estado: string;
    comentariosSinResponder?: number;
    fecha?: string | null;
  };
  update: {
    /** `null` cuando el mes todavía no se ha abierto */
    estado: string | null;
    /** El último día para entregarlo */
    fecha?: string | null;
  };
  kpi: {
    valor: number | null;
    objetivo?: number | null;
    /** `baja_mejor` invierte qué lado del objetivo es el malo */
    direccion?: string | null;
  };
  hallazgo: { severidad: string; estado: string };
  etapa: { estado: string; fin?: string | null };
  /** Una compañía toma el peor estado de lo que tiene abierto */
  compania: { estados: EstadoVisual[] };
}

/**
 * De un estado de la base al estado visual que le toca.
 *
 * `hoy` se pasa en las pruebas. Las fechas de la semilla corren contra el
 * calendario, así que una prueba que dependa del día de hoy deja de
 * comprobar lo que dice en cuanto pasa una semana.
 */
export function estadoVisual<E extends keyof Filas>(
  entidad: E,
  fila: Filas[E],
  hoy: string = hoyISO(),
): EstadoVisual {
  switch (entidad) {
    case "hito": {
      const f = fila as Filas["hito"];
      if (f.estado === "cumplido") return "hecho";
      if (f.estado === "retrasado") return "vencido";
      return porFecha(f.fecha, hoy) ?? (f.estado === "en_curso" ? "curso" : "pendiente");
    }

    case "tarea": {
      const f = fila as Filas["tarea"];
      if (f.estado === "hecha") return "hecho";
      if (f.estado === "descartada") return "no_aplica";
      /*
       * Bloqueada es vencido, no «por hacer»: una tarea bloqueada no avanza
       * y alguien tiene que desbloquearla. Mismo criterio que un punto de
       * due diligence bloqueante.
       */
      if (f.estado === "bloqueada") return "vencido";
      return porFecha(f.fecha, hoy) ?? (f.estado === "en_curso" ? "curso" : "pendiente");
    }

    case "punto_dd": {
      const f = fila as Filas["punto_dd"];
      /*
       * Un documento caducado es vencido, aunque en base siga validado.
       *
       * Hasta ahora se enseñaba como pendiente, que es lo que hace el
       * cálculo del score. Para el score sigue siendo así —no cuenta—,
       * pero en pantalla no es lo mismo: un punto que nadie ha entregado
       * todavía y uno cuya escritura caducó la semana pasada piden cosas
       * distintas.
       */
      if (f.caducado) return "vencido";
      if (f.estado === "validado") return "hecho";
      if (f.estado === "bloqueante") return "vencido";
      if (f.estado === "entregado" || f.estado === "en_revision") return "curso";
      return porFecha(f.vence, hoy) ?? "pendiente";
    }

    case "seccion_bp": {
      const f = fila as Filas["seccion_bp"];
      if (f.estado === "validada") return "hecho";
      if ((f.comentariosSinResponder ?? 0) > 0) return "atencion";
      if (f.estado === "en_revision") return "curso";
      return porFecha(f.fecha, hoy) ?? "pendiente";
    }

    case "update": {
      const f = fila as Filas["update"];
      if (f.estado === "revisado") return "hecho";
      if (f.estado === "entregado") return "curso";
      /*
       * Borrador, o sin fila porque el mes no se ha abierto todavía. Hasta
       * que no vence no es un reproche: la pantalla dice lo que falta, no
       * lo que se ha hecho mal.
       */
      return porFecha(f.fecha, hoy) ?? "pendiente";
    }

    case "kpi": {
      const f = fila as Filas["kpi"];
      if (f.valor === null) return "pendiente";
      if (f.objetivo === null || f.objetivo === undefined) return "curso";

      /*
       * «Por debajo del objetivo» depende de lo que persiga el indicador:
       * en la quema mensual, pasarse por arriba es lo malo. Sin esto, la
       * mitad de los KPI saldrían en rojo por mejorar.
       */
      const bajaMejor = f.direccion === "baja_mejor";
      const desvio = bajaMejor
        ? (f.valor - f.objetivo) / Math.abs(f.objetivo || 1)
        : (f.objetivo - f.valor) / Math.abs(f.objetivo || 1);

      if (desvio <= 0) return "hecho";
      return desvio > 0.2 ? "vencido" : "atencion";
    }

    case "hallazgo": {
      const f = fila as Filas["hallazgo"];
      if (f.estado === "resuelto") return "hecho";
      // Un riesgo aceptado por escrito deja de ser trabajo pendiente
      if (f.estado === "aceptado") return "no_aplica";
      if (f.severidad === "critico") return "vencido";
      if (f.severidad === "alto") return "atencion";
      return f.estado === "en_curso" ? "curso" : "pendiente";
    }

    case "etapa": {
      const f = fila as Filas["etapa"];
      if (f.estado === "completada") return "hecho";
      if (f.estado === "cancelada") return "no_aplica";
      return porFecha(f.fin, hoy) ?? (f.estado === "en_curso" ? "curso" : "pendiente");
    }

    case "compania": {
      const f = fila as Filas["compania"];
      return peor(f.estados);
    }
  }

  return "pendiente";
}

/**
 * El peor de un conjunto.
 *
 * Para la fila de una compañía en la cartera y para el resumen de un
 * bloque: lo que manda es lo que está peor, no la media. Una media de
 * veintinueve puntos esconde justo el que está en rojo.
 */
export function peor(estados: EstadoVisual[]): EstadoVisual {
  let elegido: EstadoVisual = "hecho";
  for (const e of estados) {
    if (ESTADOS[e].orden > ESTADOS[elegido].orden) elegido = e;
  }
  return estados.length === 0 ? "no_aplica" : elegido;
}

/**
 * Cuántos hay de cada estado, en el orden de la leyenda.
 *
 * Es lo que lee el rótulo de una barra segmentada: «18 hechos · 4 en curso
 * · 7 por hacer», que es la frase que hoy no está en ninguna parte.
 */
export function recuento(
  estados: EstadoVisual[],
): Array<{ estado: EstadoVisual; total: number }> {
  return [...CINCO, "no_aplica" as const]
    .map((estado) => ({
      estado,
      total: estados.filter((e) => e === estado).length,
    }))
    .filter((r) => r.total > 0);
}
