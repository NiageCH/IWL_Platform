import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { VistaDiligencia } from "@/components/vistas/diligencia";

export const metadata = { title: "Due diligence general · Plataforma IWL" };

export default async function Pagina() {
  const resumen = await companiaDeLaPersona();

  return (
    <>
      <CabeceraProyecto resumen={resumen} base="/proyecto" seccionActiva="diligencia" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaDiligencia resumen={resumen} />
      </main>
    </>
  );
}
