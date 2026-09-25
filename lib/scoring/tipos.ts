/**
 * Tipos del cálculo de scores.
 *
 * Deliberadamente independientes de la base de datos: estas funciones reciben
 * datos planos y no saben de Supabase. Así se prueban con tabla de casos y la
 * interfaz nunca recalcula por su cuenta.
 */

export type Etapa = "pre_semilla" | "semilla" | "serie_a";

export type PerfilTecnologico = "software" | "software_ia" | "hardware";

/** Escala de madurez de 0 a 4 (§4.4) */
export type NivelMadurez = 0 | 1 | 2 | 3 | 4;

export type Semaforo = "verde" | "ambar" | "rojo";

export type Severidad = "critico" | "alto" | "medio" | "bajo";

export type EstadoPuntoDd =
  | "pendiente"
  | "entregado"
  | "en_revision"
  | "validado"
  | "bloqueante";

/** Una dimensión técnica tal como la necesita el cálculo */
export interface DimensionTecnica {
  codigo: string;
  nombre: string;
  /** Peso para el perfil tecnológico de la compañía. Cero desactiva la dimensión */
  peso: number;
  /** Nivel objetivo para la etapa actual de la compañía */
  objetivo: NivelMadurez;
  /** Nivel puntuado por el revisor. Nulo si todavía no se ha evaluado */
  nivel: NivelMadurez | null;
}

export interface ResultadoDimension extends DimensionTecnica {
  /** Cuánto del objetivo cubre esta dimensión, de 0 a 1 */
  cobertura: number;
  /** Niveles que faltan para alcanzar el objetivo de la etapa */
  brecha: number;
  /** Si la dimensión cuenta para esta compañía */
  aplica: boolean;
  /** Si está evaluada */
  evaluada: boolean;
}

export interface ScoreTecnico {
  /** De 0 a 100. Distancia al objetivo de la etapa, no a la perfección */
  valor: number;
  dimensiones: ResultadoDimension[];
  /** Dimensiones que aplican y todavía no tienen puntuación */
  sinEvaluar: string[];
  /** Cuántas dimensiones aplicables tienen puntuación */
  evaluadas: number;
  /** Cuántas dimensiones aplican a esta compañía */
  aplicables: number;
  /** Si ninguna dimensión aplicable está evaluada, el score no significa nada */
  completo: boolean;
}

export interface PuntoDd {
  codigo: string;
  estado: EstadoPuntoDd;
  obligatorio: boolean;
  /** Fecha de caducidad del documento asociado, si la tiene */
  caducaEl?: Date | null;
}

export interface AreaDd {
  codigo: string;
  nombre: string;
  peso: number;
  puntos: PuntoDd[];
}

export interface ResultadoArea {
  codigo: string;
  nombre: string;
  peso: number;
  /** De 0 a 100 */
  valor: number;
  total: number;
  validados: number;
  pendientes: number;
  bloqueantes: number;
}

export interface ScorePreparacion {
  /** De 0 a 100, ponderado por área y con el score técnico incluido */
  valor: number;
  areas: ResultadoArea[];
  /** Aportación del due diligence tecnológico al total */
  aportacionTecnica: { peso: number; valor: number } | null;
}

export interface HallazgoAbierto {
  id: string;
  severidad: Severidad;
  titulo: string;
  origen: "tecnico" | "general";
}

export interface HitoAnexo {
  id: string;
  titulo: string;
  estado: "pendiente" | "en_curso" | "cumplido" | "retrasado";
  /** Los hitos de producto y tracción son los que condicionan el estado invertible */
  condicionaInvertible: boolean;
}

export interface EntradaInvertible {
  scoreTecnico: ScoreTecnico;
  scorePreparacion: ScorePreparacion;
  hallazgosAbiertos: HallazgoAbierto[];
  hitos: HitoAnexo[];
  /** Meses de caja al ritmo actual. Nulo si no hay datos para calcularlo */
  runwayMeses: number | null;
}

export interface ResultadoInvertible {
  invertible: boolean;
  /**
   * Lo que falta, redactado como siguiente paso. Si está vacío, la compañía
   * cumple la definición de proyecto invertible de la sección 3.
   */
  siguientesPasos: string[];
}
