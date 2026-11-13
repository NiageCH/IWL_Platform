import { describe, expect, it } from "vitest";
import { normalizarLinkedin } from "./linkedin";

describe("el LinkedIn de una persona", () => {
  it("lo pegado de cualquier manera queda en su forma canónica", () => {
    const canonica = "https://www.linkedin.com/in/alba-garcia";
    expect(normalizarLinkedin("https://www.linkedin.com/in/alba-garcia")).toBe(canonica);
    expect(normalizarLinkedin("linkedin.com/in/alba-garcia/")).toBe(canonica);
    expect(normalizarLinkedin("  https://es.linkedin.com/in/alba-garcia?utm_source=share  ")).toBe(canonica);
    expect(normalizarLinkedin("http://www.linkedin.com/in/alba-garcia#x")).toBe(canonica);
  });

  it("vacío es quitarlo", () => {
    expect(normalizarLinkedin("")).toBe("");
    expect(normalizarLinkedin("   ")).toBe("");
    expect(normalizarLinkedin(null)).toBe("");
  });

  it("solo perfiles personales de LinkedIn", () => {
    expect(normalizarLinkedin("https://www.linkedin.com/company/iwl")).toBeNull();
    expect(normalizarLinkedin("https://www.linkedin.com/in/")).toBeNull();
    expect(normalizarLinkedin("https://www.linkedin.com/in/alba/detalles")).toBeNull();
    expect(normalizarLinkedin("https://linkedin.com.ejemplo.net/in/alba")).toBeNull();
    expect(normalizarLinkedin("https://ejemplo.net/in/alba")).toBeNull();
    expect(normalizarLinkedin("javascript:alert(1)")).toBeNull();
    expect(normalizarLinkedin("alba garcía")).toBeNull();
  });
});
