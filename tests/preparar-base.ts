import { execFileSync } from "node:child_process";

/**
 * Deja la base lista antes de cualquier suite que la use.
 *
 * Una instalación de trabajo archiva las compañías de demostración desde su
 * seed local: en una cartera con proyectos de verdad estorban, ensucian las
 * medias de la cohorte y hacen ruido en los listados. Pero las pruebas se
 * apoyan en ellas —son las únicas que trae el seed versionado, y por tanto
 * las únicas que existen en cualquier otra máquina— y una compañía archivada
 * deja de ser visible para su equipo fundador, que es la mitad de lo que
 * estas pruebas comprueban.
 *
 * No se restaura el estado al terminar: quien trabaja con proyectos reales
 * recupera su vista con `npm run db:reset`, que vuelve a aplicar su seed
 * local. Dejarlas como estaban obligaría a adivinar cuáles se archivaron a
 * propósito y cuáles las archivó una prueba.
 */
export async function desarchivarCompanias(): Promise<void> {
  let salida: string;
  try {
    salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Supabase local no responde. Ejecuta `npm run db:start` antes de los tests.",
    );
  }

  const leer = (clave: string) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  const url = leer("API_URL");
  const clave = leer("SERVICE_ROLE_KEY");

  const respuesta = await fetch(
    `${url}/rest/v1/companies?archived_at=not.is.null`,
    {
      method: "PATCH",
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      }),
    },
  );

  if (!respuesta.ok) {
    throw new Error(
      `No se han podido desarchivar las compañías: ${respuesta.status} ${await respuesta.text()}`,
    );
  }
}

export default desarchivarCompanias;
