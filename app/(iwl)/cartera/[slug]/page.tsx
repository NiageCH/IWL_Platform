import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";
import { esIwl, personaActual } from "@/lib/supabase/servidor";
import { leerAltaCompania } from "@/lib/datos/onboarding";
import { BloqueAlta } from "@/components/vistas/alta";
import { direccionBase } from "@/lib/direccion";

export default async function ResumenCompania({ params }: PageProps<"/cartera/[slug]">) {
  const { slug } = await params;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  // Quién del equipo fundador ha entrado y quién no: lo sigue IWL
  const persona = await personaActual();
  const altas = esIwl(persona?.role) ? await leerAltaCompania(resumen.compania.id) : null;

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
        {altas ? (
          <div className="mt-8">
            <BloqueAlta altas={altas} direccion={direccionBase()} />
          </div>
        ) : null}
      </main>
    </>
  );
}
