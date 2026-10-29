"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  error,
  numeroEscritoAMano,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * Acciones del update mensual y los KPI (§4.6).
 *
 * El valor se carga una vez aquí y desde ahí lo leen dashboard, plan
 * financiero e informe. Las métricas derivadas no se guardan: se calculan al
 * leer, para que no puedan quedar desfasadas respecto a sus componentes.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
  /*
   * Y administración, que enseña si una compañía se puede borrar.
   *
   * Cualquier cosa que se registre aquí —un Anexo, un hito, un documento,
   * horas, un KPI— cambia esa respuesta. Sin esto, la lista seguía
   * ofreciendo un borrado a secas que la base iba a rechazar.
   */
  revalidatePath("/admin", "layout");
}

/** Periodo en formato AAAA-MM, que se guarda como el día 1 de ese mes */
const periodo = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "El mes se escribe como 2026-09.")
  .transform((v) => `${v}-01`);

const esquemaUpdate = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  period: periodo,
  status: z.enum(["borrador", "entregado", "revisado"]),
  achievements: textoOpcional,
  blockers: textoOpcional,
  requests: textoOpcional,
});

export async function guardarUpdate(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaUpdate, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...update } = datos;

  const { error: falloBase } = await supabase
    .from("monthly_updates")
    .upsert(update, { onConflict: "company_id,period" });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok(
    datos.status === "entregado" ? "Update entregado." : "Update guardado.",
  );
}

const esquemaValor = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  company_kpi_id: uuid,
  period: periodo,
  /* Con el signo, la coma y los espacios que teclea una persona */
  value: numeroEscritoAMano(
    -1_000_000_000,
    1_000_000_000,
    "Escribe un número.",
  ),
  note: textoOpcional,
});

/**
 * Corregir **un** valor de un mes ya cargado.
 *
 * Existía desde el principio y no tenía por dónde llamarse, así que un mes
 * enviado no se podía arreglar: la pantalla solo ofrece cargar «el
 * siguiente al último con datos». Un MRR mal tecleado quedaba mal para
 * siempre y arrastraba el runway, el crecimiento y la comparativa.
 *
 * El límite y el rastro no están aquí: los pone la base. Un mes que IWL ya
 * revisó lo rechaza un disparador, y cada cambio de valor se apunta solo en
 * `kpi_value_history`. Repetirlo en la acción sería la misma regla en dos
 * sitios que pueden discrepar.
 */
export async function guardarValorKpi(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaValor, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  const { error: falloBase } = await supabase.from("kpi_values").upsert(
    {
      company_id: datos.company_id,
      company_kpi_id: datos.company_kpi_id,
      period: datos.period,
      value: datos.value,
      note: datos.note,
      source: "manual",
    },
    { onConflict: "company_kpi_id,period" },
  );

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Corregido. Las derivadas y la comparativa se recalculan solas.");
}

/**
 * Reabrir un mes que IWL ya revisó, para que se pueda corregir.
 *
 * Es de IWL y deja rastro en el registro de actividad: reabrir es deshacer
 * una validación, y eso tiene que poder explicarse después. Quién puede lo
 * decide la función de la base, no esto.
 */
export async function reabrirUpdate(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), id: uuid }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("reabrir_update", {
    target_update: datos.id,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Mes reabierto. La compañía ya puede corregirlo.");
}

/**
 * Carga de varios KPI de un mes en una sola pasada, que es como se rellena el
 * update: la fundadora escribe la columna entera y guarda una vez.
 */
export async function guardarValoresDelMes(formData: FormData): Promise<Resultado> {
  const slug = String(formData.get("slug") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  const mes = String(formData.get("period") ?? "");

  if (!slug || !companyId || !/^\d{4}-\d{2}$/.test(mes)) {
    return error("Falta el mes o la compañía.");
  }

  const filas: Array<{
    company_id: string;
    company_kpi_id: string;
    period: string;
    value: number | null;
    source: string;
  }> = [];

  const campos: Record<string, string> = {};

  for (const [clave, bruto] of formData.entries()) {
    if (!clave.startsWith("kpi:")) continue;

    const companyKpiId = clave.slice(4);
    const texto = String(bruto).trim().replace(",", ".");

    if (texto === "") continue;

    const valor = Number(texto);
    if (!Number.isFinite(valor)) {
      campos[clave] = "Escribe un número.";
      continue;
    }

    filas.push({
      company_id: companyId,
      company_kpi_id: companyKpiId,
      period: `${mes}-01`,
      value: valor,
      source: "manual",
    });
  }

  if (Object.keys(campos).length > 0) {
    return error("Hay valores que no son números.", campos);
  }

  if (filas.length === 0) {
    return error("No has introducido ningún valor.");
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("kpi_values")
    .upsert(filas, { onConflict: "company_kpi_id,period" });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok(
    filas.length === 1 ? "Valor guardado." : `${filas.length} valores guardados.`,
  );
}
