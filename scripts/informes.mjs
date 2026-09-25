import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

/**
 * Genera los informes de una compañía en PDF, desde la máquina local.
 *
 * La plataforma no lleva un motor de PDF: los informes se imprimen desde el
 * navegador, que es lo que hace que salgan con el mismo diseño y los mismos
 * gráficos que en pantalla sin arrastrar Chromium al servidor.
 *
 * Esto es lo mismo, en lote: usa el Chromium que ya trae Playwright para
 * sacar los cuatro informes de golpe, que es lo que hace falta cuando se
 * preparan los papeles de una ronda o se archiva el cierre de un trimestre.
 *
 *   npm run informes -- marea-clinica
 *   npm run informes -- marea-clinica 2026-06-01
 */

const SALIDA = resolve("informes");
const BASE = process.env.APP_URL ?? "http://localhost:3000";

const TIPOS = [
  { tipo: "tecnico", nombre: "informe-tecnico-interno" },
  { tipo: "tecnico-inversor", nombre: "informe-tecnico-inversor" },
  { tipo: "aportacion", nombre: "extracto-aportacion" },
  { tipo: "mensual", nombre: "informe-mensual" },
];

function supabase() {
  const salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const leer = (clave) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";
  return { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
}

async function entrar(page, correo) {
  const { url, clave } = supabase();

  const respuesta = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email: correo }),
  });

  const { action_link } = await respuesta.json();
  if (!action_link) {
    throw new Error(`Supabase no ha devuelto enlace de entrada para ${correo}`);
  }

  const enlace = new URL(action_link);
  enlace.searchParams.set("redirect_to", `${BASE}/auth/confirmar?siguiente=%2F`);

  await page.goto(enlace.toString());
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"));
}

const slug = process.argv[2];
const periodo = process.argv[3];

if (!slug) {
  console.error(
    "Falta el identificador de la compañía.\n" +
      "  npm run informes -- marea-clinica\n" +
      "  npm run informes -- marea-clinica 2026-06-01",
  );
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext();
const page = await contexto.newPage();

try {
  await entrar(page, process.env.INFORMES_COMO ?? "programa@iwl.test");

  for (const { tipo, nombre } of TIPOS) {
    const consulta = tipo === "mensual" && periodo ? `?periodo=${periodo}` : "";
    const destino = `${SALIDA}/${slug}-${nombre}.pdf`;

    await page.goto(`${BASE}/informe/${tipo}/${slug}${consulta}`, {
      waitUntil: "networkidle",
    });

    // Los gráficos son SVG que Recharts dibuja al montar: sin esperarlos, el
    // PDF sale con el hueco del radar en blanco
    await page.waitForTimeout(500);

    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: destino,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });

    console.log(`${nombre.padEnd(26)} ${destino}`);
  }
} finally {
  await navegador.close();
}
