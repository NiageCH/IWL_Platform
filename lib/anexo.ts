/**
 * Lo que se calcula en el Anexo en vez de teclearse. Puro: lo usan el
 * formulario, en vivo, y la acción, al guardar, y así no pueden discrepar.
 */

/** Las horas comprometidas, valoradas con la tarifa del programa, al céntimo */
export function valorHoras(horas: number | null, tarifa: number | null): number | null {
  if (horas === null || tarifa === null || !Number.isFinite(horas) || !Number.isFinite(tarifa)) return null;
  return Math.round(horas * tarifa * 100) / 100;
}

/**
 * El último día del Anexo: la víspera del mismo día, `meses` después. Si ese
 * día no existe (del 31 de enero, un mes), el último del mes: un mes que
 * acabara el 27 de febrero se quedaría corto.
 */
export function finAnexo(inicio: string | null, meses: number | null): string | null {
  const m = inicio ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(inicio) : null;
  if (!m || !meses || meses < 1) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const destino = mes + meses;
  const ultimoDelMes = new Date(Date.UTC(anio, destino + 1, 0)).getUTCDate();
  const fin =
    dia > ultimoDelMes
      ? new Date(Date.UTC(anio, destino, ultimoDelMes))
      : new Date(Date.UTC(anio, destino, dia - 1));
  return fin.toISOString().slice(0, 10);
}

/** Lee la tarifa del ajuste, `{"euros_hora": x}`: un número positivo, o nada */
export function tarifaAnexo(ajuste: unknown): number | null {
  const valor = (ajuste as { euros_hora?: unknown } | null)?.euros_hora;
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? valor : null;
}
