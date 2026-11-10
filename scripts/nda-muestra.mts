#!/usr/bin/env tsx
/**
 * El PDF de muestra del NDA, en sus dos variantes: firmado por una persona
 * física y en nombre de una sociedad. Con datos inventados.
 *
 *   npm run nda:muestra                    la plantilla de prueba de la semilla
 *   npm run nda:muestra -- plantilla.md    otra, por ejemplo la real antes de pegarla
 *   npm run nda:muestra -- plantilla.md /tmp/salida
 *
 * Sale en `docs/constancia/` si no se dice otra carpeta. Sirve para mirar
 * el formato página a página antes de dar una plantilla por buena: la
 * plataforma solo genera el PDF de verdad con las dos firmas puestas.
 * Antes de pintar nada, dice si la plantilla tiene algún problema que no la
 * dejaría guardar o enviar.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generarPdfNda } from "../lib/nda-pdf";
import { completarNda, huecos, problemaParaEnviar } from "../lib/nda-texto";

const [origen, carpeta = "docs/constancia"] = process.argv.slice(2);

async function plantilla(): Promise<string> {
  if (origen) return readFile(origen, "utf8");
  const sql = await readFile("supabase/seed/09_nda_prueba.sql", "utf8");
  const m = sql.match(/\$nda\$([\s\S]*?)\$nda\$/);
  if (!m) throw new Error("No encuentro la plantilla de prueba en la semilla");
  return m[1];
}

const texto = await plantilla();
const problema = problemaParaEnviar(texto);
if (problema) {
  console.error(`La plantilla no se podría enviar: ${problema}`);
  process.exit(1);
}

const BASE = { startup: "Startup de Prueba", contraparte_nombre: "Candidata de Prueba", lugar: "Málaga" };
const VARIANTES = {
  persona: { ...BASE, es_sociedad: false, documento: "00000000T", domicilio: "Calle de Prueba 1, 29001 Málaga" },
  sociedad: {
    ...BASE,
    es_sociedad: true,
    documento: "00000000T",
    domicilio: "Calle de Prueba 1, 29001 Málaga",
    denominacion: "Startup de Prueba, S.L.",
    nif: "B00000000",
    cargo: "Administradora única",
  },
};

await mkdir(carpeta, { recursive: true });
for (const [nombre, datos] of Object.entries(VARIANTES)) {
  const completado = completarNda(texto, datos);
  const faltan = huecos(completado);
  if (faltan.length) {
    console.error(`${nombre}: quedan huecos sin rellenar: ${faltan.join(", ")}`);
    process.exit(1);
  }
  const bytes = await generarPdfNda({
    candidatura: "Startup de Prueba",
    candidaturaId: "00000000-0000-0000-0000-000000000000",
    texto: completado,
    version: "de muestra",
    hash: createHash("sha256").update(completado, "utf8").digest("hex"),
    ella: {
      nombre: "Candidata de Prueba",
      correo: "candidata@ejemplo.test",
      cuando: "2026-11-10T09:30:00Z",
      ip: "203.0.113.7",
      navegador: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    },
    iwl: {
      nombre: "Dirección de IWL (prueba)",
      correo: "direccion@ejemplo.test",
      cuando: "2026-11-10T11:00:00Z",
      ip: "198.51.100.4",
      navegador: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
    },
    generado: "2026-11-10T11:00:05Z",
  });
  const destino = path.join(carpeta, `IWL_NDA_Muestra_${nombre === "persona" ? "PersonaFisica" : "Sociedad"}.pdf`);
  await writeFile(destino, bytes);
  console.log(`${destino} · ${(bytes.length / 1024).toFixed(0)} KB`);
}
