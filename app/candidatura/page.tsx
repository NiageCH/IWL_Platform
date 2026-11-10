import { redirect } from "next/navigation";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { Marco } from "@/components/marco";
import { BotonSalir } from "@/components/boton-salir";
import {
  CandidaturaPublica,
  type VistaCandidata,
} from "@/components/vistas/candidatura-publica";
import { SalaDeDatosCandidata } from "@/components/formularios/sala-candidata";
import { FirmarNdaCandidata } from "@/components/formularios/firmar-nda";
import { leerNda } from "@/lib/datos/nda";
import { AbrirNda } from "@/components/formularios/abrir-nda";
import { ComentarNda } from "@/components/formularios/comentar-nda";
import { ComentariosNda } from "@/components/vistas/nda";

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
  const [{ data }, { data: peticiones }] = await Promise.all([
    supabase.rpc("mi_candidatura"),
    supabase.rpc("mis_peticiones"),
  ]);
  const vista = (data as VistaCandidata[] | null)?.[0];

  if (!vista) redirect("/sin-compania");

  /*
   * La puerta del NDA. Lo decide la base: mientras le toque firmar, no ve
   * nada más que el NDA. Sin plantilla cargada, se le dice que está en
   * preparación y no se le deja firmar nada provisional.
   */
  const nda = await leerNda(vista.id);
  const entregados = (peticiones ?? []).reduce(
    (n: number, p: { entregados?: number }) => n + (p.entregados ?? 0),
    0,
  );

  if (nda.estado === "sin_plantilla" || nda.estado === "por_firmar") {
    return (
      <Marco tema="oscuro">
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
          <div className="mb-8 flex justify-end">
            <BotonSalir />
          </div>
          <div className="tarjeta p-6">
            <h1 className="titular-marca mb-2 text-2xl text-titular">
              {nda.estado === "por_firmar" ? "Antes de seguir, el NDA" : "Tu NDA está en preparación"}
            </h1>
            {nda.estado === "por_firmar" && nda.plantilla ? (
              <>
                <p className="mb-5 text-sm text-secundario">
                  Para compartir contigo información confidencial —y tú con
                  nosotras— firmamos primero un acuerdo de confidencialidad.
                  Léelo y fírmalo aquí; después firmará Inception Woman Lab.
                </p>
                <FirmarNdaCandidata
                  plantillaId={nda.plantilla.id}
                  version={nda.plantilla.version}
                  texto={nda.plantilla.texto}
                />
                <div className="mt-8 flex flex-col gap-4 border-t border-filete pt-6">
                  <ComentariosNda comentarios={nda.comentarios} candidaturaId={vista.id} />
                  <ComentarNda />
                </div>
              </>
            ) : (
              <p className="text-sm text-secundario">
                Estamos preparando el acuerdo de confidencialidad que firmaremos
                antes de compartir información. En cuanto esté listo lo verás
                aquí mismo para firmarlo; no tienes que hacer nada más hasta
                entonces.
              </p>
            )}
          </div>
        </main>
      </Marco>
    );
  }

  return (
    <Marco tema="oscuro">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <div className="mb-8 flex justify-end">
          <BotonSalir />
        </div>

        {nda.estado === "esperando_iwl" ? (
          <div className="tarjeta mb-6 flex flex-col gap-4 p-5 text-sm text-secundario">
            <p role="status">
              Has firmado el NDA. Falta la firma de Inception Woman Lab; en
              cuanto firme, aquí mismo verás qué documentación te pedimos.
            </p>
            <ComentariosNda comentarios={nda.comentarios} candidaturaId={vista.id} />
            <ComentarNda />
          </div>
        ) : null}
        {nda.estado === "firmado" && vista.puede_subir && entregados === 0 ? (
          <p className="tarjeta mb-6 p-5 text-sm text-titular" role="status">
            IWL ha firmado el NDA. Ya puedes empezar el due diligence: abajo
            tienes lo que te pedimos.
          </p>
        ) : null}
        {nda.estado === "firmado" ? (
          <div className="mb-6">
            <AbrirNda candidaturaId={vista.id} />
          </div>
        ) : null}

        <CandidaturaPublica vista={vista} />

        {vista.puede_subir ? (
          <div className="tarjeta mt-6 p-6">
            <h2 className="mb-1 text-base font-semibold text-titular">
              Documentación del due diligence
            </h2>
            <p className="mb-5 text-sm text-secundario">
              Aquí sí se sube el fichero, no un enlace: a partir del NDA la
              información es confidencial y se queda en la plataforma, no en
              una carpeta compartida.
            </p>
            <SalaDeDatosCandidata peticiones={peticiones ?? []} />
          </div>
        ) : null}
      </main>
    </Marco>
  );
}
