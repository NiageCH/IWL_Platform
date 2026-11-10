import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";
import { EntradaFundadora } from "@/components/vistas/entrada";

export default async function ResumenProyecto() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto resumen={resumen}
        movimiento={movimiento} base="/proyecto" seccionActiva="resumen" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {resumen.compania.tramo === "entrada" ? <EntradaFundadora compania={resumen.compania} /> : null}
        <VistaResumen resumen={resumen} />
      </main>
    </>
  );
}
