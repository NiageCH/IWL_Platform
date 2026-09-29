#!/usr/bin/env node
/**
 * Lleva la configuración del programa y los datos locales al proyecto de
 * Supabase en la nube.
 *
 * Qué sube:
 *   · `supabase/seed/01_config.sql` — fases, pilares, áreas, dimensiones
 *     técnicas, KPI, tarifas y recorridos. Es configuración del programa y
 *     sin ella la plataforma no puede calcular nada.
 *   · `supabase/seed/local/*.sql` — el equipo de IWL y los proyectos reales,
 *     que no están en el repositorio.
 *
 * Qué NO sube, a propósito: las compañías de demostración. El repositorio
 * las lleva porque las pruebas se apoyan en ellas y porque la especificación
 * prohíbe nombres reales ahí, pero en una instalación de trabajo estorban.
 *
 * Y crea la cuenta de dirección, porque sin nadie dentro no hay forma de
 * entrar a poner las demás.
 *
 *   npm run sembrar:nube
 *   npm run sembrar:nube -- --solo-config      (sin los datos locales)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const soloConfig = process.argv.includes("--solo-config");

/*
 * La conexión sale de `supabase link`, que ya guarda la referencia del
 * proyecto. Pedirla otra vez sería una forma de equivocarse de base.
 */
function proyectoEnlazado() {
  try {
    const salida = execFileSync("npx", ["supabase", "projects", "list", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const enlazado = JSON.parse(salida).find((p) => p.linked);
    if (!enlazado) return null;
    return { id: enlazado.id, nombre: enlazado.name, region: enlazado.region };
  } catch {
    return null;
  }
}

const proyecto = proyectoEnlazado();

if (!proyecto) {
  console.error(
    "No hay ningún proyecto enlazado.\n" +
      "  npx supabase login\n" +
      "  npx supabase link --project-ref <referencia>\n" +
      "La referencia está en la dirección del panel, entre /project/ y la barra.",
  );
  process.exit(1);
}

console.log(`Proyecto: ${proyecto.nombre} (${proyecto.id}) · ${proyecto.region}`);

if (!/eu-|europe/i.test(proyecto.region ?? "")) {
  console.warn(
    `\n  Atención: la región es «${proyecto.region}».\n` +
      "  El documento de alcance pide los datos en la UE, y la región de un\n" +
      "  proyecto de Supabase no se cambia: habría que crear otro.\n",
  );
}

const ficheros = ["supabase/seed/01_config.sql"];

if (!soloConfig && existsSync("supabase/seed/local")) {
  const locales = readdirSync("supabase/seed/local")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => `supabase/seed/local/${f}`);
  ficheros.push(...locales);
}

console.log("\nSe va a ejecutar, en este orden:");
for (const f of ficheros) {
  const lineas = readFileSync(f, "utf8").split("\n").length;
  console.log(`  ${f}  (${lineas} líneas)`);
}

const consola = createInterface({ input: stdin, output: stdout });
const respuesta = await consola.question(
  "\nEsto escribe en la base de producción. ¿Seguimos? (escribe «sí») ",
);
consola.close();

if (!/^s[ií]$/i.test(respuesta.trim())) {
  console.log("Cancelado. No se ha tocado nada.");
  process.exit(0);
}

for (const fichero of ficheros) {
  process.stdout.write(`\n${fichero} … `);
  try {
    /*
     * `db query --file --linked` ejecuta el fichero contra el proyecto
     * enlazado, a través de la API de gestión. No hace falta la contraseña
     * de la base: basta con la sesión de `supabase login`.
     */
    execFileSync("npx", ["supabase", "db", "query", "--file", fichero, "--linked"], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    console.log("hecho");
  } catch (fallo) {
    console.log("FALLA");
    console.error(fallo.stderr?.toString().trim() ?? fallo.message);
    console.error(
      "\nSe ha parado aquí. Los ficheros anteriores sí se han aplicado; los\n" +
        "seeds son idempotentes, así que se puede volver a lanzar entero.",
    );
    process.exit(1);
  }
}

console.log(
  "\nListo.\n\n" +
    "  ATENCIÓN: los seeds locales crean al equipo con una contraseña fija\n" +
    "  escrita en el propio fichero. En la nube eso es una puerta abierta.\n" +
    "  Cámbialas ahora, antes de dar la dirección a nadie:\n\n" +
    "    SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<clave> \\\n" +
    "      node scripts/claves.mjs\n\n" +
    "Si la base se ha quedado sin personas, da de alta primero a alguien de\n" +
    "dirección, que es quien puede crear a las demás:\n\n" +
    "  SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<clave> \\\n" +
    "    node scripts/alta.mjs tu@correo.com admin_iwl \"\" \"\" \"Tu Nombre\"",
);
