import { describe, expect, it } from "vitest";
import { erroresFormato, faltanMarcas, interpretarNda, tituloDe, tramos } from "./nda-formato";
import { completarNda, erroresPlantilla, problemaParaEnviar } from "./nda-texto";

const PLANTILLA = [
  "# Acuerdo de prueba",
  "",
  "En {{lugar}}, en la fecha de la última firma.",
  "",
  "### REUNIDOS",
  "",
  "Y de otra parte, {{#si_sociedad}}{{denominacion}}{{/si_sociedad}}{{#si_persona}}{{contraparte_nombre}}{{/si_persona}}.",
  "",
  "{{#si_sociedad}}Sociedad con NIF {{nif}}.{{/si_sociedad}}",
  "",
  "{{#si_persona}}Con documento {{documento}}.{{/si_persona}}",
  "",
  "### EXPONEN",
  "",
  "I. Que quieren hablar.",
  "",
  "II. Que lo dejan por escrito.",
  "",
  "### CLÁUSULAS",
  "",
  "## 01 Información confidencial",
  "",
  "Se entiende por **Información Confidencial** toda la que se comparta.",
  "",
  "## 02 Obligaciones",
  "",
  "La Receptora se obliga a:",
  "",
  "a) No usarla para otra cosa.",
  "",
  "b) No divulgarla.",
  "",
  "### FIRMAS",
  "",
  "::: firma",
  "POR",
  "**Inception Woman Lab, S.L.**",
  ":::",
  "",
  "::: firma",
  "POR",
  "**{{#si_sociedad}}{{denominacion}}{{/si_sociedad}}{{#si_persona}}{{contraparte_nombre}}{{/si_persona}}**",
  "Documento: {{documento}}",
  ":::",
].join("\n");

const PERSONA = { startup: "Startup de Prueba", contraparte_nombre: "Ana Prueba", lugar: "Málaga", es_sociedad: false, documento: "00000000T" };

describe("las marcas", () => {
  const piezas = interpretarNda(completarNda(PLANTILLA, PERSONA));

  it("cada marca da su pieza, en orden", () => {
    expect(piezas.map((p) => p.tipo)).toEqual([
      "titulo",
      "parrafo",
      "seccion",
      "parrafo",
      "parrafo",
      "seccion",
      "expositivo",
      "expositivo",
      "seccion",
      "clausula",
      "parrafo",
      "clausula",
      "parrafo",
      "lista",
      "lista",
      "seccion",
      "firmas",
    ]);
    expect(tituloDe(piezas)).toBe("Acuerdo de prueba");
  });

  it("el párrafo de un bloque que no toca desaparece, no deja un hueco", () => {
    const parrafos = piezas.filter((p) => p.tipo === "parrafo").map((p) => JSON.stringify(p));
    expect(parrafos.join()).toContain("Con documento 00000000T.");
    expect(parrafos.join()).not.toContain("NIF");
  });

  it("cláusula con su número, expositivo con su romano, lista con su letra", () => {
    expect(piezas).toContainEqual({ tipo: "clausula", numero: "01", titulo: "Información confidencial" });
    expect(piezas).toContainEqual({ tipo: "expositivo", numero: "II.", tramos: [{ texto: "Que lo dejan por escrito.", negrita: false }] });
    expect(piezas).toContainEqual({ tipo: "lista", letra: "b)", tramos: [{ texto: "No divulgarla.", negrita: false }] });
  });

  it("la negrita, y un «**» sin pareja se queda como texto", () => {
    expect(tramos("Se entiende por **esto** y nada más")).toEqual([
      { texto: "Se entiende por ", negrita: false },
      { texto: "esto", negrita: true },
      { texto: " y nada más", negrita: false },
    ]);
    expect(tramos("Un ** suelto")).toEqual([{ texto: "Un ** suelto", negrita: false }]);
  });

  it("dos bloques de firma seguidos van juntos, cada línea una línea", () => {
    const firmas = piezas.find((p) => p.tipo === "firmas");
    expect(firmas).toEqual({
      tipo: "firmas",
      bloques: [
        [[{ texto: "POR", negrita: false }], [{ texto: "Inception Woman Lab, S.L.", negrita: true }]],
        [
          [{ texto: "POR", negrita: false }],
          [{ texto: "Ana Prueba", negrita: true }],
          [{ texto: "Documento: 00000000T", negrita: false }],
        ],
      ],
    });
  });

  it("las líneas de un párrafo se juntan: lo que separa párrafos es la línea en blanco", () => {
    expect(interpretarNda("Una línea\nque sigue")).toEqual([
      { tipo: "parrafo", tramos: [{ texto: "Una línea que sigue", negrita: false }] },
    ]);
  });
});

describe("una marca mal puesta no deja guardar la plantilla", () => {
  it("la plantilla bien formada se guarda y se puede enviar", () => {
    expect(erroresFormato(PLANTILLA)).toEqual([]);
    expect(erroresPlantilla(PLANTILLA)).toEqual([]);
    expect(problemaParaEnviar(PLANTILLA)).toBeNull();
  });

  it("un «::: firma» sin cerrar", () => {
    expect(erroresFormato("# T\n\n::: firma\nPOR")).toEqual(["Falta cerrar un «::: firma» con «:::»"]);
  });

  it("dos títulos, o uno que no va al principio", () => {
    expect(erroresFormato("# Uno\n\nTexto\n\n# Dos")[0]).toMatch(/más de un título/);
    expect(erroresFormato("Texto\n\n# Tarde")[0]).toMatch(/va al principio/);
  });

  it("una cláusula sin número, cuatro «#», o sin espacio", () => {
    expect(erroresFormato("## Sin número")[0]).toMatch(/lleva su número, así: «## 01 TÍTULO»/);
    expect(erroresFormato("#### Demasiadas")[0]).toMatch(/cuatro «#» o más/);
    expect(erroresFormato("###REUNIDOS")[0]).toMatch(/va un espacio/);
  });

  it("un bloque que no es de firma, un cierre suelto, una negrita sin cerrar, una tabla", () => {
    expect(erroresFormato("::: nota\nx\n:::")[0]).toMatch(/el único es «::: firma»/);
    expect(erroresFormato("Texto\n\n:::")[0]).toMatch(/no estaba abierto/);
    expect(erroresFormato("Esto es **importante.")[0]).toMatch(/negrita «\*\*» sin cerrar/);
    expect(erroresFormato("| a | b |")[0]).toMatch(/las tablas no se pueden usar/);
  });

  it("y lo dice al guardar, junto a los marcadores", () => {
    expect(erroresPlantilla("# Uno\n\n# Dos")).toEqual(["Hay más de un título «# …»: el documento lleva uno solo, al principio"]);
  });
});

describe("una plantilla sin marcas no se guarda como si las tuviera", () => {
  it("copiada de una vista que ya la pintaba, sin «#» ni «##», no", () => {
    const pintada = "IWL_NDA_PlantillaPlataforma_ES_v3_20261110 Acuerdo mutuo de confidencialidad En Málaga, a…\nREUNIDOS\nDe una parte…";
    expect(faltanMarcas(pintada)).toMatch(/no lleva las marcas de formato \(# título, ## cláusulas\)/);
    expect(faltanMarcas("# Título\n\nSin cláusulas")).not.toBeNull();
  });

  it("con título y cláusulas, sí; y con saltos de Windows igual que sin ellos", () => {
    expect(faltanMarcas(PLANTILLA)).toBeNull();
    const windows = PLANTILLA.replace(/\n/g, "\r\n");
    expect(faltanMarcas(windows)).toBeNull();
    expect(erroresFormato(windows)).toEqual([]);
    expect(interpretarNda(completarNda(windows, PERSONA))).toEqual(interpretarNda(completarNda(PLANTILLA, PERSONA)));
  });
});
