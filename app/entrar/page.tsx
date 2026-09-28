import { FormularioEntrada } from "./formulario";

export const metadata = { title: "Entrar · Plataforma IWL" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  // A dónde iba quien ha acabado aquí por no tener sesión
  const { siguiente } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10 border-l-2 border-acento pl-4">
        <h1 className="titular-marca text-2xl text-titular">Plataforma IWL</h1>
        <p className="mt-2 text-sm text-secundario">
          Business plan vivo, due diligence vivo y seguimiento de la cohorte.
        </p>
      </div>

      <FormularioEntrada
        siguiente={typeof siguiente === "string" ? siguiente : undefined}
      />
    </main>
  );
}
