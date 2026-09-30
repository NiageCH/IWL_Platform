import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { personaActual } from "@/lib/supabase/servidor";
import { NavSecciones, type Seccion } from "@/components/nav-secciones";
import { Metadato } from "@/components/ui/primitivas";

/**
 * Administración.
 *
 * Solo admin_iwl. La base ya lo impone —las políticas de configuración exigen
 * `app.is_admin()`— pero enseñar un panel que va a fallar entero al guardar
 * sería una mala interfaz.
 */
export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (persona.role !== "admin_iwl") redirect("/cartera");

  const secciones: Seccion[] = [
    { icono: "companias", href: "/admin/companias", nombre: "Compañías y cohortes" },
    { icono: "personas", href: "/admin/personas", nombre: "Personas y accesos" },
    { icono: "ruta", href: "/admin/rutas", nombre: "Recorridos" },
    { icono: "evaluacion", href: "/admin/evaluacion", nombre: "Evaluación técnica" },
    { icono: "umbrales", href: "/admin/programa", nombre: "Programa y umbrales" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="relative mb-6 pl-4">
        <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
        <h1 className="titular-marca text-xl text-titular">
          Administración
        </h1>
        <p className="mt-1 text-sm text-secundario">
          Lo que gobierna los cálculos y quién entra. Cambiar un objetivo o un
          peso mueve el score de todas las compañías afectadas, pero no toca las
          instantáneas ya tomadas: el histórico está congelado.
        </p>
      </div>

      <NavSecciones secciones={secciones} />

      {children}

      <p className="mt-8 border-t border-filete pt-3">
        <Metadato>Entras como dirección de IWL</Metadato>
      </p>
    </main>
  );
}
