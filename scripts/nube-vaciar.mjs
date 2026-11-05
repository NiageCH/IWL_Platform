#!/usr/bin/env node
/**
 * Vaciar la nube de datos de prueba.
 *
 *   npm run nube:vaciar                     qué borraría, sin borrar
 *   npm run nube:vaciar -- --confirmar      lo borra
 *   npm run nube:vaciar -- --local [...]    lo mismo contra la base local
 *
 * Todo lo que había en la nube antes del 5 de noviembre eran pruebas. Esto
 * la deja lista para cargar las compañías reales desde la plataforma:
 *
 * · **Borra todas las compañías** y sus ficheros, salvo la de demostración
 *   (`is_demo`), que sostiene las cuentas de revisión.
 * · **Borra todas las candidaturas** y sus ficheros, salvo tres de muestra
 *   —abierta, firmada y descartada—, marcadas `is_demo` para que se vean y
 *   no cuenten. Si falta alguna, la crea. Están en `muestras.mjs`.
 * · **No toca** la configuración del programa —cohortes, fases, pilares,
 *   áreas, dimensiones, KPI, tarifas, recorridos— ni las cuentas: de esas
 *   se encarga `cuentas:nube -- --limpiar`.
 * · Antes de borrar escribe la **constancia** en `docs/constancia/`, que no
 *   se versiona, y al terminar deja una fila en el registro de actividad.
 *
 * Dos seguros:
 *
 * · **Contra la base local se niega salvo con `--local`.** En local esto
 *   se lleva la semilla entera de la que dependen las pruebas.
 * · **Contra la nube se niega mientras `rodrigo@niage.es` no funcione**:
 *   que exista, sea dirección, haya entrado y haya cambiado su contraseña
 *   temporal. Vaciar la plataforma sin nadie que pueda entrar a cargarla
 *   otra vez no tiene arreglo desde la propia plataforma.
 *
 * El orden al borrar no es arbitrario. Primero las candidaturas: una
 * firmada no deja borrar su compañía —la base exige que una firmada tenga
 * compañía—. Después se crean las muestras que falten, porque la firmada
 * se engancha a la demostración y una compañía solo puede venir de una
 * candidatura. Después las compañías. Los ficheros, al final: si la base
 * se negara a algo, siguen donde estaban.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PRINCIPAL } from "./cuentas-lista.mjs";
import { muestras } from "./muestras.mjs";

const argumentos = new Set(process.argv.slice(2));
const confirmar = argumentos.has("--confirmar");
const local = argumentos.has("--local");

/*
 * Solo para probar contra la base local sin llevarse la semilla: limita lo
 * que se borra a compañías y candidaturas cuyo nombre empiece así. Solo
 * puede reducir lo que se borra, nunca ampliarlo.
 */
const SOLO = process.env.VACIAR_SOLO ?? "";

const esLocal = (url) => /\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url);

function conexion() {
  if (local) {
    let salida;
    try {
      salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      console.error("Supabase local no responde. Ejecuta `npm run db:start`.");
      process.exit(1);
    }
    const leer = (k) => salida.match(new RegExp(`^${k}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";
    return { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
  }

  let texto;
  try {
    texto = readFileSync(".env.produccion", "utf8");
  } catch {
    console.error("No encuentro .env.produccion. Es el fichero con la URL y las claves de la nube.");
    process.exit(1);
  }
  const leer = (k) => texto.match(new RegExp(`^${k}=\\s*"?([^"\\n]+?)"?\\s*$`, "m"))?.[1] ?? "";
  return { url: leer("NEXT_PUBLIC_SUPABASE_URL"), clave: leer("SUPABASE_SERVICE_ROLE_KEY") };
}

const { url: URL_, clave: CLAVE } = conexion();

if (!URL_ || !CLAVE) {
  console.error("Faltan la URL o la clave de servicio.");
  process.exit(1);
}
if (esLocal(URL_) && !local) {
  console.error(`${URL_} es la base local. Contra ella solo con --local: se lleva la semilla de las pruebas.`);
  process.exit(1);
}

const cab = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
  "Content-Type": "application/json",
};

async function leer(ruta) {
  const r = await fetch(`${URL_}/rest/v1/${ruta}`, { headers: cab });
  if (!r.ok) throw new Error(`${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

/** Cuántas filas cumplen un filtro. `null` si la tabla o la columna no existen */
async function contar(tabla, filtro) {
  const r = await fetch(`${URL_}/rest/v1/${tabla}?select=*&${filtro}`, {
    method: "HEAD",
    headers: { ...cab, Prefer: "count=exact" },
  });
  if (!r.ok) return null;
  return Number(r.headers.get("content-range")?.split("/")[1] ?? 0);
}

/** Todos los ficheros bajo una carpeta, bajando por las subcarpetas */
async function ficheros(bucket, carpeta) {
  const r = await fetch(`${URL_}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({ prefix: carpeta, limit: 1000, offset: 0 }),
  });
  if (!r.ok) return [];
  const salida = [];
  for (const e of await r.json()) {
    const ruta = `${carpeta}/${e.name}`;
    // Una carpeta no tiene id: es un prefijo, no un objeto
    if (e.id === null) salida.push(...(await ficheros(bucket, ruta)));
    else salida.push(ruta);
  }
  return salida;
}

async function quitarFicheros(bucket, rutas) {
  const sobran = [];
  for (let i = 0; i < rutas.length; i += 100) {
    const lote = rutas.slice(i, i + 100);
    const r = await fetch(`${URL_}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: cab,
      body: JSON.stringify({ prefixes: lote }),
    });
    if (!r.ok) sobran.push(...lote);
  }
  return sobran;
}

const dia = (f) => (f ? String(f).slice(0, 16).replace("T", " ") : "—");

console.log(`Instancia: ${URL_}${local ? "  (LOCAL)" : ""}\n`);

// --- El seguro de la nube -----------------------------------------------------

if (!local) {
  const { users = [] } = await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: cab })
    .then((r) => r.json());
  const principal = users.find((u) => u.email === PRINCIPAL);
  const papel = principal
    ? (await leer(`profiles?select=role&id=eq.${principal.id}`))[0]?.role
    : null;
  const motivos = [];
  if (!principal) motivos.push("no existe.");
  else {
    if (papel !== "admin_iwl") motivos.push(`tiene el papel «${papel ?? "ninguno"}», no el de dirección.`);
    if (!principal.last_sign_in_at) motivos.push("no ha entrado nunca.");
    if (principal.app_metadata?.debe_cambiar_password === true) {
      motivos.push("todavía tiene la contraseña temporal.");
    }
  }
  if (motivos.length) {
    console.error(`No vacío nada: ${PRINCIPAL} ${motivos.join(" Y ")}`);
    console.error("Sin una cuenta de dirección que funcione, no habría quién cargara la plataforma otra vez.");
    process.exit(1);
  }
}

// --- Qué se queda ---------------------------------------------------------------

const demos = await leer("companies?select=id,name,slug&is_demo=eq.true");
if (demos.length !== 1) {
  console.error(
    demos.length
      ? `Hay ${demos.length} compañías de demostración (${demos.map((d) => d.slug).join(", ")}). Tiene que haber una: no sé cuál conservar.`
      : "No hay compañía de demostración. Sin ella las cuentas de revisión se quedan colgando: marca una con is_demo antes.",
  );
  process.exit(1);
}
const [demo] = demos;

const hoy = new Date().toISOString().slice(0, 10);
const definidas = muestras({ compania: demo.id, hoy });
const candidaturas = await leer(
  "candidaturas?select=*,companies(slug,name)&order=created_at",
);

const muestrasHoy = definidas.map((m) => ({
  ...m,
  existente: candidaturas.find((c) => c.nombre === m.fila.nombre) ?? null,
}));
const seQuedan = new Set(muestrasHoy.filter((m) => m.existente).map((m) => m.existente.id));

const empiezaPor = (nombre) => !SOLO || (nombre ?? "").startsWith(SOLO);

const candidaturasFuera = candidaturas.filter((c) => !seQuedan.has(c.id) && empiezaPor(c.nombre));
const companias = await leer("companies?select=*&is_demo=eq.false&order=created_at");
const companiasFuera = companias.filter((c) => empiezaPor(c.name));

// --- La constancia ---------------------------------------------------------------

/*
 * Lo que cuelga de una compañía, para que la constancia diga qué se fue
 * con ella. Una tabla que no tenga `company_id` devuelve `null` y no sale.
 */
const DE_LA_COMPANIA = [
  "company_members", "dd_items", "documents", "document_versions", "bp_sections",
  "company_kpis", "kpi_values", "monthly_updates", "annexes", "baselines",
  "contribution_hours", "cash_disbursements", "roadmap_stages", "milestones",
  "progress_entries", "tech_assessments", "tech_findings", "tasks", "comments",
  "readiness_snapshots", "activity_log",
];

console.log(`Recojo lo que hay: ${companiasFuera.length} compañías y ${candidaturasFuera.length} candidaturas…`);

const fichasCompania = [];
for (const c of companiasFuera) {
  const cuentas = await Promise.all(DE_LA_COMPANIA.map((t) => contar(t, `company_id=eq.${c.id}`)));
  fichasCompania.push({
    fila: c,
    contenido: Object.fromEntries(
      DE_LA_COMPANIA.map((t, i) => [t, cuentas[i]]).filter(([, n]) => n),
    ),
    ficheros: {
      logos: await ficheros("logos", c.id),
      "data-room": await ficheros("data-room", c.id),
    },
  });
}

const fichasCandidatura = [];
for (const c of candidaturasFuera) {
  const [documentos, eventos, peticiones, enlaces] = await Promise.all(
    ["candidatura_documentos", "candidatura_eventos", "candidatura_peticiones", "candidatura_enlaces"]
      .map((t) => contar(t, `candidatura_id=eq.${c.id}`)),
  );
  fichasCandidatura.push({
    fila: c,
    contenido: { documentos, eventos, peticiones, enlaces },
    ficheros: { candidaturas: await ficheros("candidaturas", c.id) },
  });
}

const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const base = `docs/constancia/nube-vaciar-${sello}${confirmar ? "-borrado" : "-simulacion"}`;
mkdirSync("docs/constancia", { recursive: true });

const nFicheros = (f) => Object.values(f.ficheros).reduce((n, l) => n + l.length, 0);
const md = [
  `# Nube vaciada${confirmar ? "" : " (simulación)"} · ${sello}`,
  "",
  `Instancia: ${URL_}`,
  `Por: \`npm run nube:vaciar${local ? " -- --local" : ""}${confirmar ? " --confirmar" : ""}\``,
  `Horas en UTC. Las filas enteras, en \`${base.split("/").pop()}.json\`.`,
  "",
  `Se queda la demostración: **${demo.name}** (\`${demo.slug}\`).`,
  "",
  `## Compañías (${fichasCompania.length})`,
  "",
  "| Compañía | Alta | Archivada | Contenido | Ficheros |",
  "|---|---|---|---|---|",
  ...fichasCompania.map((f) =>
    `| ${f.fila.name} (\`${f.fila.slug}\`) | ${dia(f.fila.created_at)} | ${f.fila.archived_at ? dia(f.fila.archived_at) : "no"} | ${Object.entries(f.contenido).map(([t, n]) => `${t} ${n}`).join(", ") || "nada"} | ${nFicheros(f)} |`),
  "",
  `## Candidaturas (${fichasCandidatura.length})`,
  "",
  "| Candidatura | Estado | Contacto | Alta | Compañía | Documentos | Ficheros |",
  "|---|---|---|---|---|---|---|",
  ...fichasCandidatura.map((f) =>
    `| ${f.fila.nombre}${f.fila.is_demo ? " (demo)" : ""} | ${f.fila.estado} | ${f.fila.contacto_email} | ${dia(f.fila.created_at)} | ${f.fila.companies?.slug ?? "—"} | ${f.contenido.documentos ?? 0} | ${nFicheros(f)} |`),
  "",
  "## Muestras",
  "",
  ...muestrasHoy.map((m) =>
    `· ${m.clave}: «${m.fila.nombre}» — ${m.existente ? "ya está, se queda" : "no está, se crea"}`),
  "",
];
writeFileSync(`${base}.md`, md.join("\n"));
writeFileSync(
  `${base}.json`,
  JSON.stringify({ instancia: URL_, confirmar, demo, companias: fichasCompania, candidaturas: fichasCandidatura }, null, 2),
);

console.log(`\nSe queda la demostración: ${demo.name} (${demo.slug})`);
console.log(`${confirmar ? "Borro" : "Borraría"} ${fichasCompania.length} compañías (${fichasCompania.reduce((n, f) => n + nFicheros(f), 0)} ficheros)`);
console.log(`${confirmar ? "Borro" : "Borraría"} ${fichasCandidatura.length} candidaturas (${fichasCandidatura.reduce((n, f) => n + nFicheros(f), 0)} ficheros)`);
for (const m of muestrasHoy) {
  console.log(`Muestra ${m.clave}: ${m.existente ? "se queda" : confirmar ? "la creo" : "la crearía"}`);
}
console.log(`\nConstancia en ${base}.md`);

if (!confirmar) {
  console.log("\nSimulación: no he borrado nada. Para borrar, lo mismo con --confirmar.");
  process.exit(0);
}

// --- Borrar ---------------------------------------------------------------------

const enLotes = async (tabla, ids) => {
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const r = await fetch(`${URL_}/rest/v1/${tabla}?id=in.(${lote.join(",")})`, {
      method: "DELETE",
      headers: cab,
    });
    if (!r.ok) {
      console.error(`\nNo he podido borrar en ${tabla}: ${r.status} ${(await r.text()).slice(0, 300)}`);
      console.error("Paro aquí. Lo ya borrado queda en la constancia; los ficheros no se han tocado.");
      process.exit(1);
    }
  }
};

console.log("");
await enLotes("candidaturas", fichasCandidatura.map((f) => f.fila.id));
console.log(`· ${fichasCandidatura.length} candidaturas borradas`);

// Las muestras: marcar las que estaban, crear las que faltan
const cohorte = (await leer("cohorts?select=id&order=created_at&limit=1"))[0];
for (const m of muestrasHoy) {
  if (m.existente) {
    const cambios = { is_demo: true };
    if (m.clave === "firmada" && m.existente.company_id !== demo.id) cambios.company_id = demo.id;
    await fetch(`${URL_}/rest/v1/candidaturas?id=eq.${m.existente.id}`, {
      method: "PATCH", headers: cab, body: JSON.stringify(cambios),
    });
    continue;
  }
  if (!cohorte) {
    console.error(`· Muestra ${m.clave}: no hay ninguna cohorte, no la puedo crear.`);
    continue;
  }
  const r = await fetch(`${URL_}/rest/v1/candidaturas`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({ cohort_id: cohorte.id, ...m.fila }),
  });
  console.log(`· Muestra ${m.clave}: ${r.ok ? "creada" : `no creada (${r.status} ${(await r.text()).slice(0, 200)})`}`);
}

await enLotes("companies", fichasCompania.map((f) => f.fila.id));
console.log(`· ${fichasCompania.length} compañías borradas`);

const sobras = {};
for (const f of [...fichasCompania, ...fichasCandidatura]) {
  for (const [bucket, rutas] of Object.entries(f.ficheros)) {
    if (!rutas.length) continue;
    const quedan = await quitarFicheros(bucket, rutas);
    if (quedan.length) (sobras[bucket] ??= []).push(...quedan);
  }
}
const nSobras = Object.values(sobras).reduce((n, l) => n + l.length, 0);
console.log(`· Ficheros quitados${nSobras ? `, salvo ${nSobras}: ${JSON.stringify(sobras).slice(0, 300)}` : ""}`);

await fetch(`${URL_}/rest/v1/activity_log`, {
  method: "POST",
  headers: cab,
  body: JSON.stringify({
    entity: "nube",
    action: "vaciar",
    detail: {
      companias: fichasCompania.length,
      candidaturas: fichasCandidatura.length,
      se_queda: demo.slug,
      ficheros_sin_quitar: nSobras,
      por: "nube:vaciar",
      constancia: `${base}.md`,
    },
  }),
});

console.log("\nHecho. La plataforma está lista para cargar las compañías reales.");
