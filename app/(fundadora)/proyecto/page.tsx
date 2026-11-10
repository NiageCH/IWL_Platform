import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";
import { EntradaFundadora } from "@/components/vistas/entrada";
import { clienteServidor } from "@/lib/supabase/servidor";

export default async function ResumenProyecto() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);

  // El borrador no le llega (RLS): lo que vea aquí ya se le ha propuesto
  let propuesta: string | null = null;
  if (resumen.compania.tramo === "entrada") {
    const supabase = await clienteServidor();
    const { data } = await supabase
      .from("annexes")
      .select("status")
      .eq("company_id", resumen.compania.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    propuesta = data?.status ?? null;
  }

  return (
    <>
      <CabeceraProyecto resumen={resumen}
        movimiento={movimiento} base="/proyecto" seccionActiva="resumen" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {resumen.compania.tramo === "entrada" ? <EntradaFundadora compania={resumen.compania} propuesta={propuesta} /> : null}
        <VistaResumen resumen={resumen} />
      </main>
    </>
  );
}
