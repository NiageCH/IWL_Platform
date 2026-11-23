import { describe, expect, it } from "vitest";
import { dondeEstamos, nombreLista, plazo, plazoMaximoMeses, retrasoTramo, textoPlazo, tramoDeEntrada, tramosDeLaLista } from "./tramos";

describe("los tramos de la hoja de ruta (REVISION, 22 y 23 nov)", () => {
  it("el estadio dice el tramo de entrada y el plazo máximo: 18, 12, 8 o 5 meses", () => {
    expect([tramoDeEntrada("idea"), tramoDeEntrada("mvp_sin_piloto"), tramoDeEntrada("mvp_con_piloto"), tramoDeEntrada("facturando")]).toEqual([1, 2, 3, 4]);
    expect([plazoMaximoMeses("idea"), plazoMaximoMeses("mvp_sin_piloto"), plazoMaximoMeses("mvp_con_piloto"), plazoMaximoMeses("facturando")]).toEqual([18, 12, 8, 5]);
  });

  it("la lista: en idea, el tramo 1 y se llama diagnóstico; en el resto, los tramos anteriores", () => {
    expect(tramosDeLaLista("idea")).toEqual([1]);
    expect(tramosDeLaLista("mvp_sin_piloto")).toEqual([1]);
    expect(tramosDeLaLista("mvp_con_piloto")).toEqual([1, 2]);
    expect(tramosDeLaLista("facturando")).toEqual([1, 2, 3]);
    expect(nombreLista("idea")).toBe("Diagnóstico");
    expect(nombreLista("facturando")).toBe("Lo que ya tenéis");
  });

  it("el plazo cuenta desde la firma, y no se cierra nada solo al vencer", () => {
    const p = plazo("2026-01-15", "facturando", "2026-06-20");
    // El último día es el anterior al aniversario, como en la base
    expect(p.vence).toBe("2026-06-14");
    expect(p.vencido).toBe(true);
    expect(textoPlazo(p)).toBe("El plazo venció hace 6 días");
    expect(textoPlazo(plazo("2026-11-01", "idea", "2026-11-23"))).toMatch(/^Quedan 1[78] meses de plazo$/);
  });

  it("un tramo va con retraso si pasó su fin sin cerrarse", () => {
    expect(retrasoTramo({ fin: "2026-11-01", cerrado: false }, "2026-11-23")).toBe(3);
    expect(retrasoTramo({ fin: "2026-11-01", cerrado: true }, "2026-11-23")).toBeNull();
    expect(retrasoTramo({ fin: "2026-12-01", cerrado: false }, "2026-11-23")).toBeNull();
  });

  it("dónde estamos, en una frase", () => {
    expect(
      dondeEstamos([
        { titulo: "Clientes que repiten", estado: "cumplido", fecha: "2026-12-01" },
        { titulo: "Margen por cliente conocido", estado: "en_curso", fecha: "2027-01-10" },
        { titulo: "Data room completo", estado: "pendiente", fecha: "2027-01-31" },
      ]),
    ).toBe("1 de 3 hitos de este tramo cumplidos. Siguiente: «Margen por cliente conocido», para el 10 ene 2027.");
  });

  it("lo cumplido al entrar va aparte de lo hecho en el programa", () => {
    expect(
      dondeEstamos([
        { titulo: "Problema validado", estado: "cumplido", fecha: null, alEntrar: true },
        { titulo: "MVP funcionando", estado: "cumplido", fecha: null, alEntrar: true },
        { titulo: "Clientes que repiten", estado: "cumplido", fecha: "2026-10-20" },
        { titulo: "Data room completo", estado: "pendiente", fecha: "2027-01-31" },
      ]),
    ).toBe("2 cumplidos al entrar · 1 de 2 pendientes hecho. Siguiente: «Data room completo», para el 31 ene 2027.");
  });
});
