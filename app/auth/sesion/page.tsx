import { Suspense } from "react";
import { EstablecerSesion } from "./establecer-sesion";

export const metadata = { title: "Entrando · Plataforma IWL" };

export default function Sesion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Suspense fallback={<p className="text-sm text-secundario">Entrando</p>}>
        <EstablecerSesion />
      </Suspense>
    </main>
  );
}
