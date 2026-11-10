#!/usr/bin/env tsx
/**
 * El PDF de muestra del acta de comité, en sus tres decisiones:
 * preseleccionada, aplazada y descartada. Con datos inventados.
 *
 *   npm run acta:muestra                 a docs/constancia/
 *   npm run acta:muestra -- /tmp/salida
 *
 * Sirve para mirar el diseño página a página: la plataforma solo genera el
 * de verdad cuando firma todo el comité.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generarPdfActa, type DatosActa } from "../lib/acta-pdf";
import { contenidoActa } from "../lib/comite";

const [carpeta = "docs/constancia"] = process.argv.slice(2);

const firma = (nombre: string, correo: string, cuando: string, ip: string) => ({
  nombre,
  correo,
  cuando,
  ip,
  navegador: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
});

const BASE = {
  actaId: "00000000-0000-0000-0000-0000000000a1",
  candidatura: "Startup de Prueba",
  candidaturaId: "00000000-0000-0000-0000-000000000000",
  contacto: "Candidata de Prueba",
  cohorte: "Cohorte de muestra",
  fecha: "2026-11-20",
  resumen:
    "El equipo presenta una solución para la gestión de citas en clínicas pequeñas. Producto en MVP, con dos clínicas en piloto y un acuerdo de pago por uso firmado con una de ellas.\n\nEl comité valora el conocimiento del sector de la fundadora y la claridad del plan para los próximos seis meses. Le preocupa la dependencia de un único desarrollador externo.",
  via: null,
  viaPropuesta: null,
  viaMotivo: null,
  motivo: null,
  revisionOn: null,
  puedeVolver: null,
  firmas: [
    firma("Miembro del Comité Uno", "uno@ejemplo.test", "2026-11-20T10:00:00Z", "203.0.113.7"),
    firma("Miembro del Comité Dos", "dos@ejemplo.test", "2026-11-20T11:15:00Z", "198.51.100.4"),
    firma("Miembro del Comité Tres", "tres@ejemplo.test", "2026-11-20T12:40:00Z", "192.0.2.15"),
  ],
  generado: "2026-11-20T12:40:05Z",
};

const VARIANTES: Record<string, Omit<DatosActa, "hash">> = {
  Preseleccionada: {
    ...BASE,
    decision: "preseleccionada",
    via: "aceleracion",
    viaPropuesta: "construccion",
    viaMotivo: "Ya tiene dos clínicas en piloto y una de ellas paga: entra a acelerar.",
  },
  Aplazada: {
    ...BASE,
    decision: "aplazada",
    revisionOn: "2026-12-15",
    motivo: "Que cierre el segundo acuerdo de pago y resuelva la dependencia del desarrollador externo.",
  },
  Descartada: {
    ...BASE,
    decision: "descartada",
    motivo: "El proyecto queda fuera del foco de esta convocatoria.",
    puedeVolver: true,
  },
};

await mkdir(carpeta, { recursive: true });
for (const [nombre, d] of Object.entries(VARIANTES)) {
  const hash = createHash("sha256")
    .update(contenidoActa({ ...d, miembros: d.firmas.map((f) => f.correo ?? f.nombre) }), "utf8")
    .digest("hex");
  const bytes = await generarPdfActa({ ...d, hash });
  const destino = path.join(carpeta, `IWL_Acta_Muestra_${nombre}.pdf`);
  await writeFile(destino, bytes);
  console.log(`${destino} · ${(bytes.length / 1024).toFixed(0)} KB`);
}
