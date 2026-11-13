import { describe, expect, it } from "vitest";
import { comprobarFichero, megas, sanear, textoLimite } from "./subidas";

describe("los límites de subida", () => {
  it("dicen el límite antes de subir", () => {
    expect(textoLimite("documento")).toBe("PDF, Word, Excel, PowerPoint, CSV o imagen, hasta 25 MB.");
    expect(textoLimite("cv")).toBe("PDF o Word, hasta 10 MB.");
    expect(textoLimite("foto")).toBe("JPG, PNG o WebP, hasta 5 MB.");
    expect(textoLimite("evidencia")).toBe("Hasta 25 MB.");
  });

  it("un PDF de cuentas de 5 MB vale; uno de 30, no, y dice por qué", () => {
    const pdf = { nombre: "cuentas.pdf", tipo: "application/pdf" };
    expect(comprobarFichero("documento", { ...pdf, tamano: 5 * 1024 * 1024 })).toBeNull();
    expect(comprobarFichero("documento", { ...pdf, tamano: 30 * 1024 * 1024 })).toBe(
      "cuentas.pdf pesa 30 MB y el máximo son 25 MB.",
    );
  });

  it("el tipo cuenta donde importa", () => {
    expect(comprobarFichero("cv", { nombre: "cv.png", tipo: "image/png", tamano: 1000 })).toMatch(/Sirve PDF o Word/);
    expect(comprobarFichero("evidencia", { nombre: "demo.mp4", tipo: "video/mp4", tamano: 1000 })).toBeNull();
    expect(comprobarFichero("documento", { nombre: "x", tipo: "", tamano: 1000 })).toMatch(/No sabemos/);
  });

  it("las cifras en castellano", () => {
    expect(megas(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });

  it("el nombre en la ruta, sin tildes ni espacios", () => {
    expect(sanear("Cuentas anuales 2025 · versión final.pdf")).toBe("Cuentas-anuales-2025-version-final.pdf");
  });
});
