import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { VistaPlan } from "@/components/vistas/plan";

export const metadata = { title: "Business plan · Plataforma IWL" };

export default async function Pagina({ params }: PageProps<"/cartera/[slug]/plan">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        base={`/cartera/${slug}`}
        seccionActiva="plan"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <VistaPlan resumen={resumen} />
      </main>
    </>
  );
}
