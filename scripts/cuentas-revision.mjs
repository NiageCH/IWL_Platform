#!/usr/bin/env node
/**
 * Cuentas de revisión: una por vista.
 *
 * Sirven para recorrer la plataforma con cada rol y comprobar que lo que ve
 * cada uno es lo que dice la tabla de visibilidad. No son personas: son
 * puntos de observación.
 *
 *   npm run cuentas:revision              crea o actualiza las ocho
 *   npm run cuentas:revision -- --borrar  las quita todas
 *
 * Contra la nube, exporta antes SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Tres decisiones que conviene no deshacer sin pensarlo:
 *
 * · **Cuelgan de la compañía de demostración, nunca de una real.** Y la
 *   demostración se busca por `is_demo`, no por un slug escrito aquí: quién
 *   lo es cambia según la instalación, y una lista de slugs en el código
 *   acabaría apuntando a un proyecto real el día que cambie.
 *
 * · **Correos con alias del propio Rodrigo**, `rodrigo+<alias>@niage.es`.
 *   Llegan a su bandeja, así que recuperar la contraseña funciona de verdad
 *   y ningún enlace de acceso sale hacia un dominio que no controla.
 *
 * · **El nombre visible lleva «Revisión ·» delante.** Estas cuentas salen
 *   en los desplegables de asignación, en los comentarios y en las tareas,
 *   mezcladas con personas reales. Sin el prefijo, alguien acaba asignando
 *   una auditoría a un punto de observación.
 *
 * Las contraseñas se escriben **solo** en `.accesos-revision.md`, que está
 * en `.gitignore`. Ni en la semilla, ni en la bitácora, ni por pantalla.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const PREFIJO = "rodrigo+rev-";

/**
 * `vinculo` describe qué hay que montarle además de la cuenta:
 *   · null            — el rol basta, ve toda la cartera
 *   · {papel}         — miembro de la compañía de demostración con ese papel
 *   · {candidatura}   — se le da acceso a una candidatura en NDA firmado
 */
const CUENTAS = [
  {
    alias: "admin", nombre: "Revisión · Dirección",
    rol: "admin_iwl", vinculo: null,
    ve: "Toda la plataforma, incluida la configuración del programa",
  },
  {
    alias: "equipo", nombre: "Revisión · Equipo IWL",
    rol: "equipo_iwl", vinculo: null,
    ve: "Toda la cartera y el embudo, sin configuración",
  },
  {
    alias: "niage", nombre: "Revisión · Ingeniería Niage",
    rol: "revisor_niage", vinculo: { papel: "revisor_niage" },
    ve: "Solo la demostración, con el due diligence técnico editable",
  },
  {
    alias: "mentor1", nombre: "Revisión · Mentor principal",
    rol: "mentor", vinculo: { papel: "mentor_principal" },
    ve: "Solo la demostración, como quien la coordina",
  },
  {
    alias: "mentor2", nombre: "Revisión · Mentor secundario",
    rol: "mentor", vinculo: { papel: "mentor_secundario" },
    ve: "Solo la demostración, sin aportación ni hallazgos técnicos",
  },
  {
    alias: "fundadora", nombre: "Revisión · Fundadora",
    rol: "fundadora", vinculo: { papel: "fundadora" },
    ve: "Su proyecto y nada más",
  },
  {
    alias: "lector", nombre: "Revisión · Lector externo",
    rol: "lector_externo", vinculo: { papel: "fundadora" },
    ve: "Su proyecto, en solo lectura",
  },
  {
    alias: "candidata", nombre: "Revisión · Candidata",
    rol: "candidata", vinculo: { candidatura: true },
    ve: "Su candidatura y el due diligence que tiene por entregar",
  },
];

/** La que se sustituye: era una cuenta suelta, sin este criterio */
const A_RETIRAR = ["candidata.prueba@iwl.es"];

const borrar = process.argv.includes("--borrar");
const { url, clave } = leerEntorno();

if (borrar) {
  await quitarlas();
  process.exit(0);
}

const demo = await buscarDemo();
const candidatura = await prepararCandidatura();
const filas = [];

for (const cuenta of CUENTAS) {
  const correo = `${PREFIJO}${cuenta.alias}@niage.es`;
  const contrasena = generarClave();

  const id = await crearOActualizar(correo, contrasena, cuenta.nombre);
  await fijarPerfil(id, cuenta.rol, cuenta.nombre);

  if (cuenta.vinculo?.papel) {
    await asignar(demo.id, id, cuenta.vinculo.papel);
  }

  if (cuenta.vinculo?.candidatura) {
    await darAccesoCandidatura(candidatura.id, id);
  }

  filas.push({ ...cuenta, correo, contrasena });
  console.log(`· ${correo} · ${cuenta.rol}`);
}

for (const correo of A_RETIRAR) {
  const usuario = await buscarPorCorreo(correo);
  if (!usuario) continue;
  await borrarCuenta(usuario.id);
  console.log(`· retirada la cuenta antigua ${correo}`);
}

escribirAccesos(filas, demo, candidatura);

console.log(
  `\nOcho cuentas listas sobre «${demo.name}».\n` +
    "Las contraseñas están en .accesos-revision.md, que no se versiona.",
);

// -----------------------------------------------------------------------------

async function quitarlas() {
  const { users = [] } = await (
    await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: cabeceras(),
    })
  ).json();

  const nuestras = users.filter((u) => u.email?.startsWith(PREFIJO));

  for (const u of nuestras) {
    await borrarCuenta(u.id);
    console.log(`· borrada ${u.email}`);
  }

  /*
   * Y su candidatura, que la creamos nosotros. Borrar las cuentas y dejarla
   * ahí dejaría una fila en el embudo que nadie sabría de dónde salió.
   */
  await fetch(
    `${url}/rest/v1/candidaturas?nombre=eq.${encodeURIComponent("Revisión · Candidatura")}`,
    { method: "DELETE", headers: cabeceras() },
  );

  console.log(
    nuestras.length
      ? `\n${nuestras.length} cuentas de revisión borradas, y su candidatura.`
      : "\nNo había ninguna cuenta de revisión.",
  );
}

/**
 * La compañía de demostración.
 *
 * Si no hay ninguna, se para en vez de elegir una: colgar ocho cuentas de
 * un proyecto real por adivinar sería justo lo contrario de lo que esto
 * hace.
 */
async function buscarDemo() {
  const filas = await consultar("companies?is_demo=eq.true&select=id,name,slug");

  if (!filas[0]) {
    console.error(
      "No hay ninguna compañía marcada como demostración.\n" +
        "Marca una con `is_demo` antes: estas cuentas no cuelgan de un proyecto real.",
    );
    process.exit(1);
  }

  if (filas.length > 1) {
    console.error(
      `Hay ${filas.length} compañías marcadas como demostración: ` +
        filas.map((f) => f.slug).join(", ") +
        "\nDeja una sola para no repartir las cuentas entre varias.",
    );
    process.exit(1);
  }

  return filas[0];
}

/**
 * La candidatura de la cuenta de revisión. Suya y nueva, no una de la
 * semilla.
 *
 * La primera versión cogía la primera candidatura en NDA que encontrara, y
 * eso rompía dos pruebas: darle cuenta a una candidatura **anula su enlace
 * privado**, que es justo lo que otra prueba estaba comprobando. Apropiarse
 * de un dato compartido para montar un escenario deja el escenario de otro
 * a medias.
 *
 * Se llama «Revisión ·» como las cuentas, por lo mismo: para que nadie la
 * confunda con una candidatura de verdad en el embudo.
 */
async function prepararCandidatura() {
  const ya = await consultar(
    "candidaturas?nombre=eq.Revisi%C3%B3n%20%C2%B7%20Candidatura&select=id,nombre&limit=1",
  );
  if (ya[0]) return ya[0];

  const cohortes = await consultar("cohorts?select=id&limit=1");
  if (!cohortes[0]) {
    console.error("No hay ninguna cohorte: la candidatura necesita una.");
    process.exit(1);
  }

  const respuesta = await fetch(`${url}/rest/v1/candidaturas`, {
    method: "POST",
    headers: { ...cabeceras(), Prefer: "return=representation" },
    body: JSON.stringify({
      cohort_id: cohortes[0].id,
      nombre: "Revisión · Candidatura",
      sector: "Demostración",
      one_liner: "Candidatura de demostración, para recorrer la vista de candidata.",
      contacto_nombre: "Revisión · Candidata",
      contacto_email: `${PREFIJO}candidata@niage.es`,
      /*
       * En NDA firmado: es el punto en el que una candidata tiene cuenta y
       * un due diligence por entregar, que es lo que hay que poder mirar.
       */
      estado: "nda",
      origen: "Cuentas de revisión",
    }),
  });

  if (!respuesta.ok) {
    console.error("No se ha podido crear la candidatura:", await respuesta.text());
    process.exit(1);
  }

  const [creada] = await respuesta.json();
  return creada;
}

async function crearOActualizar(correo, contrasena, nombre) {
  const alta = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify({
      email: correo,
      email_confirm: true,
      password: contrasena,
      user_metadata: { full_name: nombre },
    }),
  });

  const cuerpo = await alta.json();
  if (alta.ok) return cuerpo.id;

  if (!/already|registered|exists/i.test(JSON.stringify(cuerpo))) {
    console.error(`No se ha podido crear ${correo}:`, cuerpo);
    process.exit(1);
  }

  /*
   * Ya existía: se le pone la contraseña nueva. El script es idempotente y
   * eso incluye la contraseña, porque el fichero de accesos se reescribe
   * entero en cada pasada y tiene que seguir siendo cierto.
   */
  const usuario = await buscarPorCorreo(correo);
  const cambio = await fetch(`${url}/auth/v1/admin/users/${usuario.id}`, {
    method: "PUT",
    headers: cabeceras(),
    body: JSON.stringify({ password: contrasena, email_confirm: true }),
  });

  if (!cambio.ok) {
    console.error(`No se ha podido actualizar ${correo}:`, await cambio.text());
    process.exit(1);
  }

  return usuario.id;
}

async function fijarPerfil(id, rol, nombre) {
  const respuesta = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...cabeceras(), Prefer: "return=minimal" },
    body: JSON.stringify({ role: rol, full_name: nombre, is_active: true }),
  });

  if (!respuesta.ok) {
    console.error("No se ha podido fijar el perfil:", await respuesta.text());
    process.exit(1);
  }
}

async function asignar(companyId, profileId, papel) {
  const respuesta = await fetch(`${url}/rest/v1/company_members`, {
    method: "POST",
    headers: {
      ...cabeceras(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      company_id: companyId,
      profile_id: profileId,
      member_role: papel,
    }),
  });

  if (!respuesta.ok) {
    console.error("No se ha podido asignar:", await respuesta.text());
    process.exit(1);
  }
}

async function darAccesoCandidatura(candidaturaId, profileId) {
  const respuesta = await fetch(`${url}/rest/v1/rpc/dar_acceso_candidatura`, {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify({ p_candidatura: candidaturaId, p_profile: profileId }),
  });

  // Si ya lo tenía, la función se queja y da igual: el estado final es el mismo
  if (!respuesta.ok) {
    const texto = await respuesta.text();
    if (!/ya tiene|already/i.test(texto)) {
      console.error("No se ha podido dar acceso a la candidatura:", texto);
      process.exit(1);
    }
  }
}

async function borrarCuenta(id) {
  await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: cabeceras(),
  });
}

function escribirAccesos(filas, demo, candidatura) {
  const hoy = new Date().toISOString().slice(0, 10);

  const cuerpo = `# Accesos de revisión

Generado por \`npm run cuentas:revision\` el ${hoy}.
Instancia: ${url}
Compañía de demostración: **${demo.name}** (\`${demo.slug}\`)
Candidatura de demostración: **${candidatura.nombre}**

**Este fichero no se versiona.** Lleva contraseñas en claro, y existe
porque el script las genera al azar y no las guarda en ningún otro sitio.
Volver a ejecutar el script pone contraseñas nuevas y reescribe esto.

| Correo | Contraseña | Rol | Qué ve |
|---|---|---|---|
${filas
  .map((f) => `| \`${f.correo}\` | \`${f.contrasena}\` | ${f.rol} | ${f.ve} |`)
  .join("\n")}

Los correos son alias de la bandeja de Rodrigo, así que recuperar la
contraseña por correo funciona en todas.

Para quitarlas: \`npm run cuentas:revision -- --borrar\`.
`;

  writeFileSync(".accesos-revision.md", cuerpo);
}

/** Tres palabras y un número: se dicta por teléfono sin deletrear */
function generarClave() {
  const palabras = [
    "faro", "duna", "brisa", "roble", "cauce", "sierra", "ambar", "junco",
    "vela", "musgo", "risco", "trigo", "nieve", "cala", "olmo", "surco",
  ];
  const azar = (n) => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] % n;
  };
  const tres = Array.from({ length: 3 }, () => palabras[azar(palabras.length)]);
  return `${tres.join("-")}-${10 + azar(90)}`;
}

function cabeceras() {
  return {
    apikey: clave,
    Authorization: `Bearer ${clave}`,
    "Content-Type": "application/json",
  };
}

async function consultar(ruta) {
  const respuesta = await fetch(`${url}/rest/v1/${ruta}`, {
    headers: cabeceras(),
  });
  return respuesta.json();
}

async function buscarPorCorreo(correo) {
  const { users = [] } = await (
    await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: cabeceras(),
    })
  ).json();
  return users.find((u) => u.email?.toLowerCase() === correo.toLowerCase());
}

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
        "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para hacerlo en la nube.",
    );
    process.exit(1);
  }

  const leer = (k) =>
    salida.match(new RegExp(`^${k}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  return { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
}
