import { redirect } from "next/navigation";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { Marco } from "@/components/marco";
import { BotonSalir } from "@/components/boton-salir";
import {
  CandidaturaPublica,
  type VistaCandidata,
} from "@/components/vistas/candidatura-publica";
import { SalaDeDatosCandidata } from "@/components/formularios/sala-candidata";

export const metadata = { title: "Tu candidatura · Plataforma IWL" };

/**
 * La candidatura vista por quien la presentó, ya con cuenta.
 *
 * Es a donde llega una candidata desde que firma el NDA. Lo mismo que veía
 * por el enlace, más la sala de datos donde entrega la documentación del due
 * diligence: eso es lo que justifica haber pasado de un enlace a una cuenta.
 */
export default async function MiCandidatura() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (persona.role !== "candidata") redirect("/");

  const supabase = await clienteServidor();
  const { data } = await supabase.rpc("mi_candidatura");
  const vista = (data as VistaCandidata[] | null)?.[0];

  if (!vista) redirect("/sin-compania");

  return (
    <Marco tema="oscuro">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <div className="mb-8 flex justify-end">
          <BotonSalir />
        </div>

        <CandidaturaPublica vista={vista} />

        {vista.puede_subir ? (
          <div className="tarjeta mt-6 p-6">
            <h2 className="mb-1 text-base font-semibold text-titular">
              Documentación del due diligence
            </h2>
            <p className="mb-4 text-sm text-secundario">
              Aquí sí se sube el fichero, no un enlace: a partir del NDA la
              información es confidencial y se queda en la plataforma, no en
              una carpeta compartida.
            </p>
            <SalaDeDatosCandidata candidaturaId={vista.id} />
          </div>
        ) : null}
      </main>
    </Marco>
  );
}
