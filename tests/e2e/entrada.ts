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

/**
 * Borra filas con la clave de servicio.
 *
 * Los tests de interfaz no reinician la base, así que los que crean cosas
 * tienen que dejarla como estaba o no pasan dos veces seguidas. Se usa solo
 * para preparar y limpiar, nunca para comprobar: con la clave de servicio no
 * se aplica Row Level Security y el test no probaría nada.
 */
export async function borrar(
  tabla: string,
  filtro: Record<string, string>,
): Promise<void> {
  const { url, clave } = supabase();
  const consulta = new URLSearchParams(
    Object.entries(filtro).map(([k, v]) => [k, `eq.${v}`]),
  );

  const respuesta = await fetch(`${url}/rest/v1/${tabla}?${consulta}`, {
    method: "DELETE",
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      Prefer: "return=minimal",
    },
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se ha podido limpiar ${tabla}: ${respuesta.status} ${await respuesta.text()}`,
    );
  }
}

export const COMPANIAS = {
  marea: "00000000-0000-0000-0004-000000000001",
  vega: "00000000-0000-0000-0004-000000000002",
  raiz: "00000000-0000-0000-0004-000000000003",
} as const;

/**
 * Deja un ajuste de plataforma como estaba, con la clave de servicio.
 *
 * Las pruebas que tocan configuración la restauraban volviendo a usar el
 * mismo formulario que estaban probando. Si el test se cortaba a mitad, el
 * valor quedaba cambiado y la siguiente pasada fallaba por un motivo que no
 * tenía nada que ver con lo que se quería comprobar. Restaurar por fuera del
 * camino que se prueba es lo único que hace la suite repetible.
 */
export async function ajustar(
  clave: string,
  valor: Record<string, number>,
): Promise<void> {
  const { url, clave: servicio } = supabase();

  const respuesta = await fetch(
    `${url}/rest/v1/platform_settings?key=eq.${clave}`,
    {
      method: "PATCH",
      headers: {
        apikey: servicio,
        Authorization: `Bearer ${servicio}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ value: valor }),
    },
  );

  if (!respuesta.ok) {
    throw new Error(
      `No se ha podido restaurar ${clave}: ${respuesta.status} ${await respuesta.text()}`,
    );
  }
}

/** Los valores de fábrica de lo que las pruebas tocan */
export const AJUSTES_BASE = {
  umbrales_invertible: {
    score_tecnico_minimo: 80,
    score_preparacion_minimo: 80,
    runway_minimo_meses: 6,
  },
  pesos_madurez: {
    tecnologia: 30,
    gobierno: 20,
    plan: 20,
    traccion: 20,
    solidez: 10,
  },
} as const;
