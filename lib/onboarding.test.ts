import { describe, expect, it } from "vitest";
import {
  diasEntre,
  estaDetenido,
  pasoEnCurso,
  pasosDeOnboarding,
  textoRecordatorio,
  type DatosOnboarding,
} from "./onboarding";

const HOY = "2026-11-09";

const candidatura = (c: Partial<NonNullable<DatosOnboarding["candidatura"]>> = {}) => ({
  descartada: false,
  ndaElla: null,
  ndaIwl: null,
  entregas: null,
  comite: null,
  acuerdo: null,
  ...c,
});

const estados = (d: DatosOnboarding) =>
  pasosDeOnboarding(d, undefined, HOY).map((p) => `${p.clave}:${p.estado}`);

describe("los pasos del alta", () => {
  it("cuenta recién creada: el primer acceso está en curso, lo demás por hacer", () => {
    const pasos = pasosDeOnboarding(
      { cuentaCreada: "2026-11-08T10:00:00Z", primerAcceso: null, contrasenaCambiada: null, candidatura: candidatura() },
      undefined,
      HOY,
    );
    expect(pasos[0].estado).toBe("hecho");
    expect(pasos[1]).toMatchObject({ clave: "primer_acceso", estado: "curso", dias: 1 });
    expect(pasos.slice(2).every((p) => p.estado === "pendiente")).toBe(true);
  });

  it("cuenta sin crear: nadie está parado, crearla es cosa de IWL", () => {
    const pasos = pasosDeOnboarding(
      { cuentaCreada: null, primerAcceso: null, contrasenaCambiada: null, candidatura: candidatura() },
      undefined,
      HOY,
    );
    expect(pasos[0].estado).toBe("pendiente");
    expect(pasoEnCurso(pasos)).toBeNull();
    expect(estaDetenido(pasos)).toBe(false);
  });

  it("cinco días en un paso pide atención, diez lo dan por vencido", () => {
    const con = (creada: string) =>
      pasosDeOnboarding(
        { cuentaCreada: creada, primerAcceso: null, contrasenaCambiada: null, candidatura: null },
        undefined,
        HOY,
      )[1].estado;
    expect(con("2026-11-05")).toBe("curso");
    expect(con("2026-11-04")).toBe("atencion");
    expect(con("2026-10-30")).toBe("vencido");
  });

  it("los umbrales salen de la configuración", () => {
    const pasos = pasosDeOnboarding(
      { cuentaCreada: "2026-11-07", primerAcceso: null, contrasenaCambiada: null, candidatura: null },
      { atencion_dias: 1, vencido_dias: 2 },
      HOY,
    );
    expect(pasos[1].estado).toBe("vencido");
  });

  it("los días cuentan desde que acabó el paso anterior, no desde el alta", () => {
    const pasos = pasosDeOnboarding(
      {
        cuentaCreada: "2026-10-01",
        primerAcceso: "2026-10-02",
        contrasenaCambiada: "2026-10-02",
        candidatura: candidatura({ ndaElla: "2026-11-06T09:00:00Z" }),
      },
      undefined,
      HOY,
    );
    expect(pasoEnCurso(pasos)).toMatchObject({ clave: "nda_iwl", dias: 3, estado: "curso" });
  });

  it("el due diligence dice cuánto lleva, y se completa al entregarlo todo", () => {
    const dd = (cumplidas: number) =>
      pasosDeOnboarding(
        {
          cuentaCreada: "2026-11-01",
          primerAcceso: "2026-11-01",
          contrasenaCambiada: "2026-11-01",
          candidatura: candidatura({
            ndaElla: "2026-11-02",
            ndaIwl: "2026-11-03",
            entregas: { cumplidas, total: 5, ultima: "2026-11-08" },
          }),
        },
        undefined,
        HOY,
      ).find((p) => p.clave === "due_diligence")!;

    // Seis días desde que firmó IWL el 3: atención
    expect(dd(3)).toMatchObject({ estado: "atencion", detalle: "3 de 5", dias: 6 });
    expect(dd(5)).toMatchObject({ estado: "hecho", fecha: "2026-11-08" });
  });

  it("lo hecho fuera de la plataforma deja los pasos de antes en «No aplica»", () => {
    // Una compañía que firmó antes de que el NDA se firmara aquí
    expect(
      estados({
        cuentaCreada: "2026-10-01",
        primerAcceso: "2026-10-01",
        contrasenaCambiada: "2026-10-01",
        candidatura: candidatura({ acuerdo: "2026-10-20" }),
      }),
    ).toEqual([
      "cuenta:hecho",
      "primer_acceso:hecho",
      "contrasena:hecho",
      "nda_ella:no_aplica",
      "nda_iwl:no_aplica",
      "due_diligence:no_aplica",
      "comite:no_aplica",
      "acuerdo:hecho",
    ]);
  });

  it("una descartada no tiene paso en curso ni avisa", () => {
    const pasos = pasosDeOnboarding(
      {
        cuentaCreada: "2026-10-01",
        primerAcceso: null,
        contrasenaCambiada: null,
        candidatura: candidatura({ descartada: true }),
      },
      undefined,
      HOY,
    );
    expect(pasoEnCurso(pasos)).toBeNull();
    expect(pasos.slice(1).every((p) => p.estado === "no_aplica")).toBe(true);
  });

  it("sin candidatura, el alta acaba en la contraseña", () => {
    const pasos = pasosDeOnboarding(
      { cuentaCreada: "2026-11-01", primerAcceso: "2026-11-01", contrasenaCambiada: "2026-11-02", candidatura: null },
      undefined,
      HOY,
    );
    expect(pasos.map((p) => p.clave)).toEqual(["cuenta", "primer_acceso", "contrasena"]);
    expect(pasoEnCurso(pasos)).toBeNull();
  });
});

describe("lo de alrededor", () => {
  it("los días son naturales, no de veinticuatro horas", () => {
    expect(diasEntre("2026-11-08", "2026-11-09")).toBe(1);
    expect(diasEntre("2026-11-09", "2026-11-09")).toBe(0);
    expect(diasEntre("2026-10-31", "2026-11-09")).toBe(9);
  });

  it("el recordatorio le habla a la persona por su nombre y dice qué falta", () => {
    const { cuerpo } = textoRecordatorio("primer_acceso", "Agustina Gómez", "https://ride.inceptionwlab.es");
    expect(cuerpo).toMatch(/^Hola, Agustina:/);
    expect(cuerpo).toContain("https://ride.inceptionwlab.es/entrar");
  });
});
