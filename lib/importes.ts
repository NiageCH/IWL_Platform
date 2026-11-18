/**
 * Un importe en euros como lo escribe una persona.
 *
 * «20.000», «20.000 €», «20000», «1.250,50» y «1250.5» son lo que parecen.
 * `numeroEscritoAMano` cambia la coma por punto y ya está, que vale para un
 * porcentaje pero convierte «20.000» en veinte euros: con dinero, el punto
 * de los miles es lo normal.
 *
 * `null` si está vacío; `NaN` si no se parece a un importe, para que quien
 * valida lo diga.
 */
export function importeEscrito(texto: string | null | undefined): number | null {
  const limpio = (texto ?? "").replace(/[€\s]/g, "").trim();
  if (limpio === "") return null;

  // Con coma, la coma es el decimal y los puntos son miles
  if (limpio.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(limpio)) return Number.NaN;
    return Number(limpio.replace(/\./g, "").replace(",", "."));
  }
  // Sin coma: puntos de miles en grupos de tres, o un punto decimal
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) return Number(limpio.replace(/\./g, ""));
  if (/^\d+(\.\d{1,2})?$/.test(limpio)) return Number(limpio);
  return Number.NaN;
}
