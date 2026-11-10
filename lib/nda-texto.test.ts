import { describe, expect, it } from "vitest";
import {
  camposQuePide,
  completarNda,
  erroresPlantilla,
  huecos,
  problemaParaEnviar,
} from "./nda-texto";

const PLANTILLA = [
  "Acuerdo entre Inception Woman Lab y {{contraparte_nombre}}, de {{startup}}.",
  "{{#si_persona}}Con documento {{documento}} y domicilio en {{domicilio}}.{{/si_persona}}",
  "{{#si_sociedad}}En nombre de {{denominacion}}, NIF {{nif}}, como {{cargo}}, con domicilio en {{domicilio}}.{{/si_sociedad}}",
  "En {{lugar}}, con efecto desde la fecha de la última firma del registro.",
].join("\n");

const BASE = {
  startup: "Siren",
  contraparte_nombre: "Ana Prueba",
  lugar: "Málaga",
};

describe("la plantilla", () => {
  it("con los marcadores conocidos y los bloques cerrados se guarda", () => {
    expect(erroresPlantilla(PLANTILLA)).toEqual([]);
  });

  it("la fecha de efecto no es un marcador: no se guarda, y dice por qué", () => {
    expect(erroresPlantilla("Con efecto desde {{fecha_efecto}}.")[0]).toMatch(/La fecha de efecto no va en el texto/);
  });

  it("un marcador desconocido, un bloque desconocido o sin cerrar, no", () => {
    expect(erroresPlantilla("Hola {{nombre_fundadora}}")[0]).toMatch(/nombre_fundadora/);
    expect(erroresPlantilla("{{#si_menor}}x{{/si_menor}}")[0]).toMatch(/si_menor/);
    expect(erroresPlantilla("{{#si_persona}}sin cerrar")).toEqual(["Falta cerrar «{{#si_persona}}» con «{{/si_persona}}»"]);
  });

  it("un hueco entre corchetes impide enviarla; los marcadores no", () => {
    expect(problemaParaEnviar(PLANTILLA)).toBeNull();
    expect(problemaParaEnviar(`${PLANTILLA}\nFirmado en [CIUDAD].`)).toMatch(/\[CIUDAD\]/);
  });
});

describe("el texto completado", () => {
  it("persona física: su bloque, con sus datos, y el de sociedad fuera entero", () => {
    const t = completarNda(PLANTILLA, { ...BASE, es_sociedad: false, documento: "12345678Z", domicilio: "Calle Larios 1, Málaga" });
    expect(t).toMatch(/Acuerdo entre Inception Woman Lab y Ana Prueba, de Siren\./);
    expect(t).toMatch(/Con documento 12345678Z y domicilio en Calle Larios 1, Málaga\./);
    expect(t).not.toMatch(/En nombre de/);
    expect(t).toMatch(/En Málaga, con efecto desde la fecha de la última firma del registro\./);
    expect(huecos(t)).toEqual([]);
  });

  it("sociedad: el otro bloque", () => {
    const t = completarNda(PLANTILLA, {
      ...BASE,
      es_sociedad: true,
      denominacion: "Siren Tech SL",
      nif: "B00000000",
      cargo: "Administradora única",
      domicilio: "Calle Larios 1, Málaga",
    });
    expect(t).toMatch(/En nombre de Siren Tech SL, NIF B00000000, como Administradora única/);
    expect(t).not.toMatch(/Con documento/);
  });

  it("lo que falta se queda como hueco, y se dice cuál", () => {
    const t = completarNda(PLANTILLA, { ...BASE, es_sociedad: false, documento: "  " });
    expect(huecos(t)).toEqual(["{{documento}}", "{{domicilio}}"]);
  });

  it("le pide a ella solo los campos de su caso", () => {
    expect(camposQuePide(PLANTILLA, false)).toEqual(["documento", "domicilio"]);
    expect(camposQuePide(PLANTILLA, true)).toEqual(["domicilio", "denominacion", "nif", "cargo"]);
  });
});
