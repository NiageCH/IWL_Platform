import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaPrograma } from "@/components/vistas/programa";

export const metadata = { title: "Programa e hitos · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/programa">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="programa"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaPrograma resumen={resumen} />
      </main>
    </>
  );
}
