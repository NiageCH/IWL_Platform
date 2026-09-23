import { FormularioEntrada } from "./formulario";

export const metadata = { title: "Entrar · Plataforma IWL" };

export default function Entrar() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10 border-l-2 border-acento pl-4">
        <h1 className="text-xl font-semibold tracking-tight text-titular">
          Plataforma IWL
        </h1>
        <p className="mt-1 text-sm text-secundario">
          Business plan vivo, due diligence vivo y seguimiento de la cohorte.
        </p>
      </div>

      <FormularioEntrada />
    </main>
  );
}
