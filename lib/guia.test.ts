import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { FICHERO_GUIA, leerGuia, leerLinea } from "./guia";

describe("leer la guía", () => {
  it("títulos, párrafos y listas", () => {
    const b = leerGuia("# Tu guía\n\nUna línea\nque sigue.\n\n## Tu papel\n\n- Uno\n- Dos\n  que sigue\n\n1. Primero\n2. Segundo\n");
    expect(b).toEqual([
      { tipo: "titulo", nivel: 1, texto: "Tu guía" },
      { tipo: "parrafo", trozos: [{ tipo: "texto", texto: "Una línea que sigue." }] },
      { tipo: "titulo", nivel: 2, texto: "Tu papel" },
      { tipo: "lista", ordenada: false, items: [[{ tipo: "texto", texto: "Uno" }], [{ tipo: "texto", texto: "Dos que sigue" }]] },
      { tipo: "lista", ordenada: true, items: [[{ tipo: "texto", texto: "Primero" }], [{ tipo: "texto", texto: "Segundo" }]] },
    ]);
  });

  it("negrita, código y enlaces dentro de una línea", () => {
    expect(leerLinea("Pulsa **Registrar** en [Sesiones](/proyecto/sesiones) o `#anexo`.")).toEqual([
      { tipo: "texto", texto: "Pulsa " },
      { tipo: "negrita", texto: "Registrar" },
      { tipo: "texto", texto: " en " },
      { tipo: "enlace", texto: "Sesiones", href: "/proyecto/sesiones" },
      { tipo: "texto", texto: " o " },
      { tipo: "codigo", texto: "#anexo" },
      { tipo: "texto", texto: "." },
    ]);
  });
});

describe("los ficheros de la guía", () => {
  const dir = path.join(process.cwd(), "contenido", "guia");

  it("hay uno por rol, y ninguno sobra", () => {
    const ficheros = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
    expect(new Set(ficheros)).toEqual(new Set(Object.values(FICHERO_GUIA)));
  });

  it("cada uno empieza por su título y tiene los cuatro apartados", () => {
    for (const f of Object.values(FICHERO_GUIA)) {
      const bloques = leerGuia(readFileSync(path.join(dir, `${f}.md`), "utf8"));
      expect(bloques[0], f).toMatchObject({ tipo: "titulo", nivel: 1 });
      const apartados = bloques.filter((b) => b.tipo === "titulo" && b.nivel === 2).map((b) => (b as { texto: string }).texto);
      expect(apartados, f).toEqual(expect.arrayContaining(["Qué es la plataforma", "Tu papel", "De qué dependes y quién depende de ti", "Cómo se hace"]));
    }
  });

  it("los enlaces internos llevan a una página que existe", () => {
    const rutas = new Set<string>();
    for (const f of Object.values(FICHERO_GUIA)) {
      for (const m of readFileSync(path.join(dir, `${f}.md`), "utf8").matchAll(/\]\((\/[^)#?\s]*)/g)) rutas.add(m[1]);
    }
    const existe = (ruta: string) => {
      const partes = ruta.split("/").filter(Boolean);
      const grupos = ["", "(iwl)", "(fundadora)"];
      return grupos.some((g) => {
        try {
          return readdirSync(path.join(process.cwd(), "app", g, ...partes)).includes("page.tsx");
        } catch {
          return false;
        }
      });
    };
    for (const r of rutas) expect(existe(r), r).toBe(true);
  });
});
