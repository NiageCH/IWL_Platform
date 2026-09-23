import { describe, expect, it } from "vitest";
import {
  calcularConversionPiloto,
  calcularCosteCloudSobreIngresos,
  calcularCrecimiento,
  calcularDerivados,
  calcularRunway,
} from "./kpi-derivados";

describe("calcularRunway", () => {
  it("divide caja entre consumo mensual", () => {
    expect(calcularRunway(120000, 15000)).toBe(8);
  });

  it("no calcula runway si la compañía no consume caja", () => {
    expect(calcularRunway(120000, 0)).toBeNull();
    expect(calcularRunway(120000, -5000)).toBeNull();
  });

  it("devuelve null si falta alguno de los dos datos", () => {
    expect(calcularRunway(null, 15000)).toBeNull();
    expect(calcularRunway(120000, null)).toBeNull();
  });
});

describe("calcularCrecimiento", () => {
  it("calcula la variación respecto al mes anterior", () => {
    expect(calcularCrecimiento(11000, 10000)).toBe(10);
    expect(calcularCrecimiento(9000, 10000)).toBe(-10);
  });

  it("no divide entre cero", () => {
    expect(calcularCrecimiento(5000, 0)).toBeNull();
  });
});

describe("calcularConversionPiloto", () => {
  it("mide clientes de pago sobre pago más pilotos", () => {
    expect(calcularConversionPiloto(3, 1)).toBe(75);
  });

  it("devuelve null sin clientes ni pilotos", () => {
    expect(calcularConversionPiloto(0, 0)).toBeNull();
  });
});

describe("calcularCosteCloudSobreIngresos", () => {
  it("expresa el coste cloud como porcentaje de los ingresos", () => {
    expect(calcularCosteCloudSobreIngresos(800, 10000)).toBe(8);
  });
});

describe("calcularDerivados", () => {
  it("calcula las cuatro métricas derivadas de un mes", () => {
    const derivados = calcularDerivados(
      {
        periodo: "2026-09",
        valores: {
          caja: 180000,
          burn_mensual: 20000,
          mrr: 12000,
          clientes_pago: 4,
          pilotos_activos: 2,
          coste_cloud_mensual: 900,
          ingresos: 15000,
        },
      },
      { periodo: "2026-08", valores: { mrr: 10000 } },
    );

    expect(derivados).toEqual({
      runway_meses: 9,
      crecimiento_mrr: 20,
      conversion_piloto_cliente: 66.7,
      coste_cloud_sobre_ingresos: 6,
    });
  });

  it("en el primer mes no hay crecimiento que calcular", () => {
    const derivados = calcularDerivados(
      { periodo: "2026-04", valores: { mrr: 3000, caja: 90000, burn_mensual: 9000 } },
      null,
    );

    expect(derivados.crecimiento_mrr).toBeNull();
    expect(derivados.runway_meses).toBe(10);
  });
});
