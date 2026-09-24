#!/usr/bin/env node
/**
 * Da de alta las cuentas de desarrollo de quien trabaja en este repositorio.
 *
 * `npm run db:reset` recrea la base y con ella los usuarios: cualquier cuenta
 * que no esté en los datos semilla desaparece, y quien la usaba acaba en la
 * pantalla «sin compañía asignada» sin saber por qué. Este script se encadena
 * al reset y la vuelve a dejar como estaba.
 *
 * Las cuentas se leen de `.altas-locales.json`, que no se versiona: son
 * correos reales de personas concretas y no tienen por qué acabar en el
 * repositorio. Hay un ejemplo en `.altas-locales.example.json`.
 *
 * Si el fichero no existe, no hace nada y no falla: quien no lo necesite no
 * tiene que enterarse de que existe.
 */
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const FICHERO = ".altas-locales.json";

let cuentas;
try {
  cuentas = JSON.parse(await readFile(FICHERO, "utf8"));
} catch (fallo) {
  if (fallo.code === "ENOENT") process.exit(0);
  console.error(`${FICHERO} no es un JSON válido: ${fallo.message}`);
  process.exit(1);
}

if (!Array.isArray(cuentas) || cuentas.length === 0) process.exit(0);

const { url, clave } = entorno();

for (const cuenta of cuentas) {
  const { correo, rol, compania, papel } = cuenta;

  if (!correo || !rol) {
    console.error(`Entrada sin correo o sin rol en ${FICHERO}:`, cuenta);
    continue;
  }

  const argumentos = [correo, rol];
  if (compania) argumentos.push(compania, papel ?? "fundadora");

  try {
    execFileSync("node", ["scripts/alta.mjs", ...argumentos], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: clave },
    });
    console.log(`Cuenta local restaurada: ${correo} · ${rol}`);
  } catch (fallo) {
    console.error(
      `No se ha podido restaurar ${correo}: ${fallo.stderr?.toString().trim() ?? fallo.message}`,
    );
  }
}

function entorno() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      clave: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  const salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  const leer = (clave) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  return { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
}
