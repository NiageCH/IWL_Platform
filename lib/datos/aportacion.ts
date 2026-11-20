import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoSesion } from "@/lib/sesiones";

/**
 * Extracto de aportación de IWL a una compañía.
 *
 * Es el apartado E del Anexo I, vivo. Sirve para tres cosas a la vez: que la
 * fundadora vea lo que recibe, que IWL justifique el equity, y que la
 * aportación se pueda demostrar en una ronda futura.
 */

export interface Compromiso {
  annexId: string | null;
  horasComprometidas: number | null;
  /** Las confirmadas: por ella, por plazo, por dirección o de antes del 13 nov */
  horasEntregadas: number;
  horasPorConfirmar: number;
  horasEnDiscusion: number;
  horasPct: number | null;
  valorAplicado: number;
  valorMercado: number;
  /** Lo que la compañía se ahorra respecto al precio de mercado */
  descuento: number;
  cajaComprometida: number | null;
  cajaDesembolsada: number;
  cajaJustificada: number;
  cajaPct: number | null;
  equityPct: number | null;
  introducciones: number;
  introduccionesCerradas: number;
  entregables: number;
}

export async function leerCompromiso(companyId: string): Promise<Compromiso | null> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("commitment_counter")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!data) return null;

  const valorAplicado = Number(data.delivered_hours_value ?? 0);
  const valorMercado = Number(data.delivered_market_value ?? 0);

  return {
    annexId: data.annex_id,
    horasComprometidas: numero(data.committed_hours),
    horasEntregadas: Number(data.delivered_hours ?? 0),
    horasPorConfirmar: Number(data.pending_hours ?? 0),
    horasEnDiscusion: Number(data.disputed_hours ?? 0),
    horasPct: numero(data.hours_pct),
    valorAplicado,
    valorMercado,
    descuento: Math.round((valorMercado - valorAplicado) * 100) / 100,
    cajaComprometida: numero(data.committed_cash),
    cajaDesembolsada: Number(data.disbursed_cash ?? 0),
    cajaJustificada: Number(data.justified_cash ?? 0),
    cajaPct: numero(data.cash_pct),
    equityPct: numero(data.equity_pct),
    introducciones: Number(data.introductions_made ?? 0),
    introduccionesCerradas: Number(data.introductions_closed ?? 0),
    entregables: Number(data.deliverables_count ?? 0),
  };
}

export interface LineaHoras {
  id: string;
  fecha: string;
  persona: string;
  perfil: string;
  materia: string;
  descripcion: string;
  horas: number;
  valorAplicado: number;
  valorMercado: number;
  descuento: number;
  objetada: boolean;
  estado: EstadoSesion | null;
  sesionId: string | null;
}

export interface ResumenMateria {
  materia: string;
  horas: number;
  valorAplicado: number;
  valorMercado: number;
  descuento: number;
}

export interface Extracto {
  compromiso: Compromiso | null;
  horas: LineaHoras[];
  porMateria: ResumenMateria[];
  porPersona: Array<{ persona: string; perfil: string; horas: number; valor: number }>;
  partidas: Array<{
    id: string;
    partida: string;
    descripcion: string | null;
    comprometido: number;
    desembolsado: number;
    justificado: number;
    condicion: string | null;
    tramo: number | null;
  }>;
  desembolsos: Array<{
    id: string;
    partida: string | null;
    importe: number;
    fecha: string;
    justificado: boolean;
  }>;
  introducciones: Array<{
    id: string;
    contacto: string;
    organizacion: string | null;
    tipo: string;
    quien: string;
    fecha: string;
    estado: string;
    resultado: string | null;
    importe: number | null;
    generaComision: boolean;
  }>;
  entregables: Array<{
    id: string;
    titulo: string;
    descripcion: string | null;
    materia: string | null;
    fecha: string;
  }>;
}

export async function leerExtracto(companyId: string): Promise<Extracto> {
  const supabase = await clienteServidor();

  const [compromiso, horas, partidas, desembolsos, introducciones, entregables] =
    await Promise.all([
      leerCompromiso(companyId),
      supabase
        .from("contribution_hours_valued")
        .select("*")
        .eq("company_id", companyId)
        .order("worked_on", { ascending: false }),
      supabase
        .from("cash_commitments")
        .select("id, heading, description, amount, tranche, condition")
        .eq("company_id", companyId)
        .order("tranche"),
      supabase
        .from("cash_disbursements")
        .select("id, amount, disbursed_on, justified_on, cash_commitments ( heading )")
        .eq("company_id", companyId)
        .order("disbursed_on", { ascending: false }),
      supabase
        .from("introductions")
        .select(
          `id, introducer_name, introduced_on, status, outcome, amount, closed_on,
           counts_for_commission, commission_window_months,
           contacts ( name, organization, kind )`,
        )
        .eq("company_id", companyId)
        .order("introduced_on", { ascending: false }),
      supabase
        .from("deliverables")
        .select("id, title, description, delivered_on, contribution_subjects ( name )")
        .eq("company_id", companyId)
        .order("delivered_on", { ascending: false }),
    ]);

  const lineas: LineaHoras[] = (horas.data ?? []).map((h) => ({
    id: h.id!,
    fecha: h.worked_on!,
    persona: h.person_name!,
    perfil: h.profile_code!,
    materia: h.subject_name!,
    descripcion: h.description!,
    horas: Number(h.hours),
    valorAplicado: Number(h.applied_value),
    valorMercado: Number(h.market_value),
    descuento: Number(h.discount_value),
    objetada: Boolean(h.objected),
    estado: (h.session_status as EstadoSesion | null) ?? null,
    sesionId: h.work_session_id ?? null,
  }));

  // Agregados por materia y por persona, que es como se lee el extracto
  const materias = new Map<string, ResumenMateria>();
  const personas = new Map<string, { persona: string; perfil: string; horas: number; valor: number }>();

  for (const linea of lineas) {
    if (!materias.has(linea.materia)) {
      materias.set(linea.materia, {
        materia: linea.materia,
        horas: 0,
        valorAplicado: 0,
        valorMercado: 0,
        descuento: 0,
      });
    }
    const m = materias.get(linea.materia)!;
    m.horas += linea.horas;
    m.valorAplicado += linea.valorAplicado;
    m.valorMercado += linea.valorMercado;
    m.descuento += linea.descuento;

    const clave = `${linea.persona}·${linea.perfil}`;
    if (!personas.has(clave)) {
      personas.set(clave, {
        persona: linea.persona,
        perfil: linea.perfil,
        horas: 0,
        valor: 0,
      });
    }
    const p = personas.get(clave)!;
    p.horas += linea.horas;
    p.valor += linea.valorAplicado;
  }

  const porDesembolso = new Map<string, { desembolsado: number; justificado: number }>();
  for (const d of desembolsos.data ?? []) {
    const partida = d.cash_commitments?.heading ?? "";
    if (!porDesembolso.has(partida)) {
      porDesembolso.set(partida, { desembolsado: 0, justificado: 0 });
    }
    const acumulado = porDesembolso.get(partida)!;
    acumulado.desembolsado += Number(d.amount);
    if (d.justified_on) acumulado.justificado += Number(d.amount);
  }

  return {
    compromiso,
    horas: lineas,
    porMateria: [...materias.values()]
      .map(redondearMateria)
      .sort((a, b) => b.horas - a.horas),
    porPersona: [...personas.values()]
      .map((p) => ({ ...p, horas: redondear(p.horas), valor: redondear(p.valor) }))
      .sort((a, b) => b.horas - a.horas),
    partidas: (partidas.data ?? []).map((p) => {
      const acumulado = porDesembolso.get(p.heading) ?? {
        desembolsado: 0,
        justificado: 0,
      };
      return {
        id: p.id,
        partida: p.heading,
        descripcion: p.description,
        comprometido: Number(p.amount),
        desembolsado: acumulado.desembolsado,
        justificado: acumulado.justificado,
        condicion: p.condition,
        tramo: p.tranche,
      };
    }),
    desembolsos: (desembolsos.data ?? []).map((d) => ({
      id: d.id,
      partida: d.cash_commitments?.heading ?? null,
      importe: Number(d.amount),
      fecha: d.disbursed_on,
      justificado: Boolean(d.justified_on),
    })),
    introducciones: (introducciones.data ?? []).map((i) => {
      // Misma regla que `app.genera_comision`, para que la pantalla diga lo
      // mismo que dirá el cálculo cuando haya que reclamar
      const dentroDeVentana =
        i.closed_on !== null &&
        new Date(i.closed_on).getTime() <=
          new Date(i.introduced_on).setMonth(
            new Date(i.introduced_on).getMonth() + (i.commission_window_months ?? 18),
          );

      return {
        id: i.id,
        contacto: i.contacts?.name ?? "Sin nombre",
        organizacion: i.contacts?.organization ?? null,
        tipo: i.contacts?.kind ?? "",
        quien: i.introducer_name,
        fecha: i.introduced_on,
        estado: i.status,
        resultado: i.outcome,
        importe: i.amount === null ? null : Number(i.amount),
        generaComision:
          Boolean(i.counts_for_commission) &&
          i.status === "cerrada" &&
          i.amount !== null &&
          dentroDeVentana,
      };
    }),
    entregables: (entregables.data ?? []).map((e) => ({
      id: e.id,
      titulo: e.title,
      descripcion: e.description,
      materia: e.contribution_subjects?.name ?? null,
      fecha: e.delivered_on,
    })),
  };
}

function redondearMateria(m: ResumenMateria): ResumenMateria {
  return {
    materia: m.materia,
    horas: redondear(m.horas),
    valorAplicado: redondear(m.valorAplicado),
    valorMercado: redondear(m.valorMercado),
    descuento: redondear(m.descuento),
  };
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function numero(valor: number | string | null): number | null {
  return valor === null ? null : Number(valor);
}

/**
 * Lo devengado y liberado por hitos validados (REVISION, 18 nov).
 *
 * Sale del registro, que es donde la base lo deja al validar: «Devengado
 * X % el <fecha>, validado por <quién>». Se suma en centésimas para que
 * 2,5 + 0,1 dé 2,6 y no 2,6000000000000001.
 */
export interface Devengo {
  id: number;
  tipo: "equity" | "financiacion";
  titulo: string;
  cifra: number;
  fecha: string;
  validadoPor: string | null;
}

export interface Devengos {
  lineas: Devengo[];
  equity: number;
  financiacion: number;
}

export async function leerDevengos(companyId: string): Promise<Devengos> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, detail, created_at")
    .eq("company_id", companyId)
    .in("action", ["equity_devengado", "financiacion_liberada"])
    .order("created_at");

  const lineas: Devengo[] = (data ?? []).map((f) => {
    const d = (f.detail ?? {}) as { titulo?: string; pct?: number; importe?: number; fecha?: string; validado_por?: string };
    const equity = f.action === "equity_devengado";
    return {
      id: f.id,
      tipo: equity ? "equity" : "financiacion",
      titulo: d.titulo ?? "Hito",
      cifra: Number((equity ? d.pct : d.importe) ?? 0),
      fecha: d.fecha ?? f.created_at,
      validadoPor: d.validado_por ?? null,
    };
  });
  const suma = (tipo: Devengo["tipo"]) =>
    lineas.filter((l) => l.tipo === tipo).reduce((t, l) => t + Math.round(l.cifra * 100), 0) / 100;
  return { lineas, equity: suma("equity"), financiacion: suma("financiacion") };
}
