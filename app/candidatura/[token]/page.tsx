import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { esIwl, personaActual } from "@/lib/supabase/servidor";
import { Marco } from "@/components/marco";
import {
  CandidaturaPublica,
  type VistaCandidata,
} from "@/components/vistas/candidatura-publica";
import {
  AnadirMaterial,
  CompletarFicha,
} from "@/components/formularios/candidatura-publica";
import { Desplegable } from "@/components/ui/formulario";
import { CORREO_CONTACTO } from "@/lib/contacto";
import { TarjetaReunion } from "@/components/vistas/reunion-candidata";
import { leerReunionDeElla } from "@/lib/datos/reuniones";
import { PresentarProyecto } from "@/components/formularios/presentar-proyecto";
import { ResultadoFiltro } from "@/components/vistas/filtro";
import type { Filtro } from "@/lib/candidatura-nueva";

export const metadata = {
  title: "Tu candidatura · Inception Woman Lab",
  // Que no acabe en un buscador: es una dirección privada
  robots: { index: false, follow: false },
};

/**
 * La candidatura vista por quien la presentó, con su enlace privado.
 *
 * Sin cuenta: pedirle que se registre para ver si le han leído el pitch es
 * pedirle demasiado. La dirección lleva 192 bits de aleatorio, así que no se
 * adivina, y deja de valer en cuanto se le da cuenta de verdad —al firmar el
 * NDA—, que es cuando empieza a entregar material sensible y hace falta un
 * acceso que se pueda retirar.
 */
export default async function PorEnlace({
  params,
}: PageProps<"/candidatura/[token]">) {
  const { token } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase.rpc("ver_candidatura", { p_token: token });
  const vista = (data as VistaCandidata[] | null)?.[0];

  /*
   * Un enlace que no vale da un 404, igual que uno inventado. Distinguir
   * «caducado» de «no existe» le diría a quien va probando que ha acertado
   * con una dirección real.
   */
  if (!vista) notFound();

  /*
   * Dirección quiere saber si lo ha abierto y cuándo. Si quien mira es de
   * IWL, comprobando el enlace antes de mandarlo, no cuenta como suyo.
   */
  const quienMira = await personaActual();
  if (!esIwl(quienMira?.role)) {
    await supabase.rpc("registrar_apertura_enlace", { p_token: token });
  }

  const [reunion, { data: envios }] = await Promise.all([
    leerReunionDeElla(token),
    supabase.rpc("envio_de_candidatura", { p_token: token }),
  ]);
  const envio = envios?.[0] ?? null;

  /*
   * En borrador (REVISION, 22 nov): ha aceptado el NDA y le falta contarnos
   * el proyecto. Es lo único que ve: no hay nada más que enseñarle todavía.
   */
  if (envio?.estado === "borrador") {
    const { data: recomiendan } = await supabase.rpc("personas_que_recomiendan");
    return (
      <Marco tema="oscuro">
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
          <div className="relative mb-8 pl-4">
            <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
            <h1 className="titular-marca text-3xl text-titular sm:text-4xl">Presenta {envio.nombre}</h1>
            <p className="mt-2 text-base leading-relaxed text-secundario">
              El NDA está aceptado: te lo hemos mandado en PDF. Ahora, el proyecto.
            </p>
          </div>
          <div className="tarjeta p-6">
            <PresentarProyecto token={token} recomiendan={(recomiendan ?? []) as Array<{ id: string; nombre: string }>} />
          </div>
          <p className="mt-6 text-xs leading-relaxed text-metadato">
            Esta dirección es tuya y privada: con ella vuelves cuando quieras. Si la pierdes,
            escríbenos a{" "}
            <a href={`mailto:${CORREO_CONTACTO}`} className="enlace text-acento-texto">
              {CORREO_CONTACTO}
            </a>
            .
          </p>
        </main>
      </Marco>
    );
  }

  return (
    <Marco tema="oscuro">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        {/* En qué ha quedado el filtro, mientras no haya pasado */}
        {envio?.filtro && envio.filtro !== "pasa" && envio.estado === "presentada" ? (
          <ResultadoFiltro filtro={envio.filtro as Filtro} motivo={envio.filtro_motivo} />
        ) : null}
        {/* La reunión, si hay una en juego: es su siguiente paso */}
        {reunion ? <TarjetaReunion reunion={reunion} token={token} /> : null}
        <CandidaturaPublica
          vista={vista}
          /*
            El formulario está abierto mientras de verdad le toca a ella, y
            plegado después.
            
            Salía entero en cualquier paso: una candidatura en comité se
            encontraba diez campos pidiéndole que contara quién es, que es
            una forma de decirle que no la hemos mirado. Plegado sigue
            estando —un dato puede cambiar— pero no es lo primero que ve.
          */
          ficha={
            !vista.puede_subir ? null : vista.le_toca_a_ella ? (
              <div className="tarjeta p-6">
                <h2 className="mb-1 text-base font-semibold text-titular">
                  Vuestra ficha
                </h2>
                <p className="mb-5 text-sm text-secundario">
                  Esto es lo que sabemos de vosotros. Complétalo o corrígelo
                  cuando quieras.
                </p>
                <CompletarFicha token={token} ficha={vista} />
              </div>
            ) : (
              <div className="tarjeta p-6">
                <Desplegable titulo="Corregir nuestros datos">
                  <CompletarFicha token={token} ficha={vista} />
                </Desplegable>
              </div>
            )
          }
        >
          <AnadirMaterial token={token} />
        </CandidaturaPublica>

        <p className="mt-6 text-xs leading-relaxed text-metadato">
          Esta dirección es tuya y privada. Guárdala para volver a entrar; si
          la pierdes, escríbenos a{" "}
          <a
            href={`mailto:${CORREO_CONTACTO}`}
            className="enlace text-acento-texto"
          >
            {CORREO_CONTACTO}
          </a>{" "}
          y te mandamos otra.
        </p>
      </main>
    </Marco>
  );
}
