import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaSesiones } from "@/components/vistas/sesiones";
import { FranjaAviso } from "@/components/vistas/franja-aviso";

export const metadata = { title: "Sesiones · Plataforma IWL" };

export default async function Pagina({ searchParams }: PageProps<"/proyecto/sesiones">) {
  const { aviso } = await searchParams;
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);

  return (
    <>
      <CabeceraProyecto resumen={resumen} movimiento={movimiento} base="/proyecto" seccionActiva="sesiones" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <FranjaAviso aviso={aviso} contexto={{ companyId: resumen.compania.id, slug: resumen.compania.slug }} />
        <VistaSesiones resumen={resumen} />
      </main>
    </>
  );
}
