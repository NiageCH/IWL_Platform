#!/usr/bin/env node
/**
 * Las cuentas del equipo en la nube.
 *
 * Da de alta —o repone la contraseña de— las personas de IWL y Niage que
 * entran en producción, con contraseña aleatoria y distinta cada una. Las
 * contraseñas no se imprimen: van a `.accesos-nube.md`, que no se versiona.
 * Se reparten desde ahí y se borra el fichero.
 *
 *   npm run cuentas:nube              crea o repone todas
 *   npm run cuentas:nube -- --listar  solo dice qué hay, sin tocar nada
 *
 * Lee las credenciales de `.env.produccion`. Es idempotente: pasarlo dos
 * veces deja las mismas cuentas con contraseñas nuevas.
 *
 * **Ninguna cuenta `@iwl.es`.** Ese dominio no existe y las cuentas que lo
 * usaban eran de la primera siembra. Se listan para borrarlas a mano, que
 * borrar cuentas en producción no es algo que deba hacer un script por su
 * cuenta.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SALIDA = ".accesos-nube.md";
const ENTORNO = ".env.produccion";

/**
 * Quién entra, con qué papel.
 *
 * Carlos Silvero y Cecilia Calónico no están: sus correos reales no están
 * confirmados, y una cuenta con un correo equivocado no es un dato
 * pendiente, es un enlace de acceso en el buzón de otra persona.
 */
const EQUIPO = [
  { email: "rodrigo@niage.es", nombre: "Rodrigo González", rol: "admin_iwl" },
  { email: "luciana@niage.es", nombre: "Luciana Patiño", rol: "admin_iwl" },
  { email: "laura@niage.es", nombre: "Laura Gleizer", rol: "equipo_iwl" },
  { email: "juan.mishima@niage.es", nombre: "Juan Mishima", rol: "revisor_niage" },
  { email: "ingenieria@inceptionwlab.es", nombre: "David Rodriguez", rol: "equipo_iwl" },
];

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
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
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

const soloListar = process.argv.includes("--listar");

const usuarios = await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: cab })
  .then((r) => r.json());

if (!usuarios.users) {
  console.error("No he podido leer las cuentas:", JSON.stringify(usuarios).slice(0, 200));
  process.exit(1);
}

const porCorreo = new Map(usuarios.users.map((u) => [u.email, u]));

console.log(`Instancia: ${URL_}`);
console.log(`Cuentas hoy: ${usuarios.users.length}\n`);

const sobran = usuarios.users.filter(
  (u) => u.email?.endsWith("@iwl.es") || u.email?.endsWith(".test"),
);
if (sobran.length) {
  console.log("Cuentas que no deberían estar en la nube (bórralas a mano):");
  for (const u of sobran) console.log(`  · ${u.email}`);
  console.log("");
}

if (soloListar) {
  console.log("Nada tocado: --listar.");
  process.exit(0);
}

const puestas = [];

for (const persona of EQUIPO) {
  const pass = clave();
  const cuerpo = {
    email: persona.email,
    password: pass,
    email_confirm: true,
    user_metadata: {
      full_name: persona.nombre,
      role: persona.rol,
      /*
       * La marca está; la pantalla que obliga a cambiarla, no.
       * Se deja puesta para que el día que exista no haya que volver a
       * pasar por aquí, y para que quien reparta sepa que es temporal.
       */
      debe_cambiar_password: true,
    },
  };

  const ya = porCorreo.get(persona.email);
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

  console.log(`· ${persona.email}: ${ya ? "contraseña nueva" : "creada"}`);

  /* El disparador crea el perfil al nacer la cuenta; el papel se asegura
     aquí, que es lo que decide qué ve cada cual */
  await fetch(`${URL_}/rest/v1/profiles?email=eq.${encodeURIComponent(persona.email)}`, {
    method: "PATCH",
    headers: cab,
    body: JSON.stringify({ full_name: persona.nombre, role: persona.rol }),
  });

  puestas.push({ ...persona, pass });
}

if (!puestas.length) {
  console.error("\nNo se ha puesto ninguna cuenta. No escribo el fichero de accesos.");
  process.exit(1);
}

const hoy = new Date().toISOString().slice(0, 10);

writeFileSync(
  SALIDA,
  `# Accesos de la nube

Generado el ${hoy} por \`npm run cuentas:nube\`. Sustituye al fichero del 29
de septiembre.

Instancia: ${URL_}

**Este fichero no se versiona.** Lleva contraseñas en claro y existe porque
se generan al azar y no se guardan en ningún otro sitio. Repártelas una a
una y bórralo.

| Correo | Contraseña | Rol | Quién |
|---|---|---|---|
${puestas.map((p) => `| \`${p.email}\` | \`${p.pass}\` | ${p.rol} | ${p.nombre} |`).join("\n")}

Se entra en la dirección de producción con correo y contraseña.

**El cambio obligatorio en la primera entrada todavía no existe.** Las
cuentas llevan la marca \`debe_cambiar_password\`, pero no hay pantalla que
la haga cumplir: por ahora es un aviso para quien reparte, no una barrera.
Cada persona la cambia desde Mi perfil.
`,
);

console.log(`\n${puestas.length} cuentas. Contraseñas en ${SALIDA}.`);
