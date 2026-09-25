import { describe, expect, it } from "vitest";
import { PESOS_MADUREZ, calcularMadurez, type EntradaMadurez } from "./madurez";

const BASE: EntradaMadurez = {
  scoreTecnico: 80,
  scorePreparacion: 70,
  hitosExigibles: 10,
  hitosCumplidos: 6,
  mrr: 5000,
  mrrObjetivo: 10000,
  runwayMeses: 9,
  runwayMinimo: 6,
};

describe("índice de madurez", () => {
  it("pondera los cinco ejes según su peso", () => {
    const m = calcularMadurez(BASE);

    // 80·30 + 70·20 + 60·20 + 50·20 + 100·10 = 2400+1400+1200+1000+1000 = 7000
    // sobre 100 de peso
    expect(m.valor).toBe(70);
    expect(m.cobertura).toBe(100);
    expect(m.sinMedir).toEqual([]);
  });

  it("un eje sin datos no cuenta como un cero", () => {
    const sinTecnico = calcularMadurez({ ...BASE, scoreTecnico: null });

    // Sin el eje técnico quedan 70 puntos de peso: 1400+1200+1000+1000 = 4600
    expect(sinTecnico.valor).toBe(Math.round((4600 / 70) * 10) / 10);
    expect(sinTecnico.valor).toBeGreaterThan(
      calcularMadurez({ ...BASE, scoreTecnico: 0 }).valor!,
    );
    expect(sinTecnico.sinMedir).toEqual(["Tecnología"]);
    expect(sinTecnico.cobertura).toBe(70);
  });

  it("sin ningún dato el índice no existe, no vale cero", () => {
    const m = calcularMadurez({
      scoreTecnico: null,
      scorePreparacion: null,
      hitosExigibles: 0,
      hitosCumplidos: 0,
      mrr: null,
      mrrObjetivo: null,
      runwayMeses: null,
      runwayMinimo: 6,
    });

    expect(m.valor).toBeNull();
    expect(m.cobertura).toBe(0);
    expect(m.sinMedir).toHaveLength(5);
  });

  it("el plan se mide contra los hitos ya exigibles, no contra todo el recorrido", () => {
    // Un proyecto en su primera semana: nada vencido todavía
    const arrancando = calcularMadurez({
      ...BASE,
      hitosExigibles: 0,
      hitosCumplidos: 0,
    });

    const plan = arrancando.ejes.find((e) => e.eje === "plan")!;
    expect(plan.valor).toBeNull();
    expect(plan.motivo).toMatch(/Todavía no vencía/);
  });

  it("superar el objetivo no dispara el eje por encima de cien", () => {
    const sobrado = calcularMadurez({
      ...BASE,
      runwayMeses: 36,
      mrr: 40000,
      mrrObjetivo: 10000,
    });

    expect(sobrado.ejes.find((e) => e.eje === "solidez")!.valor).toBe(100);
    expect(sobrado.ejes.find((e) => e.eje === "traccion")!.valor).toBe(100);
  });

  it("los pesos se pueden mover sin tocar el cálculo", () => {
    const soloTecnico = calcularMadurez(BASE, {
      ...PESOS_MADUREZ,
      tecnologia: 100,
      gobierno: 0,
      plan: 0,
      traccion: 0,
      solidez: 0,
    });

    expect(soloTecnico.valor).toBe(80);
  });

  it("cada eje explica de dónde sale su número", () => {
    const m = calcularMadurez(BASE);
    expect(m.ejes.every((e) => e.motivo.length > 0)).toBe(true);
    expect(m.ejes.find((e) => e.eje === "plan")!.motivo).toBe(
      "6 de 10 hitos ya exigibles",
    );
  });
});
