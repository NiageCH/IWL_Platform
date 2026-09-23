import { defineConfig } from "vitest/config";
import { execFileSync } from "node:child_process";

/**
 * Tests de Row Level Security contra Supabase local.
 *
 * Las claves se leen de `supabase status` en el momento de arrancar, para que
 * nadie tenga que mantener un .env a mano ni se cuele una clave en el
 * repositorio. Si Supabase no está levantado, el test lo dice en claro.
 */
function entornoSupabase(): Record<string, string> {
  let salida: string;
  try {
    salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Supabase local no responde. Ejecuta `npm run db:start` antes de `npm run test:rls`.",
    );
  }

  const leer = (clave: string) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  return {
    SUPABASE_URL: leer("API_URL"),
    SUPABASE_ANON_KEY: leer("ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: leer("SERVICE_ROLE_KEY"),
  };
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    env: entornoSupabase(),
    // Las sesiones se pisan entre sí si los ficheros corren en paralelo
    fileParallelism: false,
    testTimeout: 20000,
  },
});
