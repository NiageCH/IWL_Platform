import Link from "next/link";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { BotonSalir } from "./boton-salir";

const ROLES: Record<string, string> = {
  admin_iwl: "Dirección IWL",
  equipo_iwl: "Equipo IWL",
  revisor_niage: "Ingeniería Niage",
  fundadora: "Equipo fundador",
  mentor: "Mentoría",
  lector_externo: "Acceso de lectura",
};

/**
 * Barra de la aplicación. El símbolo W de IWL en magenta y, a la derecha,
 * quién ha entrado y con qué papel.
 */
export async function BarraSuperior() {
  const persona = await personaActual();

  return (
    <div className="sticky top-0 z-20 border-b border-filete bg-lienzo/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="brillo-acento text-lg font-semibold leading-none text-acento">
            W
          </span>
          <span className="text-sm font-medium tracking-tight text-titular">
            Plataforma IWL
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {persona && esIwl(persona.role) ? (
            <>
              <Link
                href="/cartera"
                className="text-sm text-secundario transition-colors hover:text-titular"
              >
                Cartera
              </Link>
              <Link
                href="/comparativa"
                className="text-sm text-secundario transition-colors hover:text-titular"
              >
                Comparativa
              </Link>
              {persona.role === "admin_iwl" ? (
                <Link
                  href="/admin"
                  className="text-sm text-secundario transition-colors hover:text-titular"
                >
                  Administración
                </Link>
              ) : null}
            </>
          ) : null}
          {persona ? (
            <span className="hidden text-xs text-metadato sm:inline">
              {persona.full_name ?? persona.email} · {ROLES[persona.role] ?? persona.role}
            </span>
          ) : null}
          <BotonSalir />
        </div>
      </div>
    </div>
  );
}
