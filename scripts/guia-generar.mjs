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
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "contenido", "guia");
const textos = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => [f.replace(/\.md$/, ""), readFileSync(path.join(dir, f), "utf8")]),
);

const salida = `// Generado por scripts/guia-generar.mjs desde contenido/guia/*.md. No se edita a mano.
export const TEXTOS_GUIA: Record<string, string> = ${JSON.stringify(textos, null, 2)};
`;
writeFileSync(path.join(process.cwd(), "lib", "guia-textos.generado.ts"), salida);
console.log(`Guía: ${Object.keys(textos).length} ficheros en lib/guia-textos.generado.ts`);
