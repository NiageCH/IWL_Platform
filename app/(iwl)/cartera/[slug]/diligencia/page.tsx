import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaDiligencia } from "@/components/vistas/diligencia";

export const metadata = { title: "Due diligence general · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/diligencia">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="diligencia"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaDiligencia resumen={resumen} />
      </main>
    </>
  );
}
