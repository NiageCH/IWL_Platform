import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Aportación de IWL que no son horas.
 *
 * Compras que asume, eventos a los que lleva al proyecto, reuniones con
 * inversores que organiza y trámites que hace por la compañía. Hasta ahora no
 * se registraban en ninguna parte, y son parte del argumento del equity igual
 * que las horas.
 */

export type TipoAportacion = Database["public"]["Enums"]["tipo_aportacion"];

export const TIPOS_APORTACION: {
  valor: TipoAportacion;
  nombre: string;
  plural: string;
  ayuda: string;
}[] = [
  {
    valor: "compra",
    nombre: "Compra",
    plural: "Compras",
    ayuda: "Algo que IWL paga y la compañía usa.",
  },
  {
    valor: "evento",
    nombre: "Evento",
    plural: "Eventos",
    ayuda: "Un escenario al que IWL lleva al proyecto.",
  },
  {
    valor: "reunion_inversor",
    nombre: "Reunión con inversores",
    plural: "Reuniones con inversores",
    ayuda: "Una reunión que IWL organiza y a la que acude.",
  },
  {
    valor: "gestion",
    nombre: "Gestión",
    plural: "Gestiones",
    ayuda: "Un trámite que IWL hace por la compañía.",
  },
];

export function nombreTipo(valor: TipoAportacion): string {
  return TIPOS_APORTACION.find((t) => t.valor === valor)?.nombre ?? valor;
}

export interface ItemAportacion {
  id: string;
  tipo: TipoAportacion;
  fecha: string;
  titulo: string;
  descripcion: string | null;
  contraparte: string | null;
  coste: number | null;
  valorMercado: number | null;
  /** Lo que la compañía se ahorra: es la parte que sostiene el equity */
  descuento: number;
  resultado: string | null;
  etapa: string | null;
}

export interface ResumenAportacionExtra {
  items: ItemAportacion[];
  porTipo: {
    tipo: TipoAportacion;
    cuantos: number;
    coste: number;
    valorMercado: number;
    descuento: number;
  }[];
  coste: number;
  valorMercado: number;
  descuento: number;
}

export async function leerAportacionExtra(
  companyId: string,
): Promise<ResumenAportacionExtra> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("contribution_items")
    .select(
      "id, kind, occurred_on, title, description, counterpart, amount, market_value, outcome, roadmap_stages ( name )",
    )
    .eq("company_id", companyId)
    .order("occurred_on", { ascending: false });

  const items: ItemAportacion[] = (data ?? []).map((i) => {
    const coste = i.amount === null ? null : Number(i.amount);
    const mercado = i.market_value === null ? null : Number(i.market_value);
    return {
      id: i.id,
      tipo: i.kind,
      fecha: i.occurred_on,
      titulo: i.title,
      descripcion: i.description,
      contraparte: i.counterpart,
      coste,
      valorMercado: mercado,
      descuento: Math.round(((mercado ?? 0) - (coste ?? 0)) * 100) / 100,
      resultado: i.outcome,
      etapa: i.roadmap_stages?.name ?? null,
    };
  });

  const porTipo = TIPOS_APORTACION.map((t) => {
    const suyos = items.filter((i) => i.tipo === t.valor);
    const coste = suyos.reduce((s, i) => s + (i.coste ?? 0), 0);
    const mercado = suyos.reduce((s, i) => s + (i.valorMercado ?? 0), 0);
    return {
      tipo: t.valor,
      cuantos: suyos.length,
      coste,
      valorMercado: mercado,
      descuento: Math.round((mercado - coste) * 100) / 100,
    };
  }).filter((t) => t.cuantos > 0);

  const coste = items.reduce((s, i) => s + (i.coste ?? 0), 0);
  const valorMercado = items.reduce((s, i) => s + (i.valorMercado ?? 0), 0);

  return {
    items,
    porTipo,
    coste,
    valorMercado,
    descuento: Math.round((valorMercado - coste) * 100) / 100,
  };
}
