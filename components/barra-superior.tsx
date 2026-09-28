import Link from "next/link";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { BotonSalir } from "./boton-salir";
import { NavSecciones } from "./nav-secciones";

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
        {/* La marca, como en inceptionwomanlab.es: la W en un cuadro y el
            nombre en la tipografía expandida, en mayúsculas */}
        <Link href="/" className="flex items-center gap-3">
          <span className="titular-marca flex h-8 w-8 items-center justify-center rounded-lg bg-elevado text-base text-acento-texto">
            W
          </span>
          <span className="titular-marca text-sm text-titular">
            Plataforma IWL
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/*
            El menú se lee como un control, no como texto suelto: cambiar
            solo el color al pasar por encima no dice que se pueda pulsar, y
            sin pasar por encima no dice nada.
          */}
          {persona && esIwl(persona.role) ? (
            <NavSecciones
              className="mb-0"
              secciones={[
                { href: "/cartera", nombre: "Cartera" },
                { href: "/comparativa", nombre: "Comparativa" },
                ...(persona.role === "admin_iwl"
                  ? [{ href: "/admin", nombre: "Administración" }]
                  : []),
              ]}
            />
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
