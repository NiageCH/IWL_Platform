import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ignore from "ignore";

/**
 * Lo que sube Vercel (REVISION, 24 nov · urgente).
 *
 * La guía salió dos veces vacía en producción con todas las suites en
 * verde: `.vercelignore` excluía `*.md`, también `contenido/guia/`, y la
 * prueba sobre la compilación corre con el disco entero. Esto lee
 * `.vercelignore` con la misma semántica que `.gitignore` y comprueba, fichero
 * a fichero de los versionados, que no deja fuera nada de lo que la
 * aplicación necesita para compilar o en tiempo de ejecución.
 */

const reglas = ignore().add(readFileSync(".vercelignore", "utf8"));
const versionados = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const excluido = (f: string) => reglas.ignores(f);

/** Lo que la compilación lee o empaqueta */
const NECESARIOS = [
  /^contenido\//, // la guía, que se mete en el código en `prebuild`
  /^lib\/fuentes\//, // las fuentes del PDF, que se leen del disco
  /^app\//,
  /^components\//,
  /^lib\/(?!.*\.test\.ts$)/, // el código, sin sus pruebas
  /^public\//,
  /^scripts\/guia-generar\.mjs$/,
  /^(package\.json|package-lock\.json|next\.config\.ts|tsconfig\.json|proxy\.ts|postcss\.config\.mjs)$/,
];

describe(".vercelignore", () => {
  it("no deja fuera nada de lo que la aplicación necesita", () => {
    const fuera = versionados.filter((f) => NECESARIOS.some((r) => r.test(f)) && excluido(f));
    expect(fuera).toEqual([]);
  });

  it("sube la guía entera, uno por cada rol", () => {
    const guia = versionados.filter((f) => f.startsWith("contenido/guia/") && f.endsWith(".md"));
    expect(guia.length).toBeGreaterThanOrEqual(7);
    expect(guia.filter(excluido)).toEqual([]);
  });

  it("y sigue dejando fuera lo que no debe subir", () => {
    for (const f of [".env.local", ".env.produccion", "supabase/seed/local/21_proyectos.sql", "docs/BITACORA.md", "tests/e2e/guia.spec.ts"]) {
      expect(excluido(f), f).toBe(true);
    }
  });
});
