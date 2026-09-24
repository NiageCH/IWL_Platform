#!/usr/bin/env node
/**
 * Analiza un repositorio y escribe el JSON de `esquema.ts`.
 *
 *   node --experimental-strip-types analizar.ts <url> [--rama main] [--salida fichero.json]
 *
 * Clona en un directorio temporal, pasa las herramientas y borra el código.
 * El borrado va en `finally`: si algo revienta a mitad, el código se borra
 * igual. Es el criterio de aceptación §11 y no puede depender de que todo
 * salga bien.
 */
import { execFile } from "node:child_process";
import { mkdtemp, rm, stat, writeFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import {
  esCopyleftFuerte,
  normalizarSeveridad,
  resultadoVacio,
  type Componente,
  type HerramientaUsada,
  type Licencia,
  type MetricasCodigo,
  type MetricasEntrega,
  type PatronInseguro,
  type ResultadoAnalisis,
  type Secreto,
  type Vulnerabilidad,
} from "./esquema.ts";

const ejecutar = promisify(execFile);

/** Ninguna herramienta debería tardar más que esto */
const TIEMPO_MAXIMO_MS = 10 * 60 * 1000;

/** Un repositorio más grande que esto no se analiza: algo raro pasa */
const TAMANO_MAXIMO_BYTES = 2 * 1024 * 1024 * 1024;

async function principal() {
  const argumentos = process.argv.slice(2);
  const url = argumentos.find((a) => !a.startsWith("--"));

  if (!url) {
    console.error(
      "Uso: analizar.ts <url-del-repositorio> [--rama <rama>] [--salida <fichero>]",
    );
    process.exit(1);
  }

  const rama = valorDe(argumentos, "--rama");
  const salida = valorDe(argumentos, "--salida");
  const runId = valorDe(argumentos, "--run-id") ?? randomUUID();

  const resultado = await analizar(url, { rama, runId });

  const json = JSON.stringify(resultado, null, 2);

  if (salida) {
    await writeFile(salida, json, "utf8");
    console.error(`Resultado escrito en ${salida}`);
  } else {
    process.stdout.write(json);
  }

  // Un análisis con fallos sale con código distinto de cero, para que la cola
  // sepa que ese resultado está incompleto
  const fallos = resultado.incidencias.filter((i) => i.nivel === "fallo");
  process.exit(fallos.length > 0 ? 2 : 0);
}

export async function analizar(
  url: string,
  opciones: { rama?: string; runId?: string } = {},
): Promise<ResultadoAnalisis> {
  const runId = opciones.runId ?? randomUUID();
  const resultado = resultadoVacio(runId, url);
  const iniciada = Date.now();

  const base = process.env.DIRECTORIO_TRABAJO ?? tmpdir();
  const directorio = await mkdtemp(join(base, "analisis-"));
  const repo = join(directorio, "repo");

  try {
    await clonar(url, repo, opciones.rama, resultado);

    if (resultado.repositorio.commit === "") {
      // Sin clon no hay nada que analizar; las incidencias ya lo dicen
      return cerrar(resultado, iniciada);
    }

    const tamano = await tamanoDe(repo);
    resultado.repositorio.tamano_bytes = tamano;

    if (tamano > TAMANO_MAXIMO_BYTES) {
      resultado.incidencias.push({
        ambito: "repositorio",
        nivel: "fallo",
        mensaje: `El repositorio ocupa ${Math.round(tamano / 1e9)} GB y no se analiza.`,
      });
      return cerrar(resultado, iniciada);
    }

    // Las herramientas son independientes entre sí salvo Grype, que necesita
    // el SBOM de Syft. Se lanzan en paralelo las que pueden.
    const [codigo, sbom, secretos, patrones, entrega] = await Promise.all([
      medirCodigo(repo, resultado),
      inventariar(repo, resultado),
      buscarSecretos(repo, resultado),
      buscarPatrones(repo, resultado),
      medirEntrega(repo, resultado),
    ]);

    resultado.codigo = codigo;
    resultado.dependencias = sbom.dependencias;
    resultado.licencias = sbom.licencias;
    resultado.secretos = secretos;
    resultado.patrones = patrones;
    resultado.entrega = entrega;

    if (sbom.rutaSbom) {
      resultado.vulnerabilidades = await buscarVulnerabilidades(
        repo,
        sbom.rutaSbom,
        resultado,
      );
    }

    return cerrar(resultado, iniciada);
  } finally {
    // El código se borra pase lo que pase (§11)
    await rm(directorio, { recursive: true, force: true });
    resultado.ejecucion.codigo_borrado = await borrado(directorio);
  }
}

function cerrar(resultado: ResultadoAnalisis, iniciada: number): ResultadoAnalisis {
  const terminada = Date.now();
  resultado.ejecucion.terminada = new Date(terminada).toISOString();
  resultado.ejecucion.iniciada = new Date(iniciada).toISOString();
  resultado.ejecucion.duracion_ms = terminada - iniciada;
  return resultado;
}

// -----------------------------------------------------------------------------
// Clonado
// -----------------------------------------------------------------------------

async function clonar(
  url: string,
  destino: string,
  rama: string | undefined,
  resultado: ResultadoAnalisis,
) {
  const argumentos = ["clone", "--quiet"];
  if (rama) argumentos.push("--branch", rama);
  // Historial completo: Gitleaks lo necesita para encontrar secretos que ya se
  // borraron de la copia de trabajo pero siguen en los commits
  argumentos.push(url, destino);

  try {
    await ejecutar("git", argumentos, {
      timeout: TIEMPO_MAXIMO_MS,
      env: {
        ...process.env,
        // Que no se quede esperando credenciales si la URL es privada
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "echo",
      },
    });
  } catch (fallo) {
    resultado.incidencias.push({
      ambito: "clonado",
      nivel: "fallo",
      mensaje: `No se ha podido clonar el repositorio: ${mensajeDe(fallo)}`,
    });
    return;
  }

  const enRepo = (args: string[]) =>
    ejecutar("git", ["-C", destino, ...args], { timeout: 60_000 });

  try {
    const [commit, fecha, ramaActual] = await Promise.all([
      enRepo(["rev-parse", "HEAD"]),
      enRepo(["log", "-1", "--format=%cI"]),
      enRepo(["rev-parse", "--abbrev-ref", "HEAD"]),
    ]);

    resultado.repositorio.commit = commit.stdout.trim();
    resultado.repositorio.commit_fecha = fecha.stdout.trim();
    resultado.repositorio.rama = ramaActual.stdout.trim();
  } catch (fallo) {
    resultado.incidencias.push({
      ambito: "clonado",
      nivel: "aviso",
      mensaje: `El repositorio se ha clonado pero no se ha podido leer su estado: ${mensajeDe(fallo)}`,
    });
  }
}

// -----------------------------------------------------------------------------
// scc · tamaño, lenguajes y complejidad
// -----------------------------------------------------------------------------

interface FilaScc {
  Name: string;
  Lines: number;
  Code: number;
  Comment: number;
  Blank: number;
  Complexity: number;
  Count: number;
}

async function medirCodigo(
  repo: string,
  resultado: ResultadoAnalisis,
): Promise<MetricasCodigo | null> {
  const salida = await correr(
    "scc",
    ["--format", "json", "--no-cocomo", repo],
    resultado,
    "scc",
  );

  if (!salida) return null;

  let filas: FilaScc[];
  try {
    filas = JSON.parse(salida);
  } catch {
    resultado.incidencias.push({
      ambito: "scc",
      nivel: "fallo",
      mensaje: "scc ha devuelto algo que no es JSON.",
    });
    return null;
  }

  const totalCodigo = filas.reduce((acc, f) => acc + f.Code, 0);

  const lenguajes = filas
    .map((f) => ({
      nombre: f.Name,
      ficheros: f.Count,
      lineas_codigo: f.Code,
      complejidad: f.Complexity,
      porcentaje:
        totalCodigo === 0 ? 0 : Math.round((f.Code / totalCodigo) * 1000) / 10,
    }))
    .sort((a, b) => b.lineas_codigo - a.lineas_codigo);

  const [ficherosTest, readme, ci, iac] = await Promise.all([
    contarTests(repo),
    hay(repo, ["README.md", "README", "README.rst", "readme.md"]),
    detectarCi(repo),
    detectarIac(repo),
  ]);

  return {
    lineas_totales: filas.reduce((acc, f) => acc + f.Lines, 0),
    lineas_codigo: totalCodigo,
    lineas_comentario: filas.reduce((acc, f) => acc + f.Comment, 0),
    lineas_blanco: filas.reduce((acc, f) => acc + f.Blank, 0),
    ficheros: filas.reduce((acc, f) => acc + f.Count, 0),
    complejidad: filas.reduce((acc, f) => acc + f.Complexity, 0),
    lenguajes,
    tiene_tests: ficherosTest > 0,
    ficheros_test: ficherosTest,
    tiene_readme: readme,
    ci,
    iac,
  };
}

/**
 * Ficheros de test. Se cuentan por convención de nombre y de carpeta, que es
 * lo que se puede saber sin ejecutar nada. No es cobertura: es si hay tests.
 */
async function contarTests(repo: string): Promise<number> {
  try {
    const { stdout } = await ejecutar(
      "git",
      [
        "-C",
        repo,
        "ls-files",
        "*test*",
        "*spec*",
        "*_test.*",
        "test/*",
        "tests/*",
        "spec/*",
        "__tests__/*",
      ],
      { timeout: 60_000, maxBuffer: 32 * 1024 * 1024 },
    );
    return stdout.split("\n").filter((l) => l.trim() !== "").length;
  } catch {
    return 0;
  }
}

async function detectarCi(repo: string): Promise<string[]> {
  const candidatos: Array<[string, string]> = [
    [".github/workflows", "GitHub Actions"],
    [".gitlab-ci.yml", "GitLab CI"],
    [".circleci/config.yml", "CircleCI"],
    ["Jenkinsfile", "Jenkins"],
    [".drone.yml", "Drone"],
    ["azure-pipelines.yml", "Azure Pipelines"],
    ["bitbucket-pipelines.yml", "Bitbucket Pipelines"],
  ];

  const encontrados: string[] = [];
  for (const [ruta, nombre] of candidatos) {
    if (await existe(join(repo, ruta))) encontrados.push(nombre);
  }
  return encontrados;
}

async function detectarIac(repo: string): Promise<string[]> {
  const encontrados = new Set<string>();

  try {
    const { stdout } = await ejecutar(
      "git",
      ["-C", repo, "ls-files"],
      { timeout: 60_000, maxBuffer: 64 * 1024 * 1024 },
    );

    for (const fichero of stdout.split("\n")) {
      if (/\.tf$/.test(fichero)) encontrados.add("Terraform");
      if (/(^|\/)Pulumi\.ya?ml$/.test(fichero)) encontrados.add("Pulumi");
      if (/(^|\/)(docker-compose|compose)\.ya?ml$/.test(fichero)) {
        encontrados.add("Docker Compose");
      }
      if (/(^|\/)Dockerfile/.test(fichero)) encontrados.add("Docker");
      if (/(^|\/)serverless\.ya?ml$/.test(fichero)) encontrados.add("Serverless");
      if (/(^|\/)(template|cloudformation)\.ya?ml$/.test(fichero)) {
        encontrados.add("CloudFormation");
      }
      if (/(^|\/)k8s\/|\.k8s\.ya?ml$/.test(fichero)) encontrados.add("Kubernetes");
      if (/(^|\/)ansible\//.test(fichero)) encontrados.add("Ansible");
    }
  } catch {
    // Sin listado de ficheros no se puede decir nada, y no pasa nada
  }

  return [...encontrados];
}

// -----------------------------------------------------------------------------
// Syft · SBOM y licencias
// -----------------------------------------------------------------------------

interface SalidaSbom {
  dependencias: ResultadoAnalisis["dependencias"];
  licencias: Licencia[];
  rutaSbom: string | null;
}

async function inventariar(
  repo: string,
  resultado: ResultadoAnalisis,
): Promise<SalidaSbom> {
  const ruta = `${repo}.sbom.json`;

  const salida = await correr(
    "syft",
    ["scan", `dir:${repo}`, "-o", "syft-json", "--quiet"],
    resultado,
    "syft",
  );

  if (!salida) return { dependencias: null, licencias: [], rutaSbom: null };

  let sbom: {
    artifacts?: Array<{
      name: string;
      version?: string;
      type?: string;
      purl?: string;
      licenses?: Array<{ value?: string; spdxExpression?: string }>;
    }>;
  };

  try {
    sbom = JSON.parse(salida);
  } catch {
    resultado.incidencias.push({
      ambito: "syft",
      nivel: "fallo",
      mensaje: "Syft ha devuelto algo que no es JSON.",
    });
    return { dependencias: null, licencias: [], rutaSbom: null };
  }

  await writeFile(ruta, salida, "utf8");

  const artefactos = sbom.artifacts ?? [];

  const componentes: Componente[] = artefactos.map((a) => ({
    nombre: a.name,
    version: a.version ?? null,
    tipo: a.type ?? "desconocido",
    purl: a.purl ?? null,
    licencias: (a.licenses ?? [])
      .map((l) => l.spdxExpression ?? l.value ?? "")
      .filter((l) => l !== ""),
  }));

  const ecosistemas = [...new Set(componentes.map((c) => c.tipo))].sort();

  // Licencias agregadas, con el copyleft fuerte marcado
  const cuenta = new Map<string, number>();
  let sinLicencia = 0;

  for (const componente of componentes) {
    if (componente.licencias.length === 0) {
      sinLicencia += 1;
      continue;
    }
    for (const licencia of componente.licencias) {
      cuenta.set(licencia, (cuenta.get(licencia) ?? 0) + 1);
    }
  }

  const licencias: Licencia[] = [...cuenta.entries()]
    .map(([identificador, componentesConEsa]) => ({
      identificador,
      componentes: componentesConEsa,
      copyleft_fuerte: esCopyleftFuerte(identificador),
      desconocida: false,
    }))
    .sort((a, b) => b.componentes - a.componentes);

  if (sinLicencia > 0) {
    licencias.push({
      identificador: "Sin determinar",
      componentes: sinLicencia,
      copyleft_fuerte: false,
      desconocida: true,
    });
  }

  return {
    dependencias: {
      total: componentes.length,
      directas: null,
      componentes,
      ecosistemas,
    },
    licencias,
    rutaSbom: ruta,
  };
}

// -----------------------------------------------------------------------------
// Grype y OSV-Scanner · vulnerabilidades
//
// Se pasan las dos porque sus bases no coinciden: lo que una no tiene, la otra
// a veces sí. Los resultados se juntan y se quita el duplicado por id.
// -----------------------------------------------------------------------------

async function buscarVulnerabilidades(
  repo: string,
  rutaSbom: string,
  resultado: ResultadoAnalisis,
): Promise<Vulnerabilidad[]> {
  const [deGrype, deOsv] = await Promise.all([
    conGrype(rutaSbom, resultado),
    conOsv(repo, resultado),
  ]);

  const porId = new Map<string, Vulnerabilidad>();
  for (const v of [...deGrype, ...deOsv]) {
    const clave = `${v.id}·${v.componente}`;
    if (!porId.has(clave)) porId.set(clave, v);
  }

  const orden = { critico: 0, alto: 1, medio: 2, bajo: 3, desconocido: 4 };
  return [...porId.values()].sort(
    (a, b) => orden[a.severidad] - orden[b.severidad],
  );
}

async function conGrype(
  rutaSbom: string,
  resultado: ResultadoAnalisis,
): Promise<Vulnerabilidad[]> {
  const salida = await correr(
    "grype",
    [`sbom:${rutaSbom}`, "-o", "json", "--quiet"],
    resultado,
    "grype",
  );

  if (!salida) return [];

  try {
    const datos = JSON.parse(salida) as {
      matches?: Array<{
        vulnerability: {
          id: string;
          severity?: string;
          description?: string;
          dataSource?: string;
          fix?: { versions?: string[] };
        };
        artifact: { name: string; version?: string };
      }>;
    };

    return (datos.matches ?? []).map((m) => ({
      id: m.vulnerability.id,
      severidad: normalizarSeveridad(m.vulnerability.severity),
      componente: m.artifact.name,
      version_afectada: m.artifact.version ?? null,
      version_corregida: m.vulnerability.fix?.versions?.[0] ?? null,
      descripcion: m.vulnerability.description ?? "",
      origen: "grype",
      enlace: m.vulnerability.dataSource ?? null,
    }));
  } catch {
    resultado.incidencias.push({
      ambito: "grype",
      nivel: "aviso",
      mensaje: "Grype ha devuelto algo que no es JSON.",
    });
    return [];
  }
}

async function conOsv(
  repo: string,
  resultado: ResultadoAnalisis,
): Promise<Vulnerabilidad[]> {
  // osv-scanner sale con código 1 cuando encuentra algo, que no es un fallo
  const salida = await correr(
    "osv-scanner",
    ["scan", "source", "--format", "json", "--recursive", repo],
    resultado,
    "osv-scanner",
    { codigosAceptados: [0, 1] },
  );

  if (!salida) return [];

  try {
    const datos = JSON.parse(salida) as {
      results?: Array<{
        packages?: Array<{
          package: { name: string; version?: string };
          vulnerabilities?: Array<{
            id: string;
            summary?: string;
            database_specific?: { severity?: string };
          }>;
        }>;
      }>;
    };

    const encontradas: Vulnerabilidad[] = [];

    for (const resultadoOsv of datos.results ?? []) {
      for (const paquete of resultadoOsv.packages ?? []) {
        for (const v of paquete.vulnerabilities ?? []) {
          encontradas.push({
            id: v.id,
            severidad: normalizarSeveridad(v.database_specific?.severity),
            componente: paquete.package.name,
            version_afectada: paquete.package.version ?? null,
            version_corregida: null,
            descripcion: v.summary ?? "",
            origen: "osv-scanner",
            enlace: `https://osv.dev/vulnerability/${v.id}`,
          });
        }
      }
    }

    return encontradas;
  } catch {
    resultado.incidencias.push({
      ambito: "osv-scanner",
      nivel: "aviso",
      mensaje: "OSV-Scanner ha devuelto algo que no es JSON.",
    });
    return [];
  }
}

// -----------------------------------------------------------------------------
// Gitleaks · secretos
//
// De aquí sale el tipo y la ubicación. El valor no se toca: ni entero, ni
// enmascarado, ni el primer carácter. Es el criterio de aceptación §11 y la
// razón por la que esta base no es un objetivo interesante para nadie.
// -----------------------------------------------------------------------------

async function buscarSecretos(
  repo: string,
  resultado: ResultadoAnalisis,
): Promise<Secreto[]> {
  const informe = `${repo}.gitleaks.json`;

  // Gitleaks sale con 1 cuando encuentra secretos, que es lo normal aquí
  await correr(
    "gitleaks",
    [
      "detect",
      "--source",
      repo,
      "--report-format",
      "json",
      "--report-path",
      informe,
      "--no-banner",
      "--redact",
    ],
    resultado,
    "gitleaks",
    { codigosAceptados: [0, 1] },
  );

  let contenido: string;
  try {
    const { readFile } = await import("node:fs/promises");
    contenido = await readFile(informe, "utf8");
  } catch {
    return [];
  }

  try {
    const hallazgos = JSON.parse(contenido) as Array<{
      RuleID?: string;
      Description?: string;
      File?: string;
      StartLine?: number;
      Commit?: string;
      Date?: string;
      Author?: string;
    }>;

    return (hallazgos ?? []).map((h) => ({
      tipo: h.RuleID ?? "desconocido",
      descripcion: h.Description ?? "",
      fichero: h.File ?? "",
      linea: h.StartLine ?? 0,
      // Si viene commit, el secreto está en el historial
      en_historial: Boolean(h.Commit),
      commit: h.Commit ?? null,
      fecha: h.Date ?? null,
      autor: h.Author ?? null,
    }));
  } catch {
    resultado.incidencias.push({
      ambito: "gitleaks",
      nivel: "aviso",
      mensaje: "Gitleaks ha devuelto algo que no es JSON.",
    });
    return [];
  }
}

// -----------------------------------------------------------------------------
// Semgrep · patrones inseguros
// -----------------------------------------------------------------------------

async function buscarPatrones(
  repo: string,
  resultado: ResultadoAnalisis,
): Promise<PatronInseguro[]> {
  const salida = await correr(
    "semgrep",
    [
      "scan",
      "--config",
      "p/security-audit",
      "--json",
      "--quiet",
      "--metrics",
      "off",
      "--timeout",
      "300",
      repo,
    ],
    resultado,
    "semgrep",
    { codigosAceptados: [0, 1] },
  );

  if (!salida) return [];

  try {
    const datos = JSON.parse(salida) as {
      results?: Array<{
        check_id: string;
        path: string;
        start: { line: number };
        extra: {
          message: string;
          severity?: string;
          metadata?: { owasp?: string | string[]; category?: string };
        };
      }>;
    };

    return (datos.results ?? []).map((r) => {
      const owasp = r.extra.metadata?.owasp;
      return {
        regla: r.check_id,
        severidad: normalizarSeveridad(r.extra.severity),
        mensaje: r.extra.message,
        // La ruta se guarda relativa: la absoluta delata el directorio temporal
        fichero: r.path.replace(`${repo}/`, ""),
        linea: r.start.line,
        categoria: Array.isArray(owasp)
          ? (owasp[0] ?? null)
          : (owasp ?? r.extra.metadata?.category ?? null),
      };
    });
  } catch {
    resultado.incidencias.push({
      ambito: "semgrep",
      nivel: "aviso",
      mensaje: "Semgrep ha devuelto algo que no es JSON.",
    });
    return [];
  }
}

// -----------------------------------------------------------------------------
// Historial de git · cadencia y concentración de conocimiento
// -----------------------------------------------------------------------------

async function medirEntrega(
  repo: string,
  resultado: ResultadoAnalisis,
): Promise<MetricasEntrega | null> {
  try {
    const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const enRepo = (args: string[]) =>
      ejecutar("git", ["-C", repo, ...args], {
        timeout: 120_000,
        maxBuffer: 64 * 1024 * 1024,
      });

    const [recientes, todos, ultimo, primero] = await Promise.all([
      enRepo(["log", `--since=${desde}`, "--format=%ae"]),
      enRepo(["log", "--format=%ae"]),
      enRepo(["log", "-1", "--format=%cI"]),
      enRepo(["log", "--reverse", "--format=%cI", "--max-count=1"]),
    ]);

    const correosRecientes = lineas(recientes.stdout);
    const correosTodos = lineas(todos.stdout);

    const porAutor = new Map<string, number>();
    for (const correo of correosTodos) {
      porAutor.set(correo, (porAutor.get(correo) ?? 0) + 1);
    }

    const mayor = Math.max(0, ...porAutor.values());
    const concentracion =
      correosTodos.length === 0
        ? 0
        : Math.round((mayor / correosTodos.length) * 1000) / 10;

    const fechaUltimo = ultimo.stdout.trim();
    const dias = fechaUltimo
      ? Math.floor((Date.now() - new Date(fechaUltimo).getTime()) / 86_400_000)
      : 0;

    return {
      commits_90d: correosRecientes.length,
      cadencia_semanal: Math.round((correosRecientes.length / 13) * 10) / 10,
      contribuidores_90d: new Set(correosRecientes).size,
      contribuidores_total: porAutor.size,
      concentracion_pct: concentracion,
      dias_ultimo_commit: dias,
      primer_commit: primero.stdout.trim() || null,
    };
  } catch (fallo) {
    resultado.incidencias.push({
      ambito: "historial",
      nivel: "aviso",
      mensaje: `No se ha podido leer el historial: ${mensajeDe(fallo)}`,
    });
    return null;
  }
}

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

/**
 * Ejecuta una herramienta, registra su versión y devuelve su salida.
 *
 * Que una herramienta falle no tumba el análisis: se anota como incidencia y
 * el resto sigue. Un informe que dice qué falta es útil; uno que no se genera
 * no lo es.
 */
async function correr(
  comando: string,
  argumentos: string[],
  resultado: ResultadoAnalisis,
  nombre: string,
  opciones: { codigosAceptados?: number[] } = {},
): Promise<string | null> {
  const version = await versionDe(comando);

  const registrar = (estado: HerramientaUsada["estado"], detalle?: string) => {
    resultado.herramientas.push({ nombre, version, estado, detalle });
  };

  try {
    const { stdout } = await ejecutar(comando, argumentos, {
      timeout: TIEMPO_MAXIMO_MS,
      maxBuffer: 256 * 1024 * 1024,
    });
    registrar("ok");
    return stdout;
  } catch (fallo) {
    const codigo = (fallo as { code?: number }).code;
    const stdout = (fallo as { stdout?: string }).stdout;

    if (
      typeof codigo === "number" &&
      opciones.codigosAceptados?.includes(codigo) &&
      stdout !== undefined
    ) {
      registrar("ok");
      return stdout;
    }

    if ((fallo as { code?: string }).code === "ENOENT") {
      registrar("omitida", "La herramienta no está instalada en este contenedor.");
      resultado.incidencias.push({
        ambito: nombre,
        nivel: "aviso",
        mensaje: `${nombre} no está disponible y se ha omitido.`,
      });
      return null;
    }

    registrar("fallo", mensajeDe(fallo));
    resultado.incidencias.push({
      ambito: nombre,
      nivel: "aviso",
      mensaje: `${nombre} ha fallado: ${mensajeDe(fallo)}`,
    });
    return null;
  }
}

async function versionDe(comando: string): Promise<string> {
  for (const bandera of ["--version", "version", "-v"]) {
    try {
      const { stdout } = await ejecutar(comando, [bandera], { timeout: 30_000 });
      const primera = stdout.trim().split("\n")[0]?.trim();
      if (primera) return primera;
    } catch {
      // Se prueba la siguiente bandera
    }
  }
  return "desconocida";
}

async function tamanoDe(directorio: string): Promise<number> {
  let total = 0;

  async function recorrer(ruta: string) {
    const entradas = await readdir(ruta, { withFileTypes: true });
    for (const entrada of entradas) {
      // El historial no cuenta como tamaño del código
      if (entrada.name === ".git") continue;
      const completa = join(ruta, entrada.name);
      if (entrada.isDirectory()) {
        await recorrer(completa);
      } else if (entrada.isFile()) {
        total += (await stat(completa)).size;
      }
    }
  }

  try {
    await recorrer(directorio);
  } catch {
    return total;
  }

  return total;
}

async function existe(ruta: string): Promise<boolean> {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function borrado(ruta: string): Promise<boolean> {
  return !(await existe(ruta));
}

async function hay(repo: string, nombres: string[]): Promise<boolean> {
  for (const nombre of nombres) {
    if (await existe(join(repo, nombre))) return true;
  }
  return false;
}

function lineas(texto: string): string[] {
  return texto.split("\n").filter((l) => l.trim() !== "");
}

function valorDe(argumentos: string[], bandera: string): string | undefined {
  const i = argumentos.indexOf(bandera);
  return i >= 0 ? argumentos[i + 1] : undefined;
}

function mensajeDe(fallo: unknown): string {
  if (fallo instanceof Error) {
    const conStderr = fallo as Error & { stderr?: string };
    const stderr = conStderr.stderr?.trim().split("\n").slice(-3).join(" ");
    return stderr || fallo.message;
  }
  return String(fallo);
}

// Solo corre como programa, no al importarse desde un test
if (process.argv[1]?.endsWith("analizar.ts")) {
  principal().catch((fallo) => {
    console.error("El análisis ha fallado:", mensajeDe(fallo));
    process.exit(1);
  });
}
