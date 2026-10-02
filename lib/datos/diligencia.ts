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
         template_id,
         dd_areas ( id, code, name, order_index ),
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
      .select(
        "id, name, folder, expires_on, created_at, document_versions ( id, file_name, size_bytes )",
      )
      .eq("company_id", companyId)
      .order("folder"),
  ]);

  /*
   * Lo que entregó mientras era candidatura.
   *
   * No se copió nada al firmar: se lee del expediente de su candidatura,
   * que es donde pasó. Así no se le pide dos veces lo mismo, que es el
   * primer principio del proyecto.
   *
   * Si la compañía no vino de una candidatura, esto sale vacío y no
   * aparece nada en pantalla.
   */
  const { data: deSeleccion } = await supabase
    .from("documentos_de_seleccion")
    .select("*")
    .eq("company_id", companyId);

  const heredados = new Map<string, NonNullable<typeof deSeleccion>>();
  for (const d of deSeleccion ?? []) {
    if (!d.item_template_id) continue;
    heredados.set(d.item_template_id, [
      ...(heredados.get(d.item_template_id) ?? []),
      d,
    ]);
  }

  // Áreas con su id, para el formulario de subida
  const { data: areasCatalogo } = await supabase
    .from("dd_areas")
    .select("id, code, name, order_index")
    .eq("is_active", true)
    .order("order_index");

  const caducado = (fecha: string | null) =>
    fecha !== null && new Date(fecha).getTime() < ahora;

  const areaIdPorCodigo = new Map(
    (areasCatalogo ?? []).map((a) => [a.code, a.id] as const),
  );

  const areas = new Map<
    string,
    {
      id: string;
      codigo: string;
      nombre: string;
      orden: number;
      puntos: Array<
        NonNullable<typeof puntos.data>[number] & {
          caducado: boolean;
          estadoEfectivo: string;
          /** Lo que entregó para este punto siendo candidatura */
          deSeleccion: NonNullable<typeof deSeleccion>;
        }
      >;
    }
  >();

  for (const punto of puntos.data ?? []) {
    const area = punto.dd_areas;
    if (!area) continue;

    if (!areas.has(area.code)) {
      areas.set(area.code, {
        id: area.id,
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
      // Lo que ya entregó para este mismo punto siendo candidatura
      deSeleccion: punto.template_id
        ? (heredados.get(punto.template_id) ?? [])
        : [],
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
    areasCatalogo: (areasCatalogo ?? []).map((a) => ({ id: a.id, nombre: a.name })),
    puntos: (puntos.data ?? []).map((p) => ({
      id: p.id,
      titulo: p.title,
      areaId: p.dd_areas ? areaIdPorCodigo.get(p.dd_areas.code) ?? "" : "",
    })),
    hallazgos: hallazgos.data ?? [],
    documentos: (documentos.data ?? []).map((d) => ({
      ...d,
      caducado: caducado(d.expires_on),
      tieneFichero: (d.document_versions ?? []).length > 0,
    })),
  };
}
