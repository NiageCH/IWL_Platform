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
import { TarjetaReunion } from "@/components/vistas/reunion-candidata";
import { leerReunionDeElla } from "@/lib/datos/reuniones";

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
  const [nda, reunion] = await Promise.all([leerNda(vista.id), leerReunionDeElla()]);
  const entregados = (peticiones ?? []).reduce(
    (n: number, p: { entregados?: number }) => n + (p.entregados ?? 0),
    0,
  );

  /*
   * Con el NDA pendiente, el NDA va arriba como siguiente paso y debajo
   * está su candidatura entera, como la veía por el enlace.
   *
   * Se dijo «solo ve el NDA» y tapaba demasiado: el NDA protege lo
   * confidencial que se comparte a partir de él, y su propia candidatura
   * no lo es. Detrás del NDA queda solo lo nuevo: la sala de datos y lo que
   * comparta IWL. Sin texto de NDA todavía, la tarjeta lo dice y no deja
   * firmar nada provisional (REVISION, 10 nov).
   */
  if (nda.estado === "sin_plantilla" || nda.estado === "plantilla_con_huecos" || nda.estado === "por_firmar") {
    return (
      <Marco tema="oscuro">
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
          <div className="mb-8 flex justify-end">
            <BotonSalir />
          </div>
          <div className="tarjeta mb-6 p-6">
            <p className="mb-1 text-xs text-metadato">Siguiente paso</p>
            <h2 className="titular-marca mb-2 text-2xl text-titular">
              {nda.estado === "por_firmar" ? "Firma el NDA" : "Tu NDA está en preparación"}
            </h2>
            {nda.estado === "por_firmar" && nda.plantilla && nda.base ? (
              <>
                <p className="mb-5 text-sm text-secundario">
                  Antes de compartir información confidencial, en las dos direcciones, firmamos
                  un acuerdo de confidencialidad. Léelo y fírmalo aquí. Después firmará
                  Inception Woman Lab.
                </p>
                <FirmarNdaCandidata
                  plantillaId={nda.plantilla.id}
                  version={nda.plantilla.version}
                  texto={nda.plantilla.texto}
                  base={nda.base}
                />
                <div className="mt-8 flex flex-col gap-4 border-t border-filete pt-6">
                  <ComentariosNda comentarios={nda.comentarios} candidaturaId={vista.id} />
                  <ComentarNda />
                </div>
              </>
            ) : (
              <p className="text-sm text-secundario">
                Estamos preparando el acuerdo de confidencialidad que firmaremos antes de
                compartir información. Te avisaremos cuando esté listo para firmar. Mientras,
                aquí tienes tu candidatura.
              </p>
            )}
          </div>

          <CandidaturaPublica vista={vista} />
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
              cuanto firme, al entrar irás a tu compañía en la plataforma.
            </p>
            <ComentariosNda comentarios={nda.comentarios} candidaturaId={vista.id} />
            <ComentarNda firmadoPorElla />
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

        {/* La reunión, si hay una en juego: es su siguiente paso */}
        {reunion ? <TarjetaReunion reunion={reunion} /> : null}

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
