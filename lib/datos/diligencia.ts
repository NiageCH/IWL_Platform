import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lectura del due diligence general.
 *
 * La caducidad se resuelve aquí y no en el componente: un componente que
 * llama al reloj deja de ser puro y su resultado cambia entre renderizados.
 * Las filas salen ya marcadas.
 */
export async function leerDiligencia(companyId: string) {
  const supabase = await clienteServidor();
  const ahora = Date.now();

  const [puntos, hallazgos, documentos] = await Promise.all([
    supabase
      .from("dd_items")
      .select(
        `id, title, description, status, is_required, due_date, expires_on,
         notes, validated_at,
         dd_areas ( code, name, order_index ),
         dd_item_templates ( order_index )`,
      )
      .eq("company_id", companyId),
    supabase
      .from("findings")
      .select(
        "id, severity, status, title, description, impact, resolution_plan, due_date, dd_areas ( name )",
      )
      .eq("company_id", companyId),
    supabase
      .from("documents")
      .select("id, name, folder, expires_on, created_at")
      .eq("company_id", companyId)
      .order("folder"),
  ]);

  const caducado = (fecha: string | null) =>
    fecha !== null && new Date(fecha).getTime() < ahora;

  const areas = new Map<
    string,
    {
      codigo: string;
      nombre: string;
      orden: number;
      puntos: Array<
        NonNullable<typeof puntos.data>[number] & {
          caducado: boolean;
          estadoEfectivo: string;
        }
      >;
    }
  >();

  for (const punto of puntos.data ?? []) {
    const area = punto.dd_areas;
    if (!area) continue;

    if (!areas.has(area.code)) {
      areas.set(area.code, {
        codigo: area.code,
        nombre: area.name,
        orden: area.order_index,
        puntos: [],
      });
    }

    const vencido = caducado(punto.expires_on);
    areas.get(area.code)!.puntos.push({
      ...punto,
      caducado: vencido,
      estadoEfectivo: vencido ? "pendiente" : punto.status,
    });
  }

  // Cada área en su orden, y dentro de ella los puntos en el orden del
  // checklist: es como IWL los repasa en la sesión de due diligence
  for (const area of areas.values()) {
    area.puntos.sort(
      (a, b) =>
        (a.dd_item_templates?.order_index ?? 0) -
        (b.dd_item_templates?.order_index ?? 0),
    );
  }

  return {
    areas: [...areas.values()].sort((a, b) => a.orden - b.orden),
    hallazgos: hallazgos.data ?? [],
    documentos: (documentos.data ?? []).map((d) => ({
      ...d,
      caducado: caducado(d.expires_on),
    })),
  };
}
