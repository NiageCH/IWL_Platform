/**
 * Resultado de un análisis de repositorio.
 *
 * Este es el contrato del worker (§4.4, capa 1). El documento dice que primero
 * se estabilice este JSON y solo después se conecte a la cola y a la base, así
 * que aquí vive la forma y en ningún otro sitio.
 *
 * Tres reglas que no se negocian:
 *
 * 1. **Nunca sale código.** Ni fragmentos, ni líneas, ni contenido de fichero.
 *    Salen métricas, inventarios y ubicaciones.
 * 2. **De un secreto sale el tipo y dónde está, nunca el valor** (§11). Ni
 *    siquiera parcialmente enmascarado: un prefijo también es información.
 * 3. **Todo lleva la versión de la herramienta que lo produjo.** Sin eso, dos
 *    ejecuciones no son comparables y la comparación entre ejecuciones es
 *    justo lo que el módulo promete.
 */

export const VERSION_ESQUEMA = "1.0.0";

export interface ResultadoAnalisis {
  /** Versión de este contrato. Cambia si cambia la forma */
  schema_version: string;
  /** Identificador de la ejecución, para casarla con `scan_runs` */
  run_id: string;
  repositorio: Repositorio;
  ejecucion: Ejecucion;
  herramientas: HerramientaUsada[];
  codigo: MetricasCodigo | null;
  dependencias: Dependencias | null;
  vulnerabilidades: Vulnerabilidad[];
  licencias: Licencia[];
  secretos: Secreto[];
  patrones: PatronInseguro[];
  entrega: MetricasEntrega | null;
  /** Lo que no se ha podido analizar, y por qué. Un análisis a medias que se
   *  presenta como completo es peor que uno que falla */
  incidencias: Incidencia[];
}

export interface Repositorio {
  url: string;
  /** Rama analizada */
  rama: string;
  /** Commit exacto. Es lo que hace reproducible el análisis */
  commit: string;
  /** Fecha del commit analizado */
  commit_fecha: string;
  /** Tamaño del repositorio en bytes, sin contar el historial */
  tamano_bytes: number;
}

export interface Ejecucion {
  iniciada: string;
  terminada: string;
  duracion_ms: number;
  /** Confirmación de que el código clonado se ha borrado (§11) */
  codigo_borrado: boolean;
}

export interface HerramientaUsada {
  nombre: string;
  version: string;
  /** Si la herramienta no estaba disponible o falló, se dice */
  estado: "ok" | "fallo" | "omitida";
  detalle?: string;
}

export interface MetricasCodigo {
  lineas_totales: number;
  lineas_codigo: number;
  lineas_comentario: number;
  lineas_blanco: number;
  ficheros: number;
  /** Complejidad agregada, tal como la mide scc */
  complejidad: number;
  lenguajes: Lenguaje[];
  /** Si hay ficheros de test y en qué proporción */
  tiene_tests: boolean;
  ficheros_test: number;
  /** Si el repositorio trae documentación de arranque */
  tiene_readme: boolean;
  /** Configuración de integración continua encontrada */
  ci: string[];
  /** Infraestructura como código encontrada */
  iac: string[];
}

export interface Lenguaje {
  nombre: string;
  ficheros: number;
  lineas_codigo: number;
  complejidad: number;
  /** Porcentaje sobre el total de líneas de código */
  porcentaje: number;
}

export interface Dependencias {
  total: number;
  directas: number | null;
  /** Inventario completo, el SBOM que se guarda (§4.8) */
  componentes: Componente[];
  /** Gestores de paquetes encontrados */
  ecosistemas: string[];
}

export interface Componente {
  nombre: string;
  version: string | null;
  tipo: string;
  /** Identificador de paquete universal, si la herramienta lo da */
  purl: string | null;
  licencias: string[];
}

export type Severidad = "critico" | "alto" | "medio" | "bajo" | "desconocido";

export interface Vulnerabilidad {
  id: string;
  severidad: Severidad;
  componente: string;
  version_afectada: string | null;
  version_corregida: string | null;
  descripcion: string;
  /** Qué herramienta la ha encontrado: distintas bases dan distintos resultados */
  origen: string;
  enlace: string | null;
}

export interface Licencia {
  identificador: string;
  /** Cuántos componentes la usan */
  componentes: number;
  /** Copyleft fuerte: el riesgo que el documento nombra explícitamente */
  copyleft_fuerte: boolean;
  /** Si no se ha podido determinar la licencia de un componente */
  desconocida: boolean;
}

/**
 * Un secreto encontrado.
 *
 * No hay campo para el valor, y no lo habrá. El tipo dice qué clase de
 * credencial es y la ubicación dice dónde mirar; con eso la compañía la rota.
 * Guardar el valor convertiría esta base en el sitio donde están todas las
 * credenciales de la cohorte.
 */
export interface Secreto {
  /** Regla que ha saltado: 'aws-access-key', 'generic-api-key', … */
  tipo: string;
  /** Descripción legible de la regla */
  descripcion: string;
  fichero: string;
  linea: number;
  /** Si está en el historial y no en la copia de trabajo */
  en_historial: boolean;
  /** Commit donde apareció, para poder datarlo */
  commit: string | null;
  fecha: string | null;
  /** Autor del commit. Para saber a quién preguntar, no para señalar */
  autor: string | null;
}

export interface PatronInseguro {
  regla: string;
  severidad: Severidad;
  mensaje: string;
  fichero: string;
  linea: number;
  /** Categoría OWASP u otra taxonomía, si la regla la trae */
  categoria: string | null;
}

/**
 * Cadencia de entrega (§4.4, dimensión de equipo y proceso).
 *
 * Las cuatro métricas que el documento nombra salen del historial de git. La
 * frecuencia de despliegue y el tiempo de recuperación necesitan además datos
 * del proveedor, que llegan con la GitHub App.
 */
export interface MetricasEntrega {
  commits_90d: number;
  /** Commits por semana, media de los últimos 90 días */
  cadencia_semanal: number;
  contribuidores_90d: number;
  contribuidores_total: number;
  /**
   * Concentración de conocimiento: porcentaje de commits de quien más aporta.
   * Es la medida de «todo depende de una persona» del documento.
   */
  concentracion_pct: number;
  /** Días desde el último commit */
  dias_ultimo_commit: number;
  /** Primer commit, para saber la edad real del código */
  primer_commit: string | null;
}

export interface Incidencia {
  ambito: string;
  mensaje: string;
  /** Un fallo impide leer esa parte; un aviso no */
  nivel: "fallo" | "aviso";
}

/** Un resultado vacío, para que quien lo consuma no tenga que comprobar nulos */
export function resultadoVacio(runId: string, url: string): ResultadoAnalisis {
  const ahora = new Date().toISOString();
  return {
    schema_version: VERSION_ESQUEMA,
    run_id: runId,
    repositorio: {
      url,
      rama: "",
      commit: "",
      commit_fecha: "",
      tamano_bytes: 0,
    },
    ejecucion: {
      iniciada: ahora,
      terminada: ahora,
      duracion_ms: 0,
      codigo_borrado: false,
    },
    herramientas: [],
    codigo: null,
    dependencias: null,
    vulnerabilidades: [],
    licencias: [],
    secretos: [],
    patrones: [],
    entrega: null,
    incidencias: [],
  };
}

/**
 * Licencias copyleft fuerte. El documento nombra este riesgo explícitamente
 * porque es el que puede obligar a publicar el código del producto.
 */
export const COPYLEFT_FUERTE = new Set([
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "SSPL-1.0",
  "OSL-3.0",
  "EUPL-1.2",
]);

export function esCopyleftFuerte(identificador: string): boolean {
  const limpio = identificador.trim().toUpperCase();
  for (const licencia of COPYLEFT_FUERTE) {
    if (limpio === licencia.toUpperCase()) return true;
  }
  // LGPL es copyleft débil: no obliga a publicar el producto que la enlaza
  return false;
}

/** Normaliza la severidad que da cada herramienta a la escala del documento */
export function normalizarSeveridad(valor: string | null | undefined): Severidad {
  const v = (valor ?? "").trim().toLowerCase();
  if (["critical", "crítico", "critico"].includes(v)) return "critico";
  if (["high", "alto", "error"].includes(v)) return "alto";
  if (["medium", "moderate", "medio", "warning"].includes(v)) return "medio";
  if (["low", "bajo", "info", "note"].includes(v)) return "bajo";
  return "desconocido";
}
