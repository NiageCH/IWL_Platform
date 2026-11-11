import { describe, expect, it } from "vitest";
import { nombreCompleto, nombrePersona } from "./etiquetas";

describe("cómo se llama alguien donde se le identifica", () => {
  it("nombre y apellidos, sin espacios de sobra", () => {
    expect(nombreCompleto(" Alba ", "García López ")).toBe("Alba García López");
    expect(nombreCompleto("Alba", null)).toBe("Alba");
    expect(nombreCompleto(null, null)).toBe("");
  });

  it("en una lista, con apellidos; sin nombre, el correo; sin nada, se dice", () => {
    expect(nombrePersona({ full_name: "Alba", last_name: "García", email: "a@x.test" })).toBe("Alba García");
    expect(nombrePersona({ full_name: "Alba", email: "a@x.test" })).toBe("Alba");
    expect(nombrePersona({ full_name: " ", last_name: null, email: "a@x.test" })).toBe("a@x.test");
    expect(nombrePersona({})).toBe("Sin nombre ni correo");
  });
});
