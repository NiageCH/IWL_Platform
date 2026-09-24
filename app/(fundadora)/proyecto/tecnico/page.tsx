import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaTecnico } from "@/components/vistas/tecnico";

export const metadata = { title: "Due diligence técnico · Plataforma IWL" };

export default async function Pagina() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto resumen={resumen}
        movimiento={movimiento} base="/proyecto" seccionActiva="tecnico" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaTecnico resumen={resumen} />
      </main>
    </>
  );
}
