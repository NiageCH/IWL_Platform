import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaKpi } from "@/components/vistas/kpi";

export const metadata = { title: "KPI y updates · Plataforma IWL" };

export default async function Pagina() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto resumen={resumen}
        movimiento={movimiento} base="/proyecto" seccionActiva="kpi" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaKpi resumen={resumen} />
      </main>
    </>
  );
}
