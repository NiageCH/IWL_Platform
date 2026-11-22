import { describe, expect, it } from "vitest";
import { dominiosDeTexto, leerAjusteModoPruebas, seRetiene } from "./modo-pruebas";

describe("el modo pruebas del correo", () => {
  const modo = leerAjusteModoPruebas({ activo: true, dominios: ["inceptionwlab.es", "niage.es"] });

  it("deja salir solo a los dominios de la lista, sin mirar mayúsculas", () => {
    expect(seRetiene("luciana@inceptionwlab.es", modo)).toBe(false);
    expect(seRetiene("Rodrigo@NIAGE.es", modo)).toBe(false);
    expect(seRetiene("alguien@gmail.com", modo)).toBe(true);
  });

  it("no se deja engañar por un dominio parecido", () => {
    expect(seRetiene("a@otro.niage.es", modo)).toBe(true);
    expect(seRetiene("a@niage.es.falso.com", modo)).toBe(true);
  });

  it("apagado, sale todo", () => {
    expect(seRetiene("alguien@gmail.com", leerAjusteModoPruebas({ activo: false, dominios: [] }))).toBe(false);
  });

  it("sin ajuste, retiene: mejor de más que de menos", () => {
    const sin = leerAjusteModoPruebas(undefined);
    expect(sin.activo).toBe(true);
    expect(seRetiene("alguien@gmail.com", sin)).toBe(true);
    expect(seRetiene("a@niage.es", sin)).toBe(false);
  });

  it("lee los dominios como los escribe dirección", () => {
    expect(dominiosDeTexto(" @Niage.es, inceptionwlab.es\notra.org;niage.es ")).toEqual(["niage.es", "inceptionwlab.es", "otra.org"]);
  });
});
