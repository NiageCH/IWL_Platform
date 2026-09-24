import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaTecnico } from "@/components/vistas/tecnico";

export const metadata = { title: "Due diligence técnico · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/tecnico">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="tecnico"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaTecnico resumen={resumen} />
      </main>
    </>
  );
}
