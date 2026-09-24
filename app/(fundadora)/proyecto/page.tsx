import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { VistaResumen } from "@/components/vistas/resumen";

export default async function ResumenProyecto() {
  const resumen = await companiaDeLaPersona();

  return (
    <>
      <CabeceraProyecto resumen={resumen} base="/proyecto" seccionActiva="resumen" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaResumen resumen={resumen} />
      </main>
    </>
  );
}
