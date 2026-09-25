import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaAportacion } from "@/components/vistas/aportacion";

export const metadata = { title: "Aportación de IWL · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/aportacion">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="aportacion"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaAportacion resumen={resumen} />
      </main>
    </>
  );
}
