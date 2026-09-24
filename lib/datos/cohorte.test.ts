import { describe, expect, it } from "vitest";
import {
  bandaDe,
  embudo,
  evolucionCohorte,
  lecturaDeCohorte,
  mapaIntervencion,
} from "./cohorte";
import type { Banda } from "./cohorte";
import { calcularScoreTecnico } from "@/lib/scoring/score-tecnico";
import { calcularScorePreparacion } from "@/lib/scoring/score-preparacion";
import { evaluarInvertible, calcularSemaforo } from "@/lib/scoring/invertible";
import type { ResumenCompania } from "./compania";

const BANDAS: Banda[] = [
  { codigo: "inicio", nombre: "Inicio", desde: 0, hasta: 40 },
  { codigo: "en_desarrollo", nombre: "En desarrollo", desde: 40, hasta: 65 },
  { codigo: "consolidada", nombre: "Consolidada", desde: 65, hasta: 85 },
  { codigo: "preparada", nombre: "Preparada", desde: 85, hasta: 100 },
];

/** Compañía mínima con lo que necesitan las funciones de cohorte */
function compania(
  nombre: string,
  slug: string,
  dimensiones: Array<{ codigo: string; nombre: string; peso: number; objetivo: 0 | 1 | 2 | 3 | 4; nivel: 0 | 1 | 2 | 3 | 4 | null }>,
  valorPreparacion: number,
): NonNullable<ResumenCompania> {
  const scoreTecnico = calcularScoreTecnico(dimensiones);

  // Un área única cuyo valor se ajusta para dar el score de preparación buscado
  const scorePreparacion = calcularScorePreparacion(
    [
      {
        codigo: "financiero",
        nombre: "Financiero",
        peso: 1,
        puntos: [{ codigo: "a", estado: "validado", obligatorio: true }],
      },
    ],
    null,
    0,
  );
  scorePreparacion.valor = valorPreparacion;

  const entrada = {
    scoreTecnico,
    scorePreparacion,
    hallazgosAbiertos: [],
    hitos: [],
    runwayMeses: 12,
  };

  return {
    compania: { id: slug, name: nombre, slug } as never,
    permisos: {} as never,
    scoreTecnico,
    scorePreparacion,
    hallazgos: [],
    kpis: {} as never,
    semaforo: calcularSemaforo(entrada),
    invertible: evaluarInvertible(entrada),
  } as NonNullable<ResumenCompania>;
}

describe("bandaDe", () => {
  it("coloca cada valor en su tramo", () => {
    expect(bandaDe(0, BANDAS).codigo).toBe("inicio");
    expect(bandaDe(39.9, BANDAS).codigo).toBe("inicio");
    expect(bandaDe(40, BANDAS).codigo).toBe("en_desarrollo");
    expect(bandaDe(64.9, BANDAS).codigo).toBe("en_desarrollo");
    expect(bandaDe(65, BANDAS).codigo).toBe("consolidada");
    expect(bandaDe(85, BANDAS).codigo).toBe("preparada");
  });

  it("el extremo superior entra en la última banda", () => {
    expect(bandaDe(100, BANDAS).codigo).toBe("preparada");
  });
});

describe("mapaIntervencion", () => {
  /**
   * Lo que decide el orden es cuánto rinde cerrar la brecha, no cuántas
   * compañías la tienen: una brecha grande donde el peso es alto rinde más
   * que dos pequeñas donde pesa poco.
   */
  it("ordena por demanda acumulada, no por número de compañías", () => {
    const a = compania("A", "a", [
      { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 4, nivel: 1 },
      { codigo: "codigo_calidad", nombre: "Código", peso: 1, objetivo: 2, nivel: 1 },
    ], 50);

    const b = compania("B", "b", [
      { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 4, nivel: 4 },
      { codigo: "codigo_calidad", nombre: "Código", peso: 1, objetivo: 2, nivel: 1 },
    ], 60);

    const mapa = mapaIntervencion([a, b]);

    // seguridad: una compañía, 2 × 3 = 6. código: dos compañías, 1 × 1 × 2 = 2
    expect(mapa[0].codigo).toBe("seguridad");
    expect(mapa[0].demanda).toBe(6);
    expect(mapa[0].companias).toHaveLength(1);

    expect(mapa[1].codigo).toBe("codigo_calidad");
    expect(mapa[1].companias).toHaveLength(2);
  });

  it("deja fuera las dimensiones que ya están en objetivo", () => {
    const a = compania("A", "a", [
      { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 3, nivel: 3 },
    ], 90);

    expect(mapaIntervencion([a])).toEqual([]);
  });

  it("nombra las compañías que afecta, de mayor brecha a menor", () => {
    const a = compania("A", "a", [
      { codigo: "seguridad", nombre: "Seguridad", peso: 1, objetivo: 4, nivel: 1 },
    ], 50);
    const b = compania("B", "b", [
      { codigo: "seguridad", nombre: "Seguridad", peso: 1, objetivo: 4, nivel: 3 },
    ], 50);

    const [dimension] = mapaIntervencion([b, a]);
    expect(dimension.companias.map((c) => c.nombre)).toEqual(["A", "B"]);
  });
});

describe("embudo", () => {
  it("reparte las compañías por banda", () => {
    const companias = [
      compania("Baja", "baja", [], 12),
      compania("Media", "media", [], 55),
      compania("Alta", "alta", [], 92),
    ];

    const tramos = embudo(companias, BANDAS);

    expect(tramos.map((t) => t.companias.length)).toEqual([1, 1, 0, 1]);
    expect(tramos[0].companias[0].nombre).toBe("Baja");
    expect(tramos[3].companias[0].nombre).toBe("Alta");
  });
});

describe("lecturaDeCohorte", () => {
  it("resume avance, dónde intervenir y cuántas están listas", () => {
    const a = compania("A", "a", [
      { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 3, nivel: 1 },
    ], 50);

    const frase = lecturaDeCohorte(
      [a],
      new Map([["a", { deltaPreparacion: 12.5 }]]),
      mapaIntervencion([a]),
      2,
    );

    expect(frase).toContain("avanza 12,5 puntos");
    expect(frase).toContain("seguridad");
    expect(frase).toContain("objetivo de 2");
  });

  it("dice el retroceso sin suavizarlo", () => {
    const a = compania("A", "a", [], 50);

    const frase = lecturaDeCohorte(
      [a],
      new Map([["a", { deltaPreparacion: -6 }]]),
      [],
      null,
    );

    expect(frase).toContain("retrocede 6 puntos");
  });

  it("aguanta una cohorte vacía", () => {
    expect(lecturaDeCohorte([], new Map(), [], null)).toContain("No hay compañías");
  });
});

describe("evolucionCohorte", () => {
  /**
   * Dos compañías medidas con días de diferencia son el mismo punto de la
   * serie. Si no se agrupara, el eje repetiría el mes.
   */
  it("agrupa por mes, no por fecha exacta", () => {
    const serie = evolucionCohorte([
      { company_id: "a", taken_on: "2026-03-08", preparation_score: 20 },
      { company_id: "b", taken_on: "2026-03-27", preparation_score: 40 },
      { company_id: "a", taken_on: "2026-06-01", preparation_score: 60 },
    ]);

    expect(serie.map((p) => p.fecha)).toEqual(["2026-03-01", "2026-06-01"]);
    // En marzo, A vale 20 y B vale 40
    expect(serie[0]).toMatchObject({ media: 30, companias: 2 });
    // En junio, A ya vale 60 y B sigue en 40
    expect(serie[1]).toMatchObject({ media: 50, companias: 2 });
  });

  it("no cuenta a quien todavía no había entrado en el programa", () => {
    const serie = evolucionCohorte([
      { company_id: "a", taken_on: "2026-01-10", preparation_score: 10 },
      { company_id: "b", taken_on: "2026-05-10", preparation_score: 90 },
    ]);

    // En enero solo estaba A: la media es la suya, no una mezcla con quien
    // aún no existía
    expect(serie[0]).toMatchObject({ media: 10, companias: 1 });
    expect(serie[1]).toMatchObject({ media: 50, companias: 2 });
  });

  it("ignora las instantáneas sin score de preparación", () => {
    const serie = evolucionCohorte([
      { company_id: "a", taken_on: "2026-01-10", preparation_score: null },
      { company_id: "b", taken_on: "2026-01-11", preparation_score: 40 },
    ]);

    expect(serie[0]).toMatchObject({ media: 40, companias: 1 });
  });
});
