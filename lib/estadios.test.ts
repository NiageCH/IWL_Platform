import { describe, expect, it } from "vitest";
import { estadiosPorEncima, programaDe, revisionDe } from "./estadios";

describe("lo que sale del estadio (REVISION, 22 nov)", () => {
  it("el programa: Incubación hasta MVP sin piloto, Aceleración desde el piloto", () => {
    expect(programaDe("idea")).toBe("incubacion");
    expect(programaDe("mvp_sin_piloto")).toBe("incubacion");
    expect(programaDe("mvp_con_piloto")).toBe("aceleracion");
    expect(programaDe("facturando")).toBe("aceleracion");
    expect(programaDe(null)).toBeNull();
  });

  it("la revisión de entrada: diagnóstico solo en idea", () => {
    expect(revisionDe("idea")).toBe("diagnostico");
    expect(revisionDe("mvp_sin_piloto")).toBe("due_diligence");
    expect(revisionDe("facturando")).toBe("due_diligence");
  });

  it("solo se cambia hacia arriba", () => {
    expect(estadiosPorEncima("mvp_sin_piloto")).toEqual(["mvp_con_piloto", "facturando"]);
    expect(estadiosPorEncima("facturando")).toEqual([]);
  });
});
