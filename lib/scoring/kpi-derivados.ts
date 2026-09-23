/**
 * Métricas derivadas · sección 4.6.
 *
 * No se introducen: las calcula la plataforma a partir de los KPI que la
 * fundadora ya ha cargado. Es el principio de carga única aplicado a las
 * métricas.
 */

export interface ValoresMes {
  /** Periodo en formato AAAA-MM */
  periodo: string;
  valores: Record<string, number | null>;
}

/**
 * Runway en meses: caja dividida entre el consumo neto mensual.
 * Sin burn o con burn no positivo, no hay runway que calcular: la compañía no
 * está consumiendo caja.
 */
export function calcularRunway(
  caja: number | null,
  burnMensual: number | null,
): number | null {
  if (caja === null || burnMensual === null) return null;
  if (burnMensual <= 0) return null;
  return redondear(caja / burnMensual, 1);
}

/** Variación porcentual del MRR respecto al mes anterior */
export function calcularCrecimiento(
  actual: number | null,
  anterior: number | null,
): number | null {
  if (actual === null || anterior === null) return null;
  if (anterior === 0) return null;
  return redondear(((actual - anterior) / anterior) * 100, 1);
}

/** Clientes de pago sobre el total de clientes de pago más pilotos abiertos */
export function calcularConversionPiloto(
  clientesPago: number | null,
  pilotosActivos: number | null,
): number | null {
  if (clientesPago === null || pilotosActivos === null) return null;
  const total = clientesPago + pilotosActivos;
  if (total === 0) return null;
  return redondear((clientesPago / total) * 100, 1);
}

/**
 * Coste cloud sobre ingresos. El coste llega del due diligence técnico, no lo
 * teclea la fundadora (§4.4).
 */
export function calcularCosteCloudSobreIngresos(
  costeCloud: number | null,
  ingresos: number | null,
): number | null {
  if (costeCloud === null || ingresos === null) return null;
  if (ingresos === 0) return null;
  return redondear((costeCloud / ingresos) * 100, 1);
}

/**
 * Calcula todas las métricas derivadas de un mes. `anterior` aporta el mes
 * previo para las variaciones; en el primer mes de una compañía es null.
 */
export function calcularDerivados(
  mes: ValoresMes,
  anterior: ValoresMes | null,
): Record<string, number | null> {
  const v = mes.valores;
  const previo = anterior?.valores ?? {};

  return {
    runway_meses: calcularRunway(v.caja ?? null, v.burn_mensual ?? null),
    crecimiento_mrr: calcularCrecimiento(v.mrr ?? null, previo.mrr ?? null),
    conversion_piloto_cliente: calcularConversionPiloto(
      v.clientes_pago ?? null,
      v.pilotos_activos ?? null,
    ),
    coste_cloud_sobre_ingresos: calcularCosteCloudSobreIngresos(
      v.coste_cloud_mensual ?? null,
      v.ingresos ?? null,
    ),
  };
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
