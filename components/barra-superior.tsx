import Link from "next/link";
import { personaActual } from "@/lib/supabase/servidor";
import { menuDe } from "@/lib/navegacion";
import { contarPendientesDireccion } from "@/lib/datos/onboarding";
import { BotonSalir } from "./boton-salir";
import { Oscuro } from "./marco";
import { NavSecciones } from "./nav-secciones";
import { MenuMovil } from "./menu-movil";

const ROLES: Record<string, string> = {
  admin_iwl: "Dirección IWL",
  equipo_iwl: "Equipo IWL",
  revisor_niage: "Ingeniería Niage",
  fundadora: "Equipo fundador",
  mentor: "Mentoría",
  lector_externo: "Acceso de lectura",
  candidata: "Candidatura en curso",
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

  // El mismo contador de dirección que la barra lateral, para el móvil
  const secciones = persona ? menuDe(persona.role) : [];
  if (persona?.role === "admin_iwl") {
    const pendientes = await contarPendientesDireccion();
    const cartera = secciones.find((s) => s.href === "/cartera");
    if (cartera && pendientes) cartera.contador = pendientes;
  }

  return (
    <Oscuro className="barra-superior sticky top-0 z-20 border-b border-filete bg-lienzo text-cuerpo">
      {/*
        Por debajo de `lg` el menú no cabe en la fila de la marca: va en un
        botón que lo despliega debajo (`MenuMovil`). Antes se metía en la
        misma línea con desbordamiento horizontal y en un móvil salía
        recortado y montado sobre la cabecera.
      */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-x-4 px-4 py-3 sm:px-6">
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

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {/*
            El menú se lee como un control, no como texto suelto: cambiar
            solo el color al pasar por encima no dice que se pueda pulsar, y
            sin pasar por encima no dice nada.
          */}
          {/*
            La misma lista que la barra lateral.
            
            Estaba escrita aquí otra vez, a mano, y había que acordarse de
            tocar las dos. Ahora las dos leen `lib/navegacion.ts`, y quién
            ve qué se decide por capacidad en un solo sitio.
          */}
          {persona ? (
            <>
              <NavSecciones className="mb-0 hidden lg:flex" secciones={secciones} />
              <span className="lg:hidden">
                <MenuMovil secciones={secciones} />
              </span>
            </>
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
