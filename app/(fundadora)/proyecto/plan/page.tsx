import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { VistaPlan } from "@/components/vistas/plan";

export const metadata = { title: "Business plan · Plataforma IWL" };

export default async function Pagina() {
  const resumen = await companiaDeLaPersona();

  return (
    <>
      <CabeceraProyecto resumen={resumen} base="/proyecto" seccionActiva="plan" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaPlan resumen={resumen} />
      </main>
    </>
  );
}
