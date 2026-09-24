import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { VistaKpi } from "@/components/vistas/kpi";

export const metadata = { title: "KPI y updates · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/kpi">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        base={`/cartera/${slug}`}
        seccionActiva="kpi"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaKpi resumen={resumen} />
      </main>
    </>
  );
}
