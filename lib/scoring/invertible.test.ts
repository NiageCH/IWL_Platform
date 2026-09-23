import { describe, expect, it } from "vitest";
import { calcularSemaforo, evaluarInvertible } from "./invertible";
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
    expect(resultado.siguientesPasos[0]).toBe(
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
    expect(resultado.siguientesPasos).toContain(
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
    expect(resultado.siguientesPasos).toEqual([
      "Cumplir el hito del Anexo: Tres clientes de pago",
    ]);
  });

  it("señala el runway por debajo del mínimo", () => {
    const entrada = entradaLimpia();
    entrada.runwayMeses = 3;

    const resultado = evaluarInvertible(entrada);

    expect(resultado.invertible).toBe(false);
    expect(resultado.siguientesPasos).toContain(
      "Llevar el runway de 3 a 6 meses",
    );
  });

  it("redacta lo que falta como siguiente paso, no como reproche", () => {
    const entrada = entradaLimpia();
    entrada.runwayMeses = 2;
    entrada.hallazgosAbiertos = [
      { id: "f1", severidad: "critico", titulo: "Sin cesión de derechos del código", origen: "tecnico" },
    ];

    for (const paso of evaluarInvertible(entrada).siguientesPasos) {
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
});
