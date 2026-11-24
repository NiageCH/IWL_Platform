/**
 * Mete los Markdown de la guía en el código (REVISION, 23 nov · urgente).
 *
 * La guía se leía del disco en cada visita, y en producción salió vacía:
 * el fallo de un fichero que no viaja con el despliegue no lo ve ninguna
 * prueba local, porque en local el disco siempre está. Ahora se genera un
 * módulo al compilar (`prebuild`) y al arrancar en desarrollo (`predev`):
 * corregir el Markdown y desplegar sigue bastando.
 *
 * El módulo generado se versiona para que tsc y las pruebas lo encuentren
 * sin compilar antes; una prueba comprueba que coincide con los Markdown.
 *
 * **Falla, no genera vacío** (REVISION, 24 nov · urgente). En Vercel, un
 * `.vercelignore` dejó fuera los `.md`: el generador encontró la carpeta
 * vacía, sobrescribió el módulo con `{}` y la guía salió rota en
 * producción con la compilación en verde. Ahora, si falta la carpeta o
 * algún fichero de los que pide `FICHERO_GUIA`, la compilación se para.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const dir = path.join(raiz, "contenido", "guia");

function parar(motivo) {
  console.error(`\nGuía: ${motivo}\nNo se genera lib/guia-textos.generado.ts: la compilación se para aquí.\n`);
  process.exit(1);
}

// Los que tienen que estar: los que nombra `FICHERO_GUIA`, en lib/guia.ts
const fuente = readFileSync(path.join(raiz, "lib", "guia.ts"), "utf8");
const bloque = fuente.match(/FICHERO_GUIA[^{]*\{([^}]*)\}/);
if (!bloque) parar("no se encuentra FICHERO_GUIA en lib/guia.ts.");
const pedidos = [...new Set([...bloque[1].matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]))];
if (!pedidos.length) parar("FICHERO_GUIA no nombra ningún fichero.");

if (!existsSync(dir)) parar(`no existe ${path.relative(raiz, dir)}. ¿Lo excluye .vercelignore?`);

const textos = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => [f.replace(/\.md$/, ""), readFileSync(path.join(dir, f), "utf8")]),
);

const faltan = pedidos.filter((f) => !textos[f]?.trim());
if (faltan.length) {
  parar(`faltan o están vacíos ${faltan.map((f) => `contenido/guia/${f}.md`).join(", ")}. ¿Los excluye .vercelignore?`);
}

const salida = `// Generado por scripts/guia-generar.mjs desde contenido/guia/*.md. No se edita a mano.
export const TEXTOS_GUIA: Record<string, string> = ${JSON.stringify(textos, null, 2)};
`;
writeFileSync(path.join(raiz, "lib", "guia-textos.generado.ts"), salida);
console.log(`Guía: ${Object.keys(textos).length} ficheros en lib/guia-textos.generado.ts`);
