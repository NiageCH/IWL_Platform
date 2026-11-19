import { FranjaAviso } from "@/components/vistas/franja-aviso";
import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaRuta } from "@/components/vistas/ruta";

export const metadata = { title: "Hoja de ruta · Plataforma IWL" };

export default async function Pagina({ params, searchParams }: PageProps<"/cartera/[slug]/ruta">) {
  const { aviso } = await searchParams;
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="ruta"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <FranjaAviso aviso={aviso} contexto={{ companyId: resumen.compania.id, slug }} />
        <VistaRuta resumen={resumen} />
      </main>
    </>
  );
}
