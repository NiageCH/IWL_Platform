import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaPlan } from "@/components/vistas/plan";

export const metadata = { title: "Business plan · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/plan">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="plan"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaPlan resumen={resumen} />
      </main>
    </>
  );
}
