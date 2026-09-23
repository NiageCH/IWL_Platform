#!/usr/bin/env node
/**
 * Escribe .env.local con las claves de la instancia local de Supabase.
 * Así nadie tiene que copiarlas a mano ni acaban en el repositorio.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

let salida;
try {
  salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  console.error("Supabase local no responde. Ejecuta `npm run db:start` primero.");
  process.exit(1);
}

const leer = (clave) =>
  salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

writeFileSync(
  ".env.local",
  [
    "# Generado por `npm run db:env` desde la instancia local de Supabase.",
    "# No se versiona.",
    `NEXT_PUBLIC_SUPABASE_URL=${leer("API_URL")}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${leer("ANON_KEY")}`,
    `SUPABASE_SERVICE_ROLE_KEY=${leer("SERVICE_ROLE_KEY")}`,
    "",
  ].join("\n"),
);

console.log("Escrito .env.local");
