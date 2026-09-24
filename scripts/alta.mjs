#!/usr/bin/env node
/**
 * Alta de una persona en la plataforma.
 *
 * No hay autoservicio: quien entra es quien IWL ha dado de alta. Hasta que
 * exista pantalla de administración, el alta se hace con este script.
 *
 *   node scripts/alta.mjs <correo> <rol> [slug-de-compañía] [papel-en-la-compañía]
 *
 * Roles: admin_iwl · equipo_iwl · revisor_niage · fundadora · mentor · lector_externo
 * Papeles en la compañía: fundadora · responsable_iwl · revisor_niage · mentor
 *
 * Ejemplos:
 *   node scripts/alta.mjs ana@iwl.es equipo_iwl
 *   node scripts/alta.mjs ana@compania.com fundadora marea-clinica fundadora
 *   node scripts/alta.mjs cto@niage.es revisor_niage vega-predictiva revisor_niage
 */
import { execFileSync } from "node:child_process";

const ROLES = [
  "admin_iwl",
  "equipo_iwl",
  "revisor_niage",
  "fundadora",
  "mentor",
  "lector_externo",
];

const PAPELES = ["fundadora", "responsable_iwl", "revisor_niage", "mentor"];

const [correo, rol, slug, papel] = process.argv.slice(2);

if (!correo || !rol) {
  console.error(
    "Uso: node scripts/alta.mjs <correo> <rol> [slug-de-compañía] [papel]\n" +
      `Roles: ${ROLES.join(" · ")}`,
  );
  process.exit(1);
}

if (!ROLES.includes(rol)) {
  console.error(`Rol no válido: ${rol}\nRoles: ${ROLES.join(" · ")}`);
  process.exit(1);
}

if (slug && !PAPELES.includes(papel ?? "")) {
  console.error(
    `Al asignar compañía hace falta el papel.\nPapeles: ${PAPELES.join(" · ")}`,
  );
  process.exit(1);
}

const { url, clave } = leerEntorno();

// 1. Crear la cuenta, o recuperarla si ya existe
const alta = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: cabeceras(clave),
  body: JSON.stringify({
    email: correo,
    email_confirm: true,
    user_metadata: { role: rol },
  }),
});

let usuario = await alta.json();

if (!alta.ok) {
  if (/already been registered|already exists/i.test(JSON.stringify(usuario))) {
    usuario = await buscarPorCorreo(url, clave, correo);
    if (!usuario) {
      console.error("La cuenta existe pero no se ha podido recuperar.");
      process.exit(1);
    }
    console.log(`La cuenta de ${correo} ya existía. Se actualiza su rol.`);
  } else {
    console.error("No se ha podido crear la cuenta:", usuario);
    process.exit(1);
  }
}

// 2. Fijar el rol en el perfil. El trigger lo crea con el rol de los metadatos,
//    pero si la cuenta ya existía hay que actualizarlo.
const perfil = await fetch(`${url}/rest/v1/profiles?id=eq.${usuario.id}`, {
  method: "PATCH",
  headers: { ...cabeceras(clave), Prefer: "return=representation" },
  body: JSON.stringify({ role: rol }),
});

if (!perfil.ok) {
  console.error("No se ha podido fijar el rol:", await perfil.text());
  process.exit(1);
}

console.log(`Alta hecha: ${correo} · ${rol}`);

// 3. Asignación a una compañía, si se ha pedido
if (slug) {
  const compania = await consultar(
    url,
    clave,
    `companies?slug=eq.${encodeURIComponent(slug)}&select=id,name`,
  );

  if (!compania[0]) {
    console.error(`No hay ninguna compañía con el slug ${slug}.`);
    process.exit(1);
  }

  const asignacion = await fetch(`${url}/rest/v1/company_members`, {
    method: "POST",
    headers: {
      ...cabeceras(clave),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      company_id: compania[0].id,
      profile_id: usuario.id,
      member_role: papel,
    }),
  });

  if (!asignacion.ok) {
    console.error("No se ha podido asignar la compañía:", await asignacion.text());
    process.exit(1);
  }

  console.log(`Asignada a ${compania[0].name} como ${papel}`);
}

console.log(
  "\nYa puede pedir su enlace de entrada en /entrar.\n" +
    "En local, el correo aparece en la bandeja de desarrollo: http://127.0.0.1:54324",
);

// -----------------------------------------------------------------------------

function cabeceras(clave) {
  return {
    apikey: clave,
    Authorization: `Bearer ${clave}`,
    "Content-Type": "application/json",
  };
}

async function consultar(url, clave, ruta) {
  const respuesta = await fetch(`${url}/rest/v1/${ruta}`, {
    headers: cabeceras(clave),
  });
  return respuesta.json();
}

async function buscarPorCorreo(url, clave, correo) {
  const respuesta = await fetch(
    `${url}/auth/v1/admin/users?page=1&per_page=1000`,
    { headers: cabeceras(clave) },
  );
  const { users = [] } = await respuesta.json();
  return users.find((u) => u.email?.toLowerCase() === correo.toLowerCase());
}

/**
 * Claves de la instancia. En local salen de `supabase status`; contra un
 * proyecto remoto, de las variables de entorno.
 */
function leerEntorno() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      clave: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  let salida;
  try {
    salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    console.error(
      "Supabase local no responde. Ejecuta `npm run db:start`, o exporta " +
        "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para dar de alta en remoto.",
    );
    process.exit(1);
  }

  const leer = (clave) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  return { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
}
