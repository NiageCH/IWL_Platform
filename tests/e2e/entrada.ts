import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";

/**
 * Entrada en la aplicación para los tests de interfaz.
 *
 * Se pide a Supabase un enlace de entrada con la clave de servicio y se abre,
 * que es exactamente lo que hace una persona al recibir su correo. No se
 * inyectan cookies a mano: así el test también cubre el proxy y la ruta de
 * confirmación.
 */

let cache: { url: string; clave: string } | null = null;

function supabase() {
  if (cache) return cache;

  const salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  const leer = (clave: string) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  cache = { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
  return cache;
}

export async function entrarComo(page: Page, email: string, destino = "/") {
  const { url, clave } = supabase();

  const respuesta = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });

  const { action_link } = (await respuesta.json()) as { action_link?: string };

  if (!action_link) {
    throw new Error(`Supabase no ha devuelto enlace de entrada para ${email}`);
  }

  const enlace = new URL(action_link);
  enlace.searchParams.set(
    "redirect_to",
    `http://localhost:3000/auth/confirmar?siguiente=${encodeURIComponent(destino)}`,
  );

  await page.goto(enlace.toString());
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"));
}

export const USUARIOS = {
  admin: "admin@iwl.test",
  equipoIwl: "programa@iwl.test",
  fundadoraMarea: "fundadora@marea.test",
  fundadoraVega: "fundadora@vega.test",
  revisorMarea: "revisor@niage.test",
  revisorVega: "revisor2@niage.test",
} as const;
