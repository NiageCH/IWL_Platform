import { describe, expect, it } from "vitest";
import { calcularAreas, calcularScorePreparacion } from "./score-preparacion";
import { calcularScoreTecnico } from "./score-tecnico";
import type { AreaDd, PuntoDd } from "./tipos";

function punto(
  codigo: string,
  estado: PuntoDd["estado"],
  obligatorio = true,
  caducaEl: Date | null = null,
): PuntoDd {
  return { codigo, estado, obligatorio, caducaEl };
}

const AHORA = new Date("2026-09-23T00:00:00Z");

describe("calcularAreas", () => {
  it("da 100 cuando todos los puntos obligatorios están validados", () => {
    const areas: AreaDd[] = [
      {
        codigo: "financiero",
        nombre: "Financiero",
        peso: 1,
        puntos: [punto("a", "validado"), punto("b", "validado")],
      },
    ];

    expect(calcularAreas(areas, AHORA)[0].valor).toBe(100);
  });

  it("reconoce el trabajo entregado aunque IWL no lo haya validado todavía", () => {
    const areas: AreaDd[] = [
      {
        codigo: "financiero",
        nombre: "Financiero",
        peso: 1,
        puntos: [punto("a", "entregado"), punto("b", "validado")],
      },
    ];

    // entregado 0.5 + validado 1, sobre 2 puntos
    expect(calcularAreas(areas, AHORA)[0].valor).toBe(75);
  });

  it("un punto bloqueante no suma aunque tenga documento", () => {
    const areas: AreaDd[] = [
      {
        codigo: "societario_legal",
        nombre: "Societario y legal",
        peso: 1,
        puntos: [punto("a", "bloqueante"), punto("b", "validado")],
      },
    ];

    const [resultado] = calcularAreas(areas, AHORA);
    expect(resultado.valor).toBe(50);
    expect(resultado.bloqueantes).toBe(1);
  });

  it("un documento caducado vuelve a pendiente y deja de sumar", () => {
    const caducado = new Date("2026-08-01T00:00:00Z");
    const vigente = new Date("2027-01-01T00:00:00Z");

    const areas: AreaDd[] = [
      {
        codigo: "financiero",
        nombre: "Financiero",
        peso: 1,
        puntos: [
          punto("caducado", "validado", true, caducado),
          punto("vigente", "validado", true, vigente),
        ],
      },
    ];

    const [resultado] = calcularAreas(areas, AHORA);
    expect(resultado.valor).toBe(50);
    expect(resultado.validados).toBe(1);
    expect(resultado.pendientes).toBe(1);
  });

  it("los puntos opcionales suman si están y no restan si faltan", () => {
    const sinOpcional: AreaDd[] = [
      {
        codigo: "propiedad_intelectual",
        nombre: "Propiedad intelectual",
        peso: 1,
        puntos: [punto("obligatorio", "validado"), punto("patentes", "pendiente", false)],
      },
    ];
    const conOpcional: AreaDd[] = [
      {
        codigo: "propiedad_intelectual",
        nombre: "Propiedad intelectual",
        peso: 1,
        puntos: [punto("obligatorio", "validado"), punto("patentes", "validado", false)],
      },
    ];

    expect(calcularAreas(sinOpcional, AHORA)[0].valor).toBe(100);
    expect(calcularAreas(conOpcional, AHORA)[0].valor).toBe(100);
  });
});

describe("calcularScorePreparacion", () => {
  const areas: AreaDd[] = [
    {
      codigo: "financiero",
      nombre: "Financiero",
      peso: 1.5,
      puntos: [punto("a", "validado")],
    },
    {
      codigo: "equipo",
      nombre: "Equipo",
      peso: 1,
      puntos: [punto("b", "pendiente")],
    },
  ];

  it("pondera las áreas por su peso", () => {
    const score = calcularScorePreparacion(areas, null, 0, AHORA);

    // (1.5 × 100 + 1 × 0) / 2.5
    expect(score.valor).toBe(60);
    expect(score.aportacionTecnica).toBeNull();
  });

  it("suma el score técnico como una área más, con su peso", () => {
    const tecnico = calcularScoreTecnico([
      { codigo: "seguridad", nombre: "Seguridad", peso: 1, objetivo: 2, nivel: 2 },
    ]);

    const score = calcularScorePreparacion(areas, tecnico, 2, AHORA);

    // (1.5 × 100 + 1 × 0 + 2 × 100) / 4.5
    expect(score.valor).toBe(77.8);
    expect(score.aportacionTecnica).toEqual({ peso: 2, valor: 100 });
  });

  it("coincide con el cálculo manual, criterio de aceptación §11", () => {
    const tecnico = calcularScoreTecnico([
      { codigo: "seguridad", nombre: "Seguridad", peso: 2, objetivo: 3, nivel: 2 },
      { codigo: "codigo_calidad", nombre: "Código", peso: 1, objetivo: 2, nivel: 1 },
    ]);

    // técnico: (2 × 2/3 + 1 × 1/2) / 3 = 0.6111 → 61.1
    expect(tecnico.valor).toBe(61.1);

    const score = calcularScorePreparacion(areas, tecnico, 2, AHORA);
    const esperado = (1.5 * 100 + 1 * 0 + 2 * 61.1) / 4.5;
    expect(score.valor).toBe(Math.round(esperado * 10) / 10);
  });
});

describe("un punto que no aplica", () => {
  /*
   * Un proyecto sin sociedad no tiene escritura: si el punto contara como
   * cero, parecería peor preparado por algo que no se le puede pedir.
   */
  it("ni suma ni resta: sale del denominador", () => {
    const areas: AreaDd[] = [
      {
        codigo: "societario_legal",
        nombre: "Societario y legal",
        peso: 1,
        puntos: [punto("escritura", "no_aplica"), punto("pacto", "validado")],
      },
    ];

    const [area] = calcularAreas(areas, AHORA);
    expect(area.valor).toBe(100);
    expect(area.total).toBe(1);
    expect(area.pendientes).toBe(0);
  });

  it("un área donde nada aplica no es un cero que cuente como malo", () => {
    const areas: AreaDd[] = [
      {
        codigo: "societario_legal",
        nombre: "Societario y legal",
        peso: 1,
        puntos: [punto("escritura", "no_aplica"), punto("actas", "no_aplica")],
      },
    ];

    expect(calcularAreas(areas, AHORA)[0].total).toBe(0);
  });
});

describe("la media con un área que no aplica", () => {
  it("el área entera fuera de la media, no como un cero", () => {
    const areas: AreaDd[] = [
      { codigo: "financiero", nombre: "Financiero", peso: 1, puntos: [punto("a", "validado")] },
      {
        codigo: "societario_legal",
        nombre: "Societario y legal",
        peso: 1,
        puntos: [punto("escritura", "no_aplica"), punto("actas", "no_aplica")],
      },
    ];

    expect(calcularScorePreparacion(areas, null, 0, AHORA).valor).toBe(100);
  });
});
