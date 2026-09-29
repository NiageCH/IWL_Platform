#!/usr/bin/env node
/**
 * Pone una contraseña nueva y distinta a cada cuenta.
 *
 * Por qué hace falta: los seeds locales crean al equipo con una contraseña
 * fija escrita en el propio fichero (`iwl-local-2026`). En el portátil de
 * cada cual eso es cómodo y no expone nada. En un proyecto de la nube con
 * una dirección pública es una puerta abierta: la misma clave para siete
 * cuentas, dos de ellas de dirección, y escrita en un archivo.
 *
 * Así que después de sembrar la nube hay que pasar por aquí.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/claves.mjs
 *   … node scripts/claves.mjs ana@iwl.es luis@iwl.es    (solo esas)
 *
 * Las contraseñas no se imprimen en pantalla: van a `.accesos-nube.md`, que
 * está en .gitignore. Se reparten desde ahí y se borra el fichero. Cada
 * persona puede cambiarla luego en Mi cuenta.
 */
import { writeFileSync } from "node:fs";

const SALIDA = ".accesos-nube.md";

/** Tres palabras y un número: se dicta por teléfono sin deletrear */
function generarClave() {
  const palabras = [
    "faro", "duna", "brisa", "roble", "cauce", "sierra", "ambar", "junco",
    "vela", "musgo", "risco", "trigo", "nieve", "cala", "olmo", "surco",
    "puerto", "ladera", "estero", "abeto", "marea", "vereda",
  ];
  const azar = (n) => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] % n;
  };
  const tres = Array.from({ length: 3 }, () => palabras[azar(palabras.length)]);
  return `${tres.join("-")}-${10 + azar(90)}`;
}

const url = process.env.SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !clave) {
  console.error(
    "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Están en el panel del proyecto, en Project Settings → API.",
  );
  process.exit(1);
}

const cabeceras = {
  apikey: clave,
  Authorization: `Bearer ${clave}`,
  "Content-Type": "application/json",
};

const pedidos = process.argv.slice(2).map((c) => c.toLowerCase());

/*
 * Se rota lo que tenga perfil en la plataforma. Las cuentas de Auth sin
 * perfil no pueden entrar a nada, y las de dominio .test son marcadores de
 * los seeds: cambiarles la clave no sirve de nada porque nadie las usa.
 */
const respuesta = await fetch(
  `${url}/rest/v1/profiles?select=id,email,full_name,role&order=role,email`,
  { headers: cabeceras },
);

if (!respuesta.ok) {
  console.error("No se ha podido leer la lista de personas:", await respuesta.text());
  process.exit(1);
}

const todas = await respuesta.json();

const personas = todas.filter((p) => {
  if (pedidos.length) return pedidos.includes(p.email?.toLowerCase());
  return !p.email?.endsWith(".test");
});

if (!personas.length) {
  console.error(
    pedidos.length
      ? "Ninguno de esos correos tiene perfil en la plataforma."
      : "No hay ninguna cuenta a la que cambiar la contraseña.",
  );
  process.exit(1);
}

console.log(`Cambiando la contraseña de ${personas.length} cuentas…\n`);

const hechas = [];

for (const persona of personas) {
  const nueva = generarClave();
  const puesta = await fetch(`${url}/auth/v1/admin/users/${persona.id}`, {
    method: "PUT",
    headers: cabeceras,
    body: JSON.stringify({ password: nueva }),
  });

  if (!puesta.ok) {
    console.error(`  ${persona.email}: FALLA — ${await puesta.text()}`);
    continue;
  }

  console.log(`  ${persona.email}: hecha`);
  hechas.push({ ...persona, clave: nueva });
}

if (!hechas.length) process.exit(1);

const ancho = (campo, minimo) =>
  Math.max(minimo, ...hechas.map((p) => (p[campo] ?? "").length));

const anchoNombre = ancho("full_name", 6);
const anchoCorreo = ancho("email", 6);
const anchoRol = ancho("role", 3);
const anchoClave = ancho("clave", 11);

const fila = (n, c, r, k) =>
  `| ${n.padEnd(anchoNombre)} | ${c.padEnd(anchoCorreo)} | ${r.padEnd(anchoRol)} | ${k.padEnd(anchoClave)} |`;

const tabla = [
  fila("Nombre", "Correo", "Rol", "Contraseña"),
  `|${"-".repeat(anchoNombre + 2)}|${"-".repeat(anchoCorreo + 2)}|${"-".repeat(anchoRol + 2)}|${"-".repeat(anchoClave + 2)}|`,
  ...hechas.map((p) =>
    fila(p.full_name ?? "", p.email ?? "", p.role ?? "", p.clave),
  ),
].join("\n");

writeFileSync(
  SALIDA,
  `# Accesos\n\n` +
    `Generado el ${new Date().toISOString().slice(0, 10)} contra ${url}\n\n` +
    `${tabla}\n\n` +
    `Reparte cada línea a quien corresponda y borra este fichero. Cada\n` +
    `persona puede cambiar su contraseña desde Mi cuenta, y desde\n` +
    `Administración → Personas se le puede poner otra.\n`,
  "utf8",
);

console.log(
  `\nListo. La tabla está en ${SALIDA} (ignorado por git).\n` +
    "Repártela y borra el fichero.",
);
