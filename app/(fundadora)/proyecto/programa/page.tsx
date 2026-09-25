import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaPrograma } from "@/components/vistas/programa";

export const metadata = { title: "Programa e hitos · Plataforma IWL" };

export default async function Pagina() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base="/proyecto"
        seccionActiva="programa"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaPrograma resumen={resumen} />
      </main>
    </>
  );
}
