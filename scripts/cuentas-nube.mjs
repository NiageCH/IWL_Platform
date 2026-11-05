#!/usr/bin/env node
/**
 * Las cuentas de la nube.
 *
 *   npm run cuentas:nube                           crea las del equipo que faltan
 *   npm run cuentas:nube -- --reponer <correo>     contraseña nueva para una que ya existe
 *   npm run cuentas:nube -- --listar               todas, sin tocar nada
 *   npm run cuentas:nube -- --limpiar              qué borraría, sin borrar
 *   npm run cuentas:nube -- --limpiar --confirmar  borra lo que no está en la lista
 *
 * Lee las credenciales de `.env.produccion`. Quién se queda está en
 * `cuentas-lista.mjs`: el equipo y las cuentas de revisión, nada más.
 *
 * Crear da a cada persona una contraseña aleatoria y temporal: las
 * contraseñas no se imprimen, se añaden a `.accesos-nube.md`, que no se
 * versiona, y en la primera entrada la plataforma pide cambiarla.
 *
 * **Las que ya existen no se tocan.** Antes, pasarlo otra vez le cambiaba
 * la contraseña a todo el equipo, también a quien ya había puesto la suya.
 * Reponer es a propósito y de una en una: `--reponer <correo>`.
 *
 * Limpiar se explica en su sección, más abajo.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { EQUIPO, PRINCIPAL, correosQueSeQuedan } from "./cuentas-lista.mjs";

const SALIDA = ".accesos-nube.md";
/*
 * Otro fichero solo para probar el script contra la base local. Por
 * defecto, y en todo lo que se documenta, la nube.
 */
const ENTORNO = process.env.CUENTAS_ENTORNO ?? ".env.produccion";

/** Tres palabras y un número: se dicta por teléfono sin deletrear */
const PALABRAS = [
  "faro", "duna", "brisa", "roble", "cauce", "sierra", "ambar", "junco",
  "vela", "musgo", "risco", "trigo", "nieve", "cala", "olmo", "surco",
  "puerto", "ladera", "estero", "abeto", "marea", "vereda",
];

function clave() {
  const azar = (n) => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] % n;
  };
  const tres = Array.from({ length: 3 }, () => PALABRAS[azar(PALABRAS.length)]);
  return `${tres.join("-")}-${10 + azar(90)}`;
}

function entorno() {
  let texto;
  try {
    texto = readFileSync(ENTORNO, "utf8");
  } catch {
    console.error(`No encuentro ${ENTORNO}. Es el fichero con la URL y las claves de la nube.`);
    process.exit(1);
  }
  return Object.fromEntries(
    texto
      .split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1")];
      }),
  );
}

const env = entorno();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !CLAVE) {
  console.error(`A ${ENTORNO} le falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.`);
  process.exit(1);
}

const cab = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
  "Content-Type": "application/json",
};

/** Lectura por PostgREST con la clave de servicio. Falla en alto, no en blanco */
async function leer(ruta) {
  const r = await fetch(`${URL_}/rest/v1/${ruta}`, { headers: cab });
  if (!r.ok) throw new Error(`${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

/** Cuántas filas cumplen un filtro, sin traerlas */
async function contar(tabla, filtro) {
  const r = await fetch(`${URL_}/rest/v1/${tabla}?select=*&${filtro}`, {
    method: "HEAD",
    headers: { ...cab, Prefer: "count=exact" },
  });
  if (!r.ok) return null;
  return Number(r.headers.get("content-range")?.split("/")[1] ?? 0);
}

const argumentos = new Set(process.argv.slice(2));
const soloListar = argumentos.has("--listar");
const limpiar = argumentos.has("--limpiar");
const confirmar = argumentos.has("--confirmar");
const reponer = (() => {
  const i = process.argv.indexOf("--reponer");
  return i === -1 ? null : (process.argv[i + 1] ?? "").trim().toLowerCase();
})();

if (reponer !== null && !EQUIPO.some((p) => p.email === reponer)) {
  console.error(
    reponer
      ? `${reponer} no es del equipo de cuentas-lista.mjs. A cualquier otra persona se le pone contraseña desde Administración → Personas.`
      : "--reponer necesita el correo: npm run cuentas:nube -- --reponer alguien@niage.es",
  );
  process.exit(1);
}

if (confirmar && !limpiar) {
  console.error("--confirmar solo vale con --limpiar.");
  process.exit(1);
}

const usuarios = await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: cab })
  .then((r) => r.json());

if (!usuarios.users) {
  console.error("No he podido leer las cuentas:", JSON.stringify(usuarios).slice(0, 200));
  process.exit(1);
}

const porCorreo = new Map(usuarios.users.map((u) => [u.email, u]));
/*
 * `CUENTAS_CONSERVAR` añade correos a los que se quedan, separados por
 * comas. Existe para probar la limpieza contra la base local sin borrar a
 * las personas de la semilla. Solo puede proteger más, nunca menos.
 */
const quedan = correosQueSeQuedan();
for (const correo of (process.env.CUENTAS_CONSERVAR ?? "").split(",")) {
  if (correo.trim()) quedan.add(correo.trim().toLowerCase());
}
const seQueda = (u) => quedan.has((u.email ?? "").toLowerCase());

console.log(`Instancia: ${URL_}`);
console.log(`Cuentas hoy: ${usuarios.users.length}\n`);

/*
 * Todas, con lo que hace falta para reconocerlas. El registro estuvo
 * abierto desde septiembre: una cuenta que nadie del equipo reconozca es
 * alguien que se dio de alta por su cuenta.
 *
 * Qué sobra lo dice la lista de quién se queda, no un patrón de lo que
 * sobra. Con el patrón —`@iwl.es` y `.test`— se escapaban `qqqq@q.com`,
 * `w@w.es` y `maria@pitulo.com`.
 */
const perfiles = await leer("profiles?select=id,role,full_name");
const perfil = new Map(perfiles.map((p) => [p.id, p]));
const dia = (f) => (f ? f.slice(0, 16).replace("T", " ") : "nunca");

console.log("| Correo | Rol | Nombre | Alta | Último acceso | |");
console.log("|---|---|---|---|---|---|");
for (const u of [...usuarios.users].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
  const p = perfil.get(u.id);
  console.log(
    `| ${u.email ?? "(sin correo)"} | ${p?.role ?? "(sin perfil)"} | ${p?.full_name ?? ""} | ${dia(u.created_at)} | ${dia(u.last_sign_in_at)} | ${seQueda(u) ? "se queda" : "**sobra**"} |`,
  );
}
console.log("");

// -----------------------------------------------------------------------------
// Crear o reponer las del equipo
// -----------------------------------------------------------------------------

async function crearCuentas() {
  const puestas = [];

  for (const persona of EQUIPO) {
    const ya = porCorreo.get(persona.email);

    if (reponer ? persona.email !== reponer : ya) {
      if (!reponer) console.log(`· ${persona.email}: ya existe, no la toco`);
      continue;
    }
    if (reponer && !ya) {
      console.error(`· ${persona.email}: no existe todavía. Créala sin --reponer.`);
      process.exit(1);
    }

    const pass = clave();
    const cuerpo = {
      email: persona.email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: persona.nombre, role: persona.rol },
    };

    const respuesta = ya
      ? await fetch(`${URL_}/auth/v1/admin/users/${ya.id}`, {
          method: "PUT", headers: cab, body: JSON.stringify(cuerpo),
        })
      : await fetch(`${URL_}/auth/v1/admin/users`, {
          method: "POST", headers: cab, body: JSON.stringify(cuerpo),
        });

    if (!respuesta.ok) {
      console.error(`· ${persona.email}: ${respuesta.status} ${(await respuesta.text()).slice(0, 180)}`);
      continue;
    }

    /*
     * La contraseña es temporal: en la primera entrada se pide cambiarla.
     *
     * En `app_metadata`, que solo escribe la clave de servicio —en
     * `user_metadata` se la quitaría cualquiera—, y en una llamada aparte y
     * después: la base borra la marca cada vez que cambia la contraseña,
     * así que en la misma llamada no llegaría a quedarse.
     */
    const { id } = await respuesta.json();
    const marca = await fetch(`${URL_}/auth/v1/admin/users/${ya?.id ?? id}`, {
      method: "PUT",
      headers: cab,
      body: JSON.stringify({ app_metadata: { debe_cambiar_password: true } }),
    });
    if (!marca.ok) {
      console.error(`· ${persona.email}: puesta, pero sin pedir el cambio (${marca.status}). Vuelve a correr el script.`);
    }

    console.log(`· ${persona.email}: ${ya ? "contraseña nueva" : "creada"}`);

    /* El disparador crea el perfil al nacer la cuenta; el papel se pone
       aquí, que es lo que decide qué ve cada cual. Al reponer no se toca:
       si se cambió desde la plataforma, se respeta */
    if (!ya) await fetch(`${URL_}/rest/v1/profiles?email=eq.${encodeURIComponent(persona.email)}`, {
      method: "PATCH",
      headers: cab,
      body: JSON.stringify({ full_name: persona.nombre, role: persona.rol }),
    });

    puestas.push({ ...persona, pass });
  }

  if (!puestas.length) {
    console.log("\nNo falta ninguna cuenta del equipo. Nada que hacer.");
    return;
  }

  const ahora = new Date().toISOString().slice(0, 16).replace("T", " ");

  /*
   * Se añade, no se sobrescribe: si quedaba alguna contraseña sin
   * repartir, pisarla dejaría una cuenta con una clave que no sabe nadie.
   */
  if (!existsSync(SALIDA)) {
    writeFileSync(
      SALIDA,
      `# Accesos de la nube

Instancia: ${URL_}

**Este fichero no se versiona.** Lleva contraseñas en claro y existe porque
se generan al azar y no se guardan en ningún otro sitio. Repártelas una a
una y bórralo.

Se entra en la dirección de producción con correo y contraseña. En la
primera entrada se pide cambiar la contraseña: hasta hacerlo, solo se puede
cambiarla o salir. La que pone aquí la dirección no vale para quedarse.
`,
    );
  }

  appendFileSync(
    SALIDA,
    `
## ${ahora} UTC · \`npm run cuentas:nube${reponer ? ` -- --reponer ${reponer}` : ""}\`

| Correo | Contraseña | Rol | Quién |
|---|---|---|---|
${puestas.map((p) => `| \`${p.email}\` | \`${p.pass}\` | ${p.rol} | ${p.nombre} |`).join("\n")}
`,
  );

  console.log(`\n${puestas.length} ${puestas.length === 1 ? "cuenta" : "cuentas"}. Contraseñas en ${SALIDA}.`);
}

// -----------------------------------------------------------------------------
// Limpiar
//
// Borra toda cuenta que no esté en `cuentas-lista.mjs`. Por defecto no borra
// nada: dice qué borraría y deja constancia. Solo con `--confirmar` borra.
//
// Tres cosas que conviene saber antes de tocarlo:
//
// · **Se niega si la cuenta principal no funciona.** `rodrigo@niage.es`
//   tiene que existir, ser dirección, haber entrado y haber cambiado ya la
//   contraseña temporal. Si no, borrar las viejas puede dejar la plataforma
//   sin nadie que pueda entrar a administrarla.
//
// · **Borrar una cuenta no es neutro.** Casi todo lo que hizo se queda sin
//   autor (`on delete set null`), y sus comentarios y objeciones **se
//   borran con ella** (`on delete cascade`). Por eso, antes, se escribe la
//   constancia: quién era, qué papel tenía, dónde estaba y qué hizo, con el
//   texto de lo que se va a perder.
//
// · **Las candidaturas no dejan borrar a quien las creó** (`no action`). Se
//   les quita el autor justo antes, que es lo que el resto de tablas hace
//   solas, y queda anotado en la constancia.
//
// · **Quien creó una línea base no se puede borrar.** Quitarle el autor es
//   un `update` sobre la línea base, y `guard_linea_base` los rechaza todos:
//   lo congelado no se edita, lo escriba quien lo escriba. No se fuerza: la
//   simulación lo avisa y `--confirmar` se salta esa cuenta. Si su compañía
//   se borra antes —`nube:vaciar`—, la línea base se va con ella y la
//   cuenta queda libre.
// -----------------------------------------------------------------------------

/*
 * Lo que se queda sin autor al borrar. Sacado de las claves foráneas con
 * `on delete set null` hacia `profiles` el 5 de noviembre; solo sirve para
 * contar, así que una tabla nueva que falte aquí no rompe nada: sale en el
 * recuento de menos.
 */
const SIN_AUTOR = [
  ["activity_log", "actor_id"], ["annexes", "created_by"], ["baselines", "created_by"],
  ["bp_section_versions", "author_id"], ["bp_sections", "updated_by"],
  ["bp_sections", "validated_by"], ["candidaturas", "profile_id"],
  ["cap_table_entries", "created_by"], ["cash_commitments", "created_by"],
  ["cash_disbursements", "created_by"], ["comments", "resolved_by"],
  ["companies", "archived_by"], ["companies", "created_by"],
  ["company_kpis", "created_by"], ["company_pillars", "created_by"],
  ["contacts", "created_by"], ["contribution_hours", "created_by"],
  ["contribution_hours", "profile_id"], ["contribution_items", "created_by"],
  ["dd_item_status_history", "changed_by"], ["dd_items", "created_by"],
  ["dd_items", "owner_id"], ["dd_items", "validated_by"], ["deliverables", "created_by"],
  ["document_access_log", "profile_id"], ["document_versions", "uploaded_by"],
  ["documents", "created_by"], ["evidence_links", "created_by"], ["findings", "created_by"],
  ["hypotheses", "created_by"], ["introductions", "created_by"],
  ["introductions", "introduced_by"], ["kpi_value_history", "changed_by"],
  ["kpi_values", "created_by"], ["milestones", "confirmed_by"], ["milestones", "created_by"],
  ["monthly_updates", "reviewed_by"], ["monthly_updates", "submitted_by"],
  ["objections", "resolved_by"], ["progress_entries", "author_id"],
  ["readiness_snapshots", "created_by"], ["roadmap_stages", "created_by"],
  ["tasks", "completed_by"], ["tasks", "created_by"], ["tasks", "owner_id"],
  ["tech_assessments", "created_by"], ["tech_assessments", "reviewer_id"],
  ["tech_findings", "created_by"], ["tech_plan_items", "created_by"],
  ["tech_questionnaire_answers", "answered_by"], ["tech_review_sessions", "created_by"],
  ["tech_scores", "scored_by"],
];

/** Las que impiden borrar la cuenta. Se vacían antes */
const IMPIDEN = [
  ["candidaturas", "created_by"], ["candidaturas", "descartada_por"],
  ["candidatura_documentos", "created_by"], ["candidatura_enlaces", "created_by"],
  ["candidatura_eventos", "created_by"], ["candidatura_peticiones", "created_by"],
];

/**
 * Las cuatro compañías de prueba, archivadas el 5 de noviembre con motivo
 * «Prueba». Se borran con «borrar con todo» desde la plataforma, que deja
 * a nombre de quien lo hace qué llevaba cada una y limpia sus ficheros.
 * Aquí solo se avisa: borrar una compañía se lleva su registro de
 * actividad, así que la constancia tiene que escribirse antes.
 */
const COMPANIAS_DE_PRUEBA = ["qqq", "pirulo", "ttttttt", "w"];

async function limpiarCuentas() {
  // --- El seguro: la cuenta principal funciona ------------------------------
  const principal = porCorreo.get(PRINCIPAL);
  const papel = principal ? perfil.get(principal.id)?.role : null;
  const motivos = [];
  if (!principal) motivos.push("no existe. Créala con `npm run cuentas:nube`.");
  else {
    if (papel !== "admin_iwl") motivos.push(`tiene el papel «${papel ?? "ninguno"}», no el de dirección.`);
    if (!principal.last_sign_in_at) motivos.push("no ha entrado nunca. Entra una vez en la plataforma.");
    if (principal.app_metadata?.debe_cambiar_password === true) {
      motivos.push("todavía tiene la contraseña temporal. Entra y cámbiala.");
    }
  }
  if (motivos.length) {
    console.error(`No limpio nada: ${PRINCIPAL} ${motivos.join(" Y ")}`);
    console.error("Sin una cuenta de dirección que funcione, borrar las otras puede dejar la plataforma sin nadie que la administre.");
    process.exit(1);
  }

  const aBorrar = usuarios.users.filter((u) => !seQueda(u));

  // Redundante con la lista, y a propósito: esta no se borra por ningún camino
  if (aBorrar.some((u) => u.id === principal.id)) {
    console.error(`${PRINCIPAL} ha salido entre las que se borran. No sigo.`);
    process.exit(1);
  }

  if (!aBorrar.length) {
    console.log("No sobra ninguna cuenta. Nada que hacer.");
    return;
  }

  // --- La constancia, antes de nada ----------------------------------------
  console.log(`${confirmar ? "Voy a borrar" : "Borraría"} ${aBorrar.length} cuentas. Escribo la constancia…\n`);
  const fichas = [];
  for (const u of aBorrar) fichas.push(await ficha(u));
  const ruta = escribirConstancia(fichas);

  for (const f of fichas) {
    console.log(
      `· ${f.correo} (${f.papel}) — ${f.actividad.length} acciones registradas, ` +
        `${f.comentarios.length} comentarios y ${f.objeciones.length} objeciones que se borran, ` +
        `${f.impiden.reduce((n, i) => n + i.ids.length, 0)} filas de candidaturas sin autor, ` +
        `${f.sinAutor} filas más sin autor` +
        (f.congeladas ? `. NO SE PUEDE BORRAR: creó ${f.congeladas} líneas base` : ""),
    );
  }
  console.log(`\nConstancia en ${ruta}`);

  const quedanCompanias = await leer(
    `companies?select=slug,name&slug=in.(${COMPANIAS_DE_PRUEBA.join(",")})`,
  );
  if (quedanCompanias.length) {
    console.log(
      `\nSiguen las compañías de prueba: ${quedanCompanias.map((c) => c.slug).join(", ")}. ` +
        "Bórralas con «borrar con todo» desde Administración → Compañías. " +
        "La constancia de esta pasada ya recoge lo que esas cuentas hicieron en ellas.",
    );
  }

  if (!confirmar) {
    console.log("\nSimulación: no he borrado nada. Para borrar, lo mismo con --confirmar.");
    return;
  }

  // --- Borrar ---------------------------------------------------------------
  console.log("");
  let fallos = 0;
  for (const f of fichas) {
    if (f.congeladas) {
      fallos++;
      console.error(
        `· ${f.correo}: no la borro. Creó ${f.congeladas} líneas base, y una línea base no se edita: ` +
          "ni siquiera para quitarle el autor. Borra antes su compañía, o archívala.",
      );
      continue;
    }

    for (const { tabla, columna, ids } of f.impiden) {
      if (!ids.length) continue;
      const r = await fetch(`${URL_}/rest/v1/${tabla}?${columna}=eq.${f.id}`, {
        method: "PATCH", headers: cab, body: JSON.stringify({ [columna]: null }),
      });
      if (!r.ok) {
        console.error(`· ${f.correo}: no he podido quitarla de ${tabla}.${columna} (${r.status})`);
      }
    }

    const r = await fetch(`${URL_}/auth/v1/admin/users/${f.id}`, {
      method: "DELETE", headers: cab,
    });
    if (!r.ok) {
      fallos++;
      console.error(`· ${f.correo}: NO borrada. ${r.status} ${(await r.text()).slice(0, 200)}`);
      continue;
    }

    /*
     * De un borrado irreversible tiene que quedar la cuenta, y la del
     * propio registro se acaba de quedar sin autor. Esta fila dice qué se
     * borró y dónde está el detalle.
     */
    await fetch(`${URL_}/rest/v1/activity_log`, {
      method: "POST",
      headers: cab,
      body: JSON.stringify({
        entity: "profiles",
        entity_id: f.id,
        action: "borrar_cuenta",
        detail: { correo: f.correo, rol: f.papel, por: "cuentas:nube --limpiar", constancia: ruta },
      }),
    });

    console.log(`· ${f.correo}: borrada`);
  }

  console.log(
    fallos
      ? `\n${fallos} sin borrar. Lo demás, hecho. Vuelve a pasar --limpiar para ver qué queda.`
      : `\nHecho. Quedan ${usuarios.users.length - aBorrar.length} cuentas.`,
  );
}

/** Todo lo que se sabe de una cuenta, para la constancia */
async function ficha(u) {
  const id = u.id;
  const [miembro, actividad, comentarios, objeciones] = await Promise.all([
    leer(`company_members?select=member_role,companies(slug,name)&profile_id=eq.${id}`),
    leer(
      `activity_log?select=created_at,entity,entity_id,action,detail,companies(slug)` +
        `&actor_id=eq.${id}&order=created_at`,
    ),
    leer(`comments?select=*&author_id=eq.${id}&order=created_at`),
    leer(`objections?select=*&raised_by=eq.${id}`),
  ]);

  const impiden = await Promise.all(
    IMPIDEN.map(async ([tabla, columna]) => ({
      tabla,
      columna,
      ids: (await leer(`${tabla}?select=id&${columna}=eq.${id}`)).map((f) => f.id),
    })),
  );

  const cuentas = await Promise.all(SIN_AUTOR.map(([t, c]) => contar(t, `${c}=eq.${id}`)));
  const congeladas = (await contar("baselines", `created_by=eq.${id}`)) ?? 0;

  return {
    id,
    correo: u.email ?? "(sin correo)",
    papel: perfil.get(id)?.role ?? "(sin perfil)",
    nombre: perfil.get(id)?.full_name ?? "",
    alta: u.created_at,
    ultimoAcceso: u.last_sign_in_at ?? null,
    companias: miembro.map((m) => `${m.companies?.slug ?? "?"} (${m.member_role})`),
    actividad,
    comentarios,
    objeciones,
    impiden,
    sinAutor: cuentas.reduce((n, c) => n + (c ?? 0), 0),
    congeladas,
  };
}

/**
 * Escribe la constancia en `docs/constancia/`, que no se versiona: lleva
 * correos, nombres y lo que cada cuenta hizo en compañías reales, y eso no
 * entra en el repositorio. Un fichero por pasada, sin pisar los anteriores:
 * la de la simulación recoge lo de las compañías de prueba, que se va con
 * ellas al borrarlas.
 */
function escribirConstancia(fichas) {
  const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const base = `docs/constancia/cuentas-${sello}${confirmar ? "-borrado" : "-simulacion"}`;
  mkdirSync("docs/constancia", { recursive: true });

  const md = [
    `# Cuentas ${confirmar ? "borradas" : "que se borrarían"} · ${sello}`,
    "",
    `Instancia: ${URL_}`,
    `Por: \`npm run cuentas:nube -- --limpiar${confirmar ? " --confirmar" : ""}\``,
    "",
    "Al borrar una cuenta, casi todo lo que hizo se queda sin autor, y sus",
    "comentarios y objeciones se borran con ella. Esto es lo que había.",
    `El detalle completo, en \`${base.split("/").pop()}.json\`. Horas en UTC.`,
    "",
  ];

  for (const f of fichas) {
    md.push(`## ${f.correo}`, "");
    md.push(`· Papel: ${f.papel}${f.nombre ? ` · Nombre: ${f.nombre}` : ""}`);
    md.push(`· Alta: ${dia(f.alta)} · Último acceso: ${dia(f.ultimoAcceso)}`);
    md.push(`· Compañías: ${f.companias.join(", ") || "ninguna"}`);
    md.push(`· Filas que se quedan sin autor: ${f.sinAutor}`);
    if (f.congeladas) {
      md.push(`· **No se puede borrar**: creó ${f.congeladas} líneas base, que no se editan ni para quitarles el autor.`);
    }
    const imp = f.impiden.filter((i) => i.ids.length);
    if (imp.length) {
      md.push(`· Candidaturas a las que se quita el autor: ${imp.map((i) => `${i.tabla}.${i.columna} ×${i.ids.length}`).join(", ")}`);
    }
    md.push("");

    md.push(`### Actividad registrada (${f.actividad.length})`, "");
    if (f.actividad.length) {
      md.push("| Cuándo | Compañía | Qué | Sobre |", "|---|---|---|---|");
      for (const a of f.actividad) {
        md.push(`| ${dia(a.created_at)} | ${a.companies?.slug ?? "—"} | ${a.action} | ${a.entity} |`);
      }
    } else md.push("Ninguna.");
    md.push("");

    if (f.comentarios.length || f.objeciones.length) {
      md.push("### Lo que se borra con la cuenta", "");
      for (const c of f.comentarios) {
        md.push(`· Comentario, ${dia(c.created_at)}: ${String(c.body ?? "").slice(0, 300)}`);
      }
      for (const o of f.objeciones) {
        md.push(`· Objeción, ${dia(o.created_at)}: ${String(o.reason ?? "").slice(0, 300)}`);
      }
      md.push("");
    }
  }

  writeFileSync(`${base}.md`, md.join("\n"));
  writeFileSync(`${base}.json`, JSON.stringify({ instancia: URL_, confirmar, fichas }, null, 2));
  return `${base}.md`;
}

// -----------------------------------------------------------------------------
// Al final y no arriba: las listas de la limpieza son `const` y tienen que
// existir antes de llamarla.
// -----------------------------------------------------------------------------

if (soloListar) {
  console.log("Nada tocado: --listar.");
} else if (limpiar) {
  await limpiarCuentas();
} else {
  await crearCuentas();
}
