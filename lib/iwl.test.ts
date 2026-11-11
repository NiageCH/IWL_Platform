import { describe, expect, it } from "vitest";
import { MEMBRETE, SOCIEDAD } from "./iwl";

/**
 * El dígito de control de un NIF de sociedad: los de posición par se suman,
 * los de impar se doblan y se suman sus cifras, y el control es lo que le
 * falta a esa suma para la decena. Una errata de una cifra no lo pasa.
 */
function controlNifSociedad(nif: string): boolean {
  const m = /^[ABCDEFGHJNPQRSUVW](\d{7})([0-9A-J])$/.exec(nif);
  if (!m) return false;
  const suma = [...m[1]].reduce((s, c, i) => {
    const n = Number(c);
    if (i % 2 === 1) return s + n;
    const doble = n * 2;
    return s + Math.floor(doble / 10) + (doble % 10);
  }, 0);
  const control = (10 - (suma % 10)) % 10;
  return m[2] === String(control) || m[2] === "JABCDEFGHI"[control];
}

describe("los datos de la sociedad", () => {
  it("el NIF de IWL tiene un dígito de control válido", () => {
    expect(controlNifSociedad(SOCIEDAD.nif)).toBe(true);
  });

  it("una cifra cambiada no pasa el control", () => {
    for (let i = 1; i < 8; i++) {
      const cifra = (Number(SOCIEDAD.nif[i]) + 1) % 10;
      expect(controlNifSociedad(SOCIEDAD.nif.slice(0, i) + cifra + SOCIEDAD.nif.slice(i + 1))).toBe(false);
    }
  });

  it("el membrete lleva el NIF correcto", () => {
    expect(MEMBRETE).toContain("NIF B27646355");
  });
});
