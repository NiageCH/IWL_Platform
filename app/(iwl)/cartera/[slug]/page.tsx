import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";

export default async function ResumenCompania({ params }: PageProps<"/cartera/[slug]">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="resumen"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaResumen resumen={resumen} />
      </main>
    </>
  );
}
