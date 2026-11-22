import { describe, expect, it } from "vitest";
import { pasoEntrada } from "./entrada";
import { ESTADOS_ENTRADA, HECHOS_ENTRADA, PASO_EMBUDO, pasosDe, traza } from "./recorridos";
import { presentarAviso, type DatosAviso, type TipoAviso } from "./avisos";

describe("los recorridos", () => {
  it("el de entrada es el que dice pasoEntrada, paso a paso", () => {
    expect(pasosDe("entrada").map((p) => p.hacer)).toEqual(ESTADOS_ENTRADA.map((e) => pasoEntrada(e).texto));
    expect(HECHOS_ENTRADA).toHaveLength(ESTADOS_ENTRADA.length);
  });

  it("viene de lo hecho antes y va a lo que habrá que hacer después", () => {
    expect(traza("entrada", 1)).toEqual({
      vieneDe: "Situación societaria dicha",
      despues: "Decidir la incorporación",
    });
    expect(traza("hito", 0).vieneDe).toBeNull();
  });
});

const BASE: DatosAviso = {
  id: "00000000-0000-0000-0000-0000000000aa",
  tipo: "situacion_dicha",
  created_at: "2026-11-10T09:00:00Z",
  persona: "Alba Ruiz",
  donde: "Porongo",
  candidaturaId: "00000000-0000-0000-0000-0000000000bb",
  companiaSlug: "porongo",
  hito: { id: "00000000-0000-0000-0000-0000000000cc", titulo: "20 entrevistas" },
  situacion: "Sin constituir",
  reunion: { inicio: "2026-11-13T10:00:00Z", franjas: 3 },
  actaId: "00000000-0000-0000-0000-0000000000dd",
  punto: { id: "00000000-0000-0000-0000-0000000000ee", titulo: "Escritura de constitución" },
  cuantos: 3,
  sesion: { id: "00000000-0000-0000-0000-0000000000ff", fecha: "2026-11-12", tipo: "sesion", titulo: "Precios", horas: 2.5 },
};

const QUE_SIGUEN: TipoAviso[] = [
  "nda_firmado",
  "nda_comentario",
  "situacion_dicha",
  "anexo_comentario",
  "cambio_estadio",
  "reunion_contrapropuesta",
  "reunion_caducada",
  "reunion_anotar",
  "hito_entregado",
  "hito_sin_revisar",
  "candidatura_nueva",
  "acta_por_firmar",
  "anexo_aceptado",
  "documento_entregado",
  "correos_sin_enviar",
  "sesion_por_confirmar",
  "sesion_no_cuadra",
  "sesion_en_direccion",
];

describe("cada aviso", () => {
  it.each(QUE_SIGUEN)("%s dice qué pasó, qué te toca, con un verbo, y lleva a su ancla con el aviso", (tipo) => {
    const p = presentarAviso({ ...BASE, tipo });
    expect(p.paso.length).toBeGreaterThan(10);
    expect(p.toca).not.toBe("Nada");
    expect(p.verbo).toMatch(/^[A-ZÁÉÍÓÚ]/);
    expect(p.href).toContain(`?aviso=${BASE.id}#${p.ancla}`);
    expect(p.hasVenidoA.length).toBeGreaterThan(5);
  });

  it("la situación dicha lleva al bloque de situación de la compañía, con el dato", () => {
    const p = presentarAviso(BASE);
    expect(p.paso).toBe("Alba Ruiz dijo su situación: sin constituir, el 10 nov 2026");
    expect(p.href).toBe(`/cartera/porongo?aviso=${BASE.id}#situacion`);
    expect(p.hasVenidoA).toBe("confirmar la situación societaria de Porongo");
    expect(p.vieneDe).toBe("Situación societaria dicha");
    expect(p.despues).toBe("Decidir la incorporación");
  });

  it("anotar la reunión dice qué día fue", () => {
    const p = presentarAviso({ ...BASE, tipo: "reunion_anotar" });
    expect(p.paso).toBe("La reunión del 13 nov 2026 con Porongo ya pasó");
    expect(p.verbo).toBe("Anotar");
  });

  it("la candidatura nueva viene de presentada y lleva a sus pasos", () => {
    const p = presentarAviso({ ...BASE, tipo: "candidatura_nueva" });
    expect(p.paso).toBe("Alba Ruiz presentó Porongo el 10 nov 2026");
    expect(p.href).toBe(`/embudo/${BASE.candidaturaId}?aviso=${BASE.id}#pasos`);
    expect(p.vieneDe).toBe("Presentada");
    expect(p.despues).toBe("Tener la reunión");
  });

  it("el documento entregado lleva a su punto del due diligence, con su nombre", () => {
    const p = presentarAviso({ ...BASE, tipo: "documento_entregado" });
    expect(p.paso).toBe("Alba Ruiz entregó «Escritura de constitución» el 10 nov 2026");
    expect(p.href).toBe(`/cartera/porongo/diligencia?aviso=${BASE.id}#punto-${BASE.punto!.id}`);
  });

  it("los correos sin enviar dicen cuántos, en singular y en plural", () => {
    expect(presentarAviso({ ...BASE, tipo: "correos_sin_enviar" }).paso).toBe("3 correos sin enviar desde el 10 nov 2026");
    const uno = presentarAviso({ ...BASE, tipo: "correos_sin_enviar", cuantos: 1 });
    expect(uno.paso).toBe("1 correo sin enviar desde el 10 nov 2026");
    expect(uno.toca).toBe("Reintentarlo");
    expect(uno.href).toBe(`/admin/correos?aviso=${BASE.id}#correos`);
  });

  it("los pasos del embudo que se citan fuera siguen siendo los que dicen", () => {
    expect(pasosDe("embudo")[PASO_EMBUDO.comite].hacer).toBe("Pasar por comité");
    expect(pasosDe("embudo")[PASO_EMBUDO.nda].hacer).toBe("Enviarle el NDA");
    expect(pasosDe("embudo")[PASO_EMBUDO.contrafirmar].hacer).toBe("Contrafirmar el NDA");
    expect(pasosDe("embudo")[PASO_EMBUDO.revisar].hacer).toBe("Revisarla");
  });

  it("las horas por confirmar le llevan a ella a su sesión, con las horas dichas", () => {
    const p = presentarAviso({ ...BASE, tipo: "sesion_por_confirmar", persona: "Marta Mentora" });
    expect(p.paso).toBe("Marta Mentora ha registrado 2,5 h de sesión del 12 nov 2026");
    expect(p.href).toBe(`/proyecto/sesiones?aviso=${BASE.id}#sesion-${BASE.sesion!.id}`);
    expect(presentarAviso({ ...BASE, tipo: "sesion_no_cuadra" }).href).toBe(
      `/cartera/porongo/sesiones?aviso=${BASE.id}#sesion-${BASE.sesion!.id}`,
    );
  });
});
