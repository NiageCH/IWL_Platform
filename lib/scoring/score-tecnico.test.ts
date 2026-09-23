import { describe, expect, it } from "vitest";
import {
  calcularScoreTecnico,
  dimensionesPorPrioridad,
} from "./score-tecnico";
import type { DimensionTecnica, NivelMadurez } from "./tipos";

/**
 * Objetivos tomados de los datos semilla, para que el test falle si alguien
 * cambia la configuración sin querer.
 */
const OBJETIVOS = {
  arquitectura_producto: { pre_semilla: 1, semilla: 2, serie_a: 3 },
  seguridad: { pre_semilla: 2, semilla: 3, serie_a: 4 },
  codigo_calidad: { pre_semilla: 1, semilla: 2, serie_a: 3 },
} as const;

function dim(
  codigo: keyof typeof OBJETIVOS,
  etapa: "pre_semilla" | "semilla" | "serie_a",
  nivel: NivelMadurez | null,
  peso = 1,
): DimensionTecnica {
  return {
    codigo,
    nombre: codigo,
    peso,
    objetivo: OBJETIVOS[codigo][etapa] as NivelMadurez,
    nivel,
  };
}

describe("calcularScoreTecnico", () => {
  it("da 100 cuando cada dimensión alcanza el objetivo de su etapa", () => {
    const score = calcularScoreTecnico([
      dim("arquitectura_producto", "semilla", 2),
      dim("seguridad", "semilla", 3),
      dim("codigo_calidad", "semilla", 2),
    ]);

    expect(score.valor).toBe(100);
    expect(score.completo).toBe(true);
  });

  it("no premia superar el objetivo", () => {
    const enObjetivo = calcularScoreTecnico([
      dim("arquitectura_producto", "pre_semilla", 1),
    ]);
    const muyPorEncima = calcularScoreTecnico([
      dim("arquitectura_producto", "pre_semilla", 4),
    ]);

    expect(enObjetivo.valor).toBe(100);
    expect(muyPorEncima.valor).toBe(100);
  });

  /**
   * Criterio de aceptación §11: el score técnico cambia al cambiar la etapa de
   * la compañía, porque cambia el nivel objetivo. Las puntuaciones son las
   * mismas en los tres casos.
   */
  it("baja al subir de etapa sin tocar las puntuaciones", () => {
    const niveles: Array<[keyof typeof OBJETIVOS, NivelMadurez]> = [
      ["arquitectura_producto", 2],
      ["seguridad", 3],
      ["codigo_calidad", 2],
    ];

    const preSemilla = calcularScoreTecnico(
      niveles.map(([c, n]) => dim(c, "pre_semilla", n)),
    );
    const semilla = calcularScoreTecnico(
      niveles.map(([c, n]) => dim(c, "semilla", n)),
    );
    const serieA = calcularScoreTecnico(
      niveles.map(([c, n]) => dim(c, "serie_a", n)),
    );

    expect(preSemilla.valor).toBe(100);
    expect(semilla.valor).toBe(100);
    // serie A: arquitectura 2/3, seguridad 3/4, código 2/3 con pesos iguales
    expect(serieA.valor).toBeLessThan(100);
    expect(serieA.valor).toBe(
      redondear(((2 / 3 + 3 / 4 + 2 / 3) / 3) * 100),
    );
  });

  it("no penaliza las dimensiones que no aplican, que llevan peso cero", () => {
    const conIaApagada = calcularScoreTecnico([
      dim("arquitectura_producto", "semilla", 2),
      { codigo: "ia_modelos", nombre: "IA", peso: 0, objetivo: 2, nivel: null },
    ]);

    expect(conIaApagada.valor).toBe(100);
    expect(conIaApagada.completo).toBe(true);
    expect(conIaApagada.sinEvaluar).toEqual([]);
  });

  it("cuenta como cero una dimensión aplicable sin puntuar y lo marca", () => {
    const score = calcularScoreTecnico([
      dim("arquitectura_producto", "semilla", 2),
      dim("seguridad", "semilla", null),
    ]);

    expect(score.completo).toBe(false);
    expect(score.sinEvaluar).toEqual(["seguridad"]);
    expect(score.valor).toBe(50);
  });

  it("da cobertura completa cuando la etapa no exige nada en esa dimensión", () => {
    const score = calcularScoreTecnico([
      {
        codigo: "escalabilidad_rendimiento",
        nombre: "Escalabilidad",
        peso: 1,
        objetivo: 0,
        nivel: 0,
      },
    ]);

    expect(score.valor).toBe(100);
  });

  it("pondera por el peso de cada dimensión", () => {
    // Seguridad pesa el doble y está a cero; arquitectura está en objetivo
    const score = calcularScoreTecnico([
      dim("arquitectura_producto", "semilla", 2, 1),
      dim("seguridad", "semilla", 0, 2),
    ]);

    expect(score.valor).toBe(redondear((1 / 3) * 100));
  });

  it("devuelve cero si ninguna dimensión aplica", () => {
    const score = calcularScoreTecnico([
      { codigo: "hardware", nombre: "Hardware", peso: 0, objetivo: 2, nivel: null },
    ]);

    expect(score.valor).toBe(0);
    expect(score.completo).toBe(false);
  });
});

describe("dimensionesPorPrioridad", () => {
  it("ordena por lo que más aporta cerrar: peso por brecha", () => {
    const score = calcularScoreTecnico([
      dim("arquitectura_producto", "serie_a", 2, 1), // brecha 1, peso 1 → 1
      dim("seguridad", "serie_a", 1, 2), // brecha 3, peso 2 → 6
      dim("codigo_calidad", "serie_a", 3, 5), // brecha 0, fuera
    ]);

    const orden = dimensionesPorPrioridad(score).map((d) => d.codigo);
    expect(orden).toEqual(["seguridad", "arquitectura_producto"]);
  });
});

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}
