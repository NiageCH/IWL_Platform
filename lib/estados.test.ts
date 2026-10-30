import { describe, expect, it } from "vitest";
import { estadoVisual, peor, recuento } from "./estados";

/**
 * La traducción al lenguaje de estados.
 *
 * Todas las pruebas pasan `hoy` a mano. Las fechas de la semilla corren
 * contra el calendario y una prueba que dependa del día en que se ejecuta
 * deja de comprobar lo que dice en cuanto pasa una semana, sin que nadie se
 * entere.
 */

const HOY = "2026-10-30";
/** Dentro de la ventana de aviso de siete días */
const PRONTO = "2026-11-04";
/** Fuera de ella */
const LEJOS = "2026-12-15";
const AYER = "2026-10-29";

describe("hitos", () => {
  it("cumplido es hecho, aunque la fecha haya pasado", () => {
    expect(estadoVisual("hito", { estado: "cumplido", fecha: AYER }, HOY)).toBe(
      "hecho",
    );
  });

  it("pendiente con fecha pasada es vencido, lo diga o no la base", () => {
    expect(estadoVisual("hito", { estado: "pendiente", fecha: AYER }, HOY)).toBe(
      "vencido",
    );
  });

  it("vence dentro de siete días: atención", () => {
    expect(estadoVisual("hito", { estado: "pendiente", fecha: PRONTO }, HOY)).toBe(
      "atencion",
    );
  });

  it("el mismo día del plazo todavía es atención, no vencido", () => {
    expect(estadoVisual("hito", { estado: "pendiente", fecha: HOY }, HOY)).toBe(
      "atencion",
    );
  });

  it("fecha lejana: por hacer", () => {
    expect(estadoVisual("hito", { estado: "pendiente", fecha: LEJOS }, HOY)).toBe(
      "pendiente",
    );
  });

  it("en curso con fecha lejana es en curso", () => {
    expect(estadoVisual("hito", { estado: "en_curso", fecha: LEJOS }, HOY)).toBe(
      "curso",
    );
  });

  it("sin fecha, manda el estado de la base", () => {
    expect(estadoVisual("hito", { estado: "en_curso", fecha: null }, HOY)).toBe(
      "curso",
    );
  });
});

describe("tareas", () => {
  it("bloqueada es vencido: no avanza y alguien tiene que desbloquearla", () => {
    expect(estadoVisual("tarea", { estado: "bloqueada", fecha: LEJOS }, HOY)).toBe(
      "vencido",
    );
  });

  it("descartada no aplica", () => {
    expect(estadoVisual("tarea", { estado: "descartada" }, HOY)).toBe("no_aplica");
  });

  it("hecha es hecho aunque venciera", () => {
    expect(estadoVisual("tarea", { estado: "hecha", fecha: AYER }, HOY)).toBe(
      "hecho",
    );
  });
});

describe("puntos de due diligence", () => {
  it("validado es hecho", () => {
    expect(estadoVisual("punto_dd", { estado: "validado" }, HOY)).toBe("hecho");
  });

  it("caducado es vencido, aunque en base siga validado", () => {
    expect(
      estadoVisual("punto_dd", { estado: "validado", caducado: true }, HOY),
    ).toBe("vencido");
  });

  it("bloqueante es vencido", () => {
    expect(estadoVisual("punto_dd", { estado: "bloqueante" }, HOY)).toBe("vencido");
  });

  it("entregado y en revisión son en curso: está en manos de alguien", () => {
    expect(estadoVisual("punto_dd", { estado: "entregado" }, HOY)).toBe("curso");
    expect(estadoVisual("punto_dd", { estado: "en_revision" }, HOY)).toBe("curso");
  });

  it("pendiente que vence pronto pide atención", () => {
    expect(
      estadoVisual("punto_dd", { estado: "pendiente", vence: PRONTO }, HOY),
    ).toBe("atencion");
  });
});

describe("secciones del business plan", () => {
  it("validada es hecho", () => {
    expect(estadoVisual("seccion_bp", { estado: "validada" }, HOY)).toBe("hecho");
  });

  it("un comentario sin responder gana al estado de la sección", () => {
    expect(
      estadoVisual(
        "seccion_bp",
        { estado: "en_revision", comentariosSinResponder: 1 },
        HOY,
      ),
    ).toBe("atencion");
  });

  it("validada con un comentario sin responder sigue siendo hecho", () => {
    // Ya está cerrada: el comentario es sobre algo acordado
    expect(
      estadoVisual(
        "seccion_bp",
        { estado: "validada", comentariosSinResponder: 2 },
        HOY,
      ),
    ).toBe("hecho");
  });

  it("borrador sin tocar y con fecha pasada es vencido", () => {
    expect(
      estadoVisual("seccion_bp", { estado: "borrador", fecha: AYER }, HOY),
    ).toBe("vencido");
  });
});

describe("updates mensuales", () => {
  it("revisado es hecho y entregado es en curso", () => {
    expect(estadoVisual("update", { estado: "revisado" }, HOY)).toBe("hecho");
    expect(estadoVisual("update", { estado: "entregado" }, HOY)).toBe("curso");
  });

  it("un mes todavía sin abrir no es un reproche", () => {
    expect(estadoVisual("update", { estado: null, fecha: LEJOS }, HOY)).toBe(
      "pendiente",
    );
  });

  it("sin entregar y fuera de plazo es vencido", () => {
    expect(estadoVisual("update", { estado: "borrador", fecha: AYER }, HOY)).toBe(
      "vencido",
    );
  });
});

describe("KPI frente a objetivo", () => {
  it("sin dato es por hacer; sin objetivo, en curso", () => {
    expect(estadoVisual("kpi", { valor: null, objetivo: 100 }, HOY)).toBe(
      "pendiente",
    );
    expect(estadoVisual("kpi", { valor: 50, objetivo: null }, HOY)).toBe("curso");
  });

  it("en objetivo o por encima es hecho", () => {
    expect(estadoVisual("kpi", { valor: 120, objetivo: 100 }, HOY)).toBe("hecho");
    expect(estadoVisual("kpi", { valor: 100, objetivo: 100 }, HOY)).toBe("hecho");
  });

  it("hasta un 20 % por debajo pide atención; más, es vencido", () => {
    expect(estadoVisual("kpi", { valor: 85, objetivo: 100 }, HOY)).toBe("atencion");
    expect(estadoVisual("kpi", { valor: 70, objetivo: 100 }, HOY)).toBe("vencido");
  });

  it("cuando bajar es mejorar, el lado malo es el de arriba", () => {
    // Quema mensual: 8.000 contra un objetivo de 10.000 es estar bien
    expect(
      estadoVisual(
        "kpi",
        { valor: 8000, objetivo: 10000, direccion: "baja_mejor" },
        HOY,
      ),
    ).toBe("hecho");

    expect(
      estadoVisual(
        "kpi",
        { valor: 13000, objetivo: 10000, direccion: "baja_mejor" },
        HOY,
      ),
    ).toBe("vencido");
  });
});

describe("hallazgos", () => {
  it("resuelto es hecho y aceptado no aplica", () => {
    expect(estadoVisual("hallazgo", { severidad: "critico", estado: "resuelto" }, HOY)).toBe("hecho");
    expect(estadoVisual("hallazgo", { severidad: "alto", estado: "aceptado" }, HOY)).toBe("no_aplica");
  });

  it("abierto, la severidad decide", () => {
    expect(estadoVisual("hallazgo", { severidad: "critico", estado: "abierto" }, HOY)).toBe("vencido");
    expect(estadoVisual("hallazgo", { severidad: "alto", estado: "abierto" }, HOY)).toBe("atencion");
    expect(estadoVisual("hallazgo", { severidad: "medio", estado: "abierto" }, HOY)).toBe("pendiente");
    expect(estadoVisual("hallazgo", { severidad: "bajo", estado: "en_curso" }, HOY)).toBe("curso");
  });
});

describe("etapas de la hoja de ruta", () => {
  it("completada es hecho y cancelada no aplica", () => {
    expect(estadoVisual("etapa", { estado: "completada", fin: AYER }, HOY)).toBe("hecho");
    expect(estadoVisual("etapa", { estado: "cancelada" }, HOY)).toBe("no_aplica");
  });

  it("en curso con el cierre pasado es vencido, no en curso", () => {
    expect(estadoVisual("etapa", { estado: "en_curso", fin: AYER }, HOY)).toBe("vencido");
  });

  it("planificada y lejana es por hacer", () => {
    expect(estadoVisual("etapa", { estado: "planificada", fin: LEJOS }, HOY)).toBe("pendiente");
  });
});

describe("el peor de un conjunto", () => {
  it("una compañía toma lo que está peor, no la media", () => {
    expect(peor(["hecho", "hecho", "hecho", "vencido"])).toBe("vencido");
    expect(peor(["hecho", "atencion", "curso"])).toBe("atencion");
  });

  it("todo hecho es hecho; nada es «no aplica»", () => {
    expect(peor(["hecho", "hecho"])).toBe("hecho");
    expect(peor([])).toBe("no_aplica");
  });

  it("en curso pesa más que por hacer: hay algo en marcha", () => {
    expect(peor(["pendiente", "curso"])).toBe("curso");
  });

  it("la compañía se resuelve por el mismo camino", () => {
    expect(
      estadoVisual("compania", { estados: ["hecho", "curso", "vencido"] }, HOY),
    ).toBe("vencido");
  });
});

describe("recuento", () => {
  it("cuenta por estado y deja fuera los que no tienen ninguno", () => {
    expect(recuento(["hecho", "hecho", "vencido"])).toEqual([
      { estado: "hecho", total: 2 },
      { estado: "vencido", total: 1 },
    ]);
  });

  it("sale en el orden de la leyenda, no en el de aparición", () => {
    expect(recuento(["vencido", "hecho"]).map((r) => r.estado)).toEqual([
      "hecho",
      "vencido",
    ]);
  });
});
