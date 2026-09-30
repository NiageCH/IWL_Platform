import Link from "next/link";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { BotonSalir } from "./boton-salir";
import { Oscuro } from "./marco";
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
 *
 * Va siempre oscura, también cuando la página es clara: es la franja de la
 * marca, y separarla del área de trabajo es lo que evita que la pantalla sea
 * una sola masa. Dentro de `<Oscuro>` los tokens cambian de valor, así que
 * ni esta barra ni lo que cuelga de ella necesita saberlo.
 */
export async function BarraSuperior() {
  const persona = await personaActual();

  return (
    <Oscuro className="sticky top-0 z-20 border-b border-filete bg-lienzo text-cuerpo">
      {/*
        Envuelve en dos líneas cuando hace falta.
        
        En una línea, a 390 px la marca más tres pastillas de menú más el
        botón de salir sumaban más que la pantalla y empujaban el documento
        entero hacia la derecha.
      */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6">
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

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
          {/*
            El menú se lee como un control, no como texto suelto: cambiar
            solo el color al pasar por encima no dice que se pueda pulsar, y
            sin pasar por encima no dice nada.
          */}
          {persona && esIwl(persona.role) ? (
            <NavSecciones
              className="mb-0"
              secciones={[
                { href: "/cartera", nombre: "Cartera", icono: "cartera" },
                {
                  href: "/comparativa",
                  nombre: "Comparativa",
                  icono: "comparativa",
                },
                ...(persona.role === "admin_iwl"
                  ? [
                      {
                        href: "/admin",
                        nombre: "Administración",
                        icono: "administracion" as const,
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}
          {/* Quién eres, y la puerta a cambiar tu contraseña */}
          {persona ? (
            <Link
              href="/perfil"
              className="enlace hidden text-xs text-metadato sm:inline"
            >
              {persona.full_name ?? persona.email} ·{" "}
              {ROLES[persona.role] ?? persona.role}
            </Link>
          ) : null}
          <BotonSalir />
        </div>
      </div>
    </Oscuro>
  );
}
