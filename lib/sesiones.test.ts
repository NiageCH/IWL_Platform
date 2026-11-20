import { describe, expect, it } from "vitest";
import { confirmaSolaEl, grupoDe, sumarPorEstado, textoEvento, NOMBRE_ESTADO_SESION, type EstadoSesion } from "./sesiones";
import { estadoVisual } from "./estados";

describe("las horas de las sesiones", () => {
  it("se separan en confirmadas, por confirmar y en discusión; lo anulado, aparte", () => {
    const r = sumarPorEstado([
      { estado: "confirmada", horas: 0.1 },
      { estado: "confirmada_plazo", horas: 0.2 },
      { estado: "confirmada_previa", horas: 1 },
      { estado: "confirmada_direccion", horas: 1 },
      { estado: "por_confirmar", horas: 2 },
      { estado: "en_discusion", horas: 1.5 },
      { estado: "en_direccion", horas: 0.5 },
      { estado: "anulada", horas: 4 },
    ]);
    // 0,1 + 0,2 es 0,3, no 0,30000000000000004
    expect(r).toEqual({ confirmadas: 2.3, porConfirmar: 2, enDiscusion: 2, anuladas: 4 });
  });

  it("toda confirmada cuenta para el Anexo, la diga quien la diga", () => {
    const confirmadas: EstadoSesion[] = ["confirmada", "confirmada_plazo", "confirmada_direccion", "confirmada_previa"];
    for (const e of confirmadas) expect(grupoDe(e)).toBe("confirmadas");
  });

  it("cada estado tiene su palabra y su estado visual", () => {
    expect(estadoVisual("sesion", { estado: "por_confirmar" })).toBe("pendiente");
    expect(estadoVisual("sesion", { estado: "en_discusion" })).toBe("atencion");
    expect(estadoVisual("sesion", { estado: "confirmada_plazo" })).toBe("hecho");
    expect(estadoVisual("sesion", { estado: "anulada" })).toBe("no_aplica");
    expect(NOMBRE_ESTADO_SESION.confirmada_previa).toBe("Confirmada (antes del 13 nov)");
  });

  it("se confirma sola a los 7 días de quedar pendiente", () => {
    expect(confirmaSolaEl("2026-11-12T10:00:00Z").toISOString()).toBe("2026-11-19T10:00:00.000Z");
  });

  it("la historia dice cada corrección con la cifra de antes", () => {
    expect(textoEvento("correccion", { persona: "Ana", antes: 2, despues: 1.5 })).toBe("Corrigió las horas de Ana: de 2 h a 1,5 h");
  });
});
