import { createClient } from "@supabase/supabase-js";
import { Marco } from "@/components/marco";
import { FormularioPresentarse } from "@/components/formularios/presentarse";

export const metadata = {
  title: "Presentar tu startup · Inception Woman Lab",
  description:
    "Formulario de candidatura a la convocatoria de Inception Woman Lab.",
};

/*
 * Esta página no tiene sesión, así que no puede usar el cliente de servidor,
 * que lee las cookies. Se habla con la base con la clave pública y por la
 * única puerta que `anon` tiene abierta.
 */
async function convocatoria() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase.rpc("convocatoria_abierta");
  return data?.[0] ?? null;
}

/**
 * El formulario de candidatura.
 *
 * Es la única página de la plataforma que se puede ver sin cuenta, y la
 * puerta de entrada al embudo. Quien lo rellena no tiene cuenta y no la
 * tendrá hasta que firme, si firma.
 *
 * No lee nada: solo escribe, y por una función que recibe los campos del
 * formulario y pone ella el resto —la cohorte, el estado inicial, la
 * fecha—. Si esto fuese un `insert` con una política para `anon`, cualquiera
 * con la clave pública, que va en el navegador, podría darse de alta ya
 * preseleccionada.
 */
export default async function Presentarse() {
  const abierta = await convocatoria();

  return (
    <Marco tema="oscuro">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <div className="relative mb-8 pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
          <h1 className="titular-marca text-3xl text-titular sm:text-4xl">
            Presenta tu startup
          </h1>
          <p className="mt-2 text-base leading-relaxed text-secundario">
            Inception Woman Lab
            {abierta?.nombre ? ` · ${abierta.nombre}` : ""}
          </p>
        </div>

        {!abierta ? (
          <div className="tarjeta p-6">
            <p className="text-base text-cuerpo">
              Ahora mismo no hay ninguna convocatoria abierta.
            </p>
            <p className="mt-2 text-sm text-secundario">
              Cuando abramos la siguiente, esta misma página admitirá
              candidaturas. Si quieres que te avisemos, escríbenos.
            </p>
          </div>
        ) : (
          <>
            {abierta.texto ? (
              <div className="tarjeta mb-6 p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-cuerpo">
                  {abierta.texto}
                </p>
                {abierta.cierra ? (
                  <p className="mt-3 text-xs text-metadato">
                    El plazo acaba el {abierta.cierra}.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="tarjeta p-6">
              <FormularioPresentarse />
            </div>

            <p className="mt-6 text-xs leading-relaxed text-metadato">
              Lo que nos mandes lo usamos solo para valorar tu candidatura. Si
              seguimos adelante, firmamos un acuerdo de confidencialidad antes
              de pedirte nada sensible.
            </p>
          </>
        )}
      </main>
    </Marco>
  );
}
