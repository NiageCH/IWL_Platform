#!/usr/bin/env tsx
/**
 * Genera las instantáneas de preparación que sostienen el movimiento.
 *
 * Usa el mismo `lib/scoring` que la aplicación. Podría haberse escrito como
 * función SQL, y habría sido más corto, pero entonces habría dos
 * implementaciones del mismo score y acabarían divergiendo: la de la pantalla
 * y la del histórico. El cálculo vive en un solo sitio.
 *
 *   npm run snapshots            genera las que falten
 *   npm run snapshots -- --rehacer  borra y vuelve a generarlas todas
 *
 * Se encadena a `npm run db:reset`: tras recrear la base, el histórico está.
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { calcularScoreTecnico } from "../lib/scoring/score-tecnico";
import { calcularScorePreparacion } from "../lib/scoring/score-preparacion";
import { evaluarInvertible } from "../lib/scoring/invertible";
import { calcularRunway } from "../lib/scoring/kpi-derivados";
import type {
  AreaDd,
  DimensionTecnica,
  EstadoPuntoDd,
  NivelMadurez,
  PuntoDd,
} from "../lib/scoring/tipos";

const rehacer = process.argv.includes("--rehacer");

const { url, clave } = entorno();
const db = createClient(url, clave, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const companias = await tabla("companies", "id, name, slug, stage, tech_profile");
const dimensiones = await tabla(
  "tech_dimensions",
  "id, code, name, applicability, order_index, is_active",
);
const pesos = await tabla("tech_dimension_weights", "dimension_id, tech_profile, weight");
const objetivos = await tabla("tech_stage_targets", "dimension_id, stage, target_level");
const areas = await tabla("dd_areas", "id, code, name, weight, is_active");
const puntos = await tabla("dd_items", "id, company_id, area_id, is_required, status, expires_on");
const historial = await tabla(
  "dd_item_status_history",
  "dd_item_id, company_id, to_status, created_at",
);
const evaluaciones = await tabla(
  "tech_assessments",
  "id, company_id, assessed_on, stage, tech_profile, status",
);
const puntuaciones = await tabla("tech_scores", "assessment_id, dimension_id, level");
const hallazgosTecnicos = await tabla(
  "tech_findings",
  "company_id, severity, status, created_at, resolved_at",
);
const hallazgosGenerales = await tabla(
  "findings",
  "company_id, severity, status, created_at, resolved_at",
);
const valores = await tabla(
  "kpi_values",
  "company_id, period, value, company_kpis!inner(kpi_definitions!inner(code))",
);
const ajustes = await tabla("platform_settings", "key, value");

const pesoTecnico =
  (ajustes.find((a) => a.key === "score_preparacion_peso_tecnico")?.value as {
    peso?: number;
  })?.peso ?? 2;

if (rehacer) {
  const { error } = await db
    .from("readiness_snapshots")
    .delete()
    .not("id", "is", null);
  if (error) throw new Error(`No se han podido borrar las instantáneas: ${error.message}`);
  console.log("Instantáneas anteriores borradas.");
}

let escritas = 0;

for (const compania of companias) {
  // Una instantánea por evaluación publicada, más una de hoy: el recorrido lo
  // marcan las evaluaciones, y el cierre es el estado actual
  const suyas = evaluaciones
    .filter((e) => e.company_id === compania.id && e.status === "publicada")
    .sort((a, b) => a.assessed_on.localeCompare(b.assessed_on));

  if (suyas.length === 0) continue;

  const fechas: Array<{ fecha: string; evaluacion: (typeof suyas)[number]; motivo: string }> =
    suyas.map((e, i) => ({
      fecha: e.assessed_on,
      evaluacion: e,
      motivo: i === 0 ? "linea_base" : "evaluacion",
    }));

  const hoy = new Date().toISOString().slice(0, 10);
  if (fechas[fechas.length - 1].fecha !== hoy) {
    fechas.push({
      fecha: hoy,
      evaluacion: suyas[suyas.length - 1],
      motivo: "mensual",
    });
  }

  for (const { fecha, evaluacion, motivo } of fechas) {
    const scoreTecnico = calcularScoreTecnico(
      dimensionesDe(compania, evaluacion),
    );

    const scorePreparacion = calcularScorePreparacion(
      areasA(compania.id, fecha),
      scoreTecnico,
      pesoTecnico,
      new Date(`${fecha}T23:59:59Z`),
    );

    const criticos = criticosAbiertosA(compania.id, fecha);
    const runway = runwayA(compania.id, fecha);

    const estado = evaluarInvertible({
      scoreTecnico,
      scorePreparacion,
      hallazgosAbiertos: criticos.map((h, i) => ({
        id: `h${i}`,
        severidad: "critico" as const,
        titulo: "Hallazgo crítico abierto",
        origen: h,
      })),
      hitos: [],
      runwayMeses: runway,
    });

    const { error } = await db.from("readiness_snapshots").upsert(
      {
        company_id: compania.id,
        taken_on: fecha,
        stage: evaluacion.stage,
        tech_score: scoreTecnico.valor,
        tech_complete: scoreTecnico.completo,
        preparation_score: scorePreparacion.valor,
        investable: estado.invertible,
        open_critical: criticos.length,
        runway_months: runway,
        reason: motivo,
      },
      { onConflict: "company_id,taken_on" },
    );

    if (error) {
      throw new Error(`Instantánea de ${compania.name} el ${fecha}: ${error.message}`);
    }

    escritas += 1;
  }

  const primera = fechas[0];
  const ultima = fechas[fechas.length - 1];
  console.log(
    `${compania.name.padEnd(18)} ${fechas.length} instantáneas · ` +
      `${primera.fecha} → ${ultima.fecha}`,
  );
}

console.log(`\n${escritas} instantáneas escritas.`);

// =============================================================================

/** Dimensiones tal como las necesita el cálculo, para una evaluación concreta */
function dimensionesDe(
  compania: (typeof companias)[number],
  evaluacion: (typeof evaluaciones)[number],
): DimensionTecnica[] {
  return dimensiones
    .filter((d) => d.is_active)
    .sort((a, b) => a.order_index - b.order_index)
    .map((d) => {
      const peso = pesos.find(
        (p) => p.dimension_id === d.id && p.tech_profile === evaluacion.tech_profile,
      );
      const objetivo = objetivos.find(
        (o) => o.dimension_id === d.id && o.stage === evaluacion.stage,
      );
      const puntuacion = puntuaciones.find(
        (s) => s.assessment_id === evaluacion.id && s.dimension_id === d.id,
      );

      return {
        codigo: d.code,
        nombre: d.name,
        peso: Number(peso?.weight ?? 0),
        objetivo: (objetivo?.target_level ?? 0) as NivelMadurez,
        nivel: puntuacion ? (puntuacion.level as NivelMadurez) : null,
      };
    });
}

/**
 * Estado del checklist a una fecha, reconstruido del historial.
 *
 * Un punto sin ningún cambio anterior a esa fecha estaba pendiente: el
 * checklist se instancia entero al dar de alta la compañía, así que existía
 * aunque nadie lo hubiera tocado todavía.
 */
function areasA(companyId: string, fecha: string): AreaDd[] {
  const limite = new Date(`${fecha}T23:59:59Z`).getTime();

  const porArea = new Map<string, AreaDd>();

  for (const punto of puntos.filter((p) => p.company_id === companyId)) {
    const area = areas.find((a) => a.id === punto.area_id);
    if (!area || !area.is_active) continue;

    const cambios = historial
      .filter(
        (h) =>
          h.dd_item_id === punto.id && new Date(h.created_at).getTime() <= limite,
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const estado = (cambios[cambios.length - 1]?.to_status ??
      "pendiente") as EstadoPuntoDd;

    if (!porArea.has(area.code)) {
      porArea.set(area.code, {
        codigo: area.code,
        nombre: area.name,
        peso: Number(area.weight),
        puntos: [],
      });
    }

    const fila: PuntoDd = {
      codigo: punto.id,
      estado,
      obligatorio: punto.is_required,
      caducaEl: punto.expires_on ? new Date(punto.expires_on) : null,
    };

    porArea.get(area.code)!.puntos.push(fila);
  }

  return [...porArea.values()];
}

/** Hallazgos críticos abiertos a una fecha, de los dos orígenes */
function criticosAbiertosA(companyId: string, fecha: string) {
  const limite = new Date(`${fecha}T23:59:59Z`).getTime();

  const abiertoEntonces = (h: {
    severity: string;
    created_at: string;
    resolved_at: string | null;
  }) =>
    h.severity === "critico" &&
    new Date(h.created_at).getTime() <= limite &&
    (h.resolved_at === null || new Date(h.resolved_at).getTime() > limite);

  return [
    ...hallazgosTecnicos
      .filter((h) => h.company_id === companyId && abiertoEntonces(h))
      .map(() => "tecnico" as const),
    ...hallazgosGenerales
      .filter((h) => h.company_id === companyId && abiertoEntonces(h))
      .map(() => "general" as const),
  ];
}

/** Runway con los KPI del último mes cerrado antes de esa fecha */
function runwayA(companyId: string, fecha: string): number | null {
  const suyos = valores.filter(
    (v) => v.company_id === companyId && v.period <= fecha,
  );
  if (suyos.length === 0) return null;

  const ultimo = suyos.reduce((a, b) => (a.period > b.period ? a : b)).period;

  const de = (codigo: string) => {
    const fila = suyos.find(
      (v) =>
        v.period === ultimo &&
        v.company_kpis?.kpi_definitions?.code === codigo,
    );
    return fila?.value === null || fila?.value === undefined
      ? null
      : Number(fila.value);
  };

  return calcularRunway(de("caja"), de("burn_mensual"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tabla(nombre: string, columnas: string): Promise<any[]> {
  const { data, error } = await db.from(nombre).select(columnas);
  if (error) throw new Error(`Leyendo ${nombre}: ${error.message}`);
  return data ?? [];
}

function entorno() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      clave: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  let salida: string;
  try {
    salida = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    console.error("Supabase local no responde. Ejecuta `npm run db:start`.");
    process.exit(1);
  }

  const leer = (clave: string) =>
    salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

  return { url: leer("API_URL"), clave: leer("SERVICE_ROLE_KEY") };
}
