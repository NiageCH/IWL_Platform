import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaSesiones } from "@/components/vistas/sesiones";
import { FranjaAviso } from "@/components/vistas/franja-aviso";

export const metadata = { title: "Sesiones · Plataforma IWL" };

export default async function Pagina({ params, searchParams }: PageProps<"/cartera/[slug]/sesiones">) {
  const { slug } = await params;
  const { aviso } = await searchParams;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto resumen={resumen} movimiento={movimiento} base={`/cartera/${slug}`} seccionActiva="sesiones" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <FranjaAviso aviso={aviso} contexto={{ companyId: resumen.compania.id, slug }} />
        <VistaSesiones resumen={resumen} />
      </main>
    </>
  );
}
