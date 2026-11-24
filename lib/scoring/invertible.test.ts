import { describe, expect, it } from "vitest";
import { calcularSemaforo, estadoInvertible, evaluarInvertible } from "./invertible";
import { calcularScoreTecnico } from "./score-tecnico";
import { calcularScorePreparacion } from "./score-preparacion";
import type { EntradaInvertible } from "./tipos";

function entradaLimpia(): EntradaInvertible {
  const scoreTecnico = calcularScoreTecnico([
    { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 3, nivel: 3 },
    { codigo: "codigo_calidad", nombre: "Código", peso: 1, objetivo: 2, nivel: 2 },
  ]);

  const scorePreparacion = calcularScorePreparacion(
    [
      {
        codigo: "financiero",
        nombre: "Financiero",
        peso: 1,
        puntos: [{ codigo: "a", estado: "validado", obligatorio: true }],
      },
    ],
    scoreTecnico,
    2,
  );

  return {
    scoreTecnico,
    scorePreparacion,
    hallazgosAbiertos: [],
    hitos: [
      {
        id: "h1",
        titulo: "Tres clientes de pago",
        estado: "cumplido",
        condicionaInvertible: true,
      },
    ],
    runwayMeses: 12,
  };
}

describe("evaluarInvertible", () => {
  it("marca invertible cuando se cumple todo", () => {
    const resultado = evaluarInvertible(entradaLimpia());

    expect(resultado.invertible).toBe(true);
    expect(resultado.siguientesPasos).toEqual([]);
  });

  /** Criterio de aceptación §11 */
  it("un hallazgo crítico abierto impide el estado invertible", () => {
    const entrada = entradaLimpia();
    entrada.hallazgosAbiertos = [
      {
        id: "f1",
        severidad: "critico",
        titulo: "Credencial de producción en el historial de git",
        origen: "tecnico",
      },
    ];

    const resultado = evaluarInvertible(entrada);

    expect(resultado.invertible).toBe(false);
    expect(resultado.siguientesPasos[0].texto).toBe(
      "Resolver el hallazgo crítico: Credencial de producción en el historial de git",
    );
  });

  it("un hallazgo de severidad alta no bloquea, solo los críticos", () => {
    const entrada = entradaLimpia();
    entrada.hallazgosAbiertos = [
      { id: "f2", severidad: "alto", titulo: "Sin copias probadas", origen: "tecnico" },
    ];

    expect(evaluarInvertible(entrada).invertible).toBe(true);
  });

  it("no da por invertible una evaluación técnica a medias", () => {
    const entrada = entradaLimpia();
    entrada.scoreTecnico = calcularScoreTecnico([
      { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 3, nivel: 3 },
      { codigo: "hardware", nombre: "Hardware", peso: 1, objetivo: 2, nivel: null },
    ]);

    const resultado = evaluarInvertible(entrada);

    expect(resultado.invertible).toBe(false);
    expect(resultado.siguientesPasos.map((p) => p.texto)).toContain(
      "Completar la puntuación de la dimensión técnica que queda sin evaluar",
    );
  });

  it("exige los hitos del Anexo que condicionan el estado", () => {
    const entrada = entradaLimpia();
    entrada.hitos = [
      {
        id: "h1",
        titulo: "Tres clientes de pago",
        estado: "en_curso",
        condicionaInvertible: true,
      },
      {
        id: "h2",
        titulo: "Web renovada",
        estado: "pendiente",
        condicionaInvertible: false,
      },
    ];

    const resultado = evaluarInvertible(entrada);

    expect(resultado.invertible).toBe(false);
    expect(resultado.siguientesPasos.map((p) => p.texto)).toEqual([
      "Cumplir el hito del Anexo: Tres clientes de pago",
    ]);
  });

  it("señala el runway por debajo del mínimo", () => {
    const entrada = entradaLimpia();
    entrada.runwayMeses = 3;

    const resultado = evaluarInvertible(entrada);

    expect(resultado.invertible).toBe(false);
    expect(resultado.siguientesPasos.map((p) => p.texto)).toContain(
      "Llevar el runway de 3 a 6 meses",
    );
  });

  it("redacta lo que falta como siguiente paso, no como reproche", () => {
    const entrada = entradaLimpia();
    entrada.runwayMeses = 2;
    entrada.hallazgosAbiertos = [
      { id: "f1", severidad: "critico", titulo: "Sin cesión de derechos del código", origen: "tecnico" },
    ];

    for (const { texto: paso } of evaluarInvertible(entrada).siguientesPasos) {
      expect(paso).toMatch(/^(Resolver|Completar|Subir|Desbloquear|Cumplir|Llevar)/);
      expect(paso).not.toMatch(/pendiente de corregir|ayuda|apoyo/i);
    }
  });
});

describe("calcularSemaforo", () => {
  it("rojo con hallazgo crítico abierto", () => {
    const entrada = entradaLimpia();
    entrada.hallazgosAbiertos = [
      { id: "f1", severidad: "critico", titulo: "Secreto en el repositorio", origen: "tecnico" },
    ];

    expect(calcularSemaforo(entrada)).toEqual({
      estado: "rojo",
      motivo: "Un hallazgo crítico abierto",
    });
  });

  it("rojo con runway por debajo del mínimo", () => {
    const entrada = entradaLimpia();
    entrada.runwayMeses = 4;

    expect(calcularSemaforo(entrada).estado).toBe("rojo");
  });

  it("ámbar con hitos retrasados", () => {
    const entrada = entradaLimpia();
    entrada.hitos = [
      { id: "h1", titulo: "Piloto cerrado", estado: "retrasado", condicionaInvertible: true },
    ];

    expect(calcularSemaforo(entrada)).toEqual({
      estado: "ambar",
      motivo: "Un hito retrasado",
    });
  });

  it("verde sin incidencias", () => {
    expect(calcularSemaforo(entradaLimpia())).toEqual({
      estado: "verde",
      motivo: "Sin incidencias abiertas",
    });
  });

  it("siempre devuelve motivo en texto, nunca solo color", () => {
    const entrada = entradaLimpia();
    const { motivo } = calcularSemaforo(entrada);
    expect(motivo.length).toBeGreaterThan(0);
  });

  it("cada paso dice en qué sección se hace", () => {
    /*
     * Eran frases sueltas que no llevaban a ninguna parte: se leían y había
     * que buscar a mano dónde actuar. Si alguien añade un paso nuevo y se
     * olvida de la sección, esto lo para.
     */
    const entrada = entradaLimpia();
    entrada.hallazgosAbiertos = [
      {
        id: "f9",
        severidad: "critico",
        titulo: "Secretos en el repositorio",
        origen: "tecnico",
      },
    ];
    entrada.scoreTecnico.completo = false;
    entrada.scoreTecnico.sinEvaluar = ["seguridad"];

    const pasos = evaluarInvertible(entrada).siguientesPasos;

    expect(pasos.length).toBeGreaterThan(0);
    for (const paso of pasos) {
      expect(["tecnico", "diligencia", "programa", "kpi", "ruta"]).toContain(
        paso.seccion,
      );
    }
  });
});

/**
 * Invertible con la regla del 23 nov (REVISION, 24 nov): «Sí» solo
 * graduada; antes, cuántos hitos marcados lleva validados. Los umbrales de
 * antes se quedan como señales recomendadas.
 */
describe("estadoInvertible", () => {
  const hitos = [
    { id: "a", titulo: "Clientes que repiten", estado: "cumplido" as const, condicionaInvertible: true },
    { id: "b", titulo: "Data room completo", estado: "pendiente" as const, condicionaInvertible: true },
    { id: "c", titulo: "Un hito propio", estado: "cumplido" as const, condicionaInvertible: false },
  ];

  it("sin graduar, cuenta solo los hitos marcados", () => {
    expect(estadoInvertible({ graduada: false, hitos })).toEqual({
      invertible: false,
      marcados: 2,
      validados: 1,
      texto: "1 de 2 hitos",
    });
  });

  it("con todos validados, todavía no es invertible: falta que dirección la gradúe", () => {
    const todos = hitos.map((h) => ({ ...h, estado: "cumplido" as const }));
    expect(estadoInvertible({ graduada: false, hitos: todos }).invertible).toBe(false);
  });

  it("graduada, sí", () => {
    expect(estadoInvertible({ graduada: true, hitos })).toMatchObject({ invertible: true, texto: "Sí" });
  });

  it("sin hitos marcados lo dice", () => {
    expect(estadoInvertible({ graduada: false, hitos: [] }).texto).toBe("Sin hitos marcados");
  });
});

describe("los pasos: de invertible o recomendados", () => {
  it("solo los hitos marcados son de invertible; scores y runway, recomendados, con coma decimal", () => {
    const entrada = entradaLimpia();
    entrada.hitos[0].estado = "pendiente";
    entrada.scorePreparacion.valor = 26.7;
    entrada.runwayMeses = 3.9;
    const pasos = evaluarInvertible(entrada).siguientesPasos;

    const hito = pasos.find((p) => p.texto.startsWith("Cumplir el hito del Anexo"));
    expect(hito?.paraInvertible).toBe(true);
    for (const p of pasos.filter((p) => p !== hito)) expect(p.paraInvertible, p.texto).toBe(false);

    expect(pasos.map((p) => p.texto)).toContain("Subir el score de preparación de 26,7 a 80");
    expect(pasos.map((p) => p.texto)).toContain("Llevar el runway de 3,9 a 6 meses");
  });
});
