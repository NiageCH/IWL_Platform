import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Marco } from "@/components/marco";
import {
  CandidaturaPublica,
  type VistaCandidata,
} from "@/components/vistas/candidatura-publica";
import {
  AnadirMaterial,
  CompletarFicha,
} from "@/components/formularios/candidatura-publica";

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

  return (
    <Marco tema="oscuro">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <CandidaturaPublica
          vista={vista}
          ficha={
            vista.puede_subir ? (
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
            ) : null
          }
        >
          <AnadirMaterial token={token} />
        </CandidaturaPublica>

        <p className="mt-6 text-xs leading-relaxed text-metadato">
          Esta dirección es tuya y privada. Guárdala para volver a entrar; si
          la pierdes, escríbenos y te mandamos otra.
        </p>
      </main>
    </Marco>
  );
}
