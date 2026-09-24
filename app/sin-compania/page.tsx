import { BarraSuperior } from "@/components/barra-superior";

export const metadata = { title: "Sin compañía asignada · Plataforma IWL" };

export default function SinCompania() {
  return (
    <>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="border-l-2 border-acento pl-4">
          <h1 className="text-lg font-semibold tracking-tight text-titular">
            Sin compañía asignada
          </h1>
          <p className="mt-2 text-sm text-secundario">
            Tu cuenta existe pero todavía no está vinculada a ninguna compañía de
            la cohorte. El equipo de IWL la asigna al incorporar el proyecto al
            programa.
          </p>
        </div>
      </main>
    </>
  );
}
