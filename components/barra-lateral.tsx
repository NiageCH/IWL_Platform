import Link from "next/link";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { BotonSalir } from "./boton-salir";
import { Oscuro } from "./marco";
import { NavLateral, type EntradaLateral } from "./nav-lateral";

const ROLES: Record<string, string> = {
  admin_iwl: "Dirección IWL",
  equipo_iwl: "Equipo IWL",
  revisor_niage: "Ingeniería Niage",
  fundadora: "Equipo fundador",
  mentor: "Mentoría",
  lector_externo: "Acceso de lectura",
};

/** Las iniciales, para el círculo de la persona */
function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * La barra lateral de la consola de IWL.
 *
 * Sustituye a la franja superior, que era el patrón por defecto de cualquier
 * panel y no decía nada. Una columna vertical a toda altura cambia el
 * carácter de la pantalla más que cualquier color: da sitio a la marca
 * arriba, a la navegación con su icono en el medio y a quién ha entrado
 * abajo, y deja el ancho entero del contenido para lo que importa.
 *
 * Va oscura sobre el área clara de trabajo. Dentro de `<Oscuro>` los tokens
 * cambian de valor, así que nada de lo que hay aquí necesita saberlo.
 *
 * Aparece a partir de `md`, 768 px, y no de `lg`: con el corte en 1024 una
 * ventana de portátil sin maximizar se quedaba con la barra de arriba, que
 * es justo lo que se quería dejar atrás. Por debajo de 768 no cabe una
 * columna fija y manda la barra compacta.
 */
export async function BarraLateral() {
  const persona = await personaActual();
  if (!persona) return null;

  const entradas: EntradaLateral[] = [
    { href: "/cartera", nombre: "Cartera", icono: "cartera" },
    { href: "/comparativa", nombre: "Comparativa", icono: "comparativa" },
    ...(persona.role === "admin_iwl"
      ? [
          {
            href: "/admin",
            nombre: "Administración",
            icono: "administracion" as const,
          },
        ]
      : []),
  ];

  const nombre = persona.full_name ?? persona.email ?? "";

  return (
    <Oscuro className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-filete bg-lienzo text-cuerpo md:flex">
      {/* La marca: la W en su cuadro y el nombre en la tipografía expandida */}
      <Link
        href="/"
        className="flex items-center gap-3 px-5 py-6 transition-opacity hover:opacity-80"
      >
        <span className="titular-marca flex size-10 items-center justify-center rounded-xl bg-acento-solido text-lg text-white">
          W
        </span>
        <span className="titular-marca text-sm leading-tight text-titular">
          Plataforma
          <br />
          IWL
        </span>
      </Link>

      <div className="flex-1 px-3 py-2">
        {esIwl(persona.role) ? <NavLateral entradas={entradas} /> : null}
      </div>

      {/*
        Quién ha entrado, y la puerta a cambiar la contraseña.

        «Salir» va en la misma fila y no debajo: apilado quedaba pegado al
        borde inferior de la ventana, que es la esquina donde el navegador y
        las extensiones ponen sus distintivos. Un control de sesión no puede
        vivir donde algo puede taparlo.
      */}
      <div className="flex items-center gap-2 border-t border-filete p-3">
        <Link
          href="/perfil"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-elevado"
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-elevado text-xs font-bold text-acento-texto"
          >
            {iniciales(nombre)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-titular">
              {nombre}
            </span>
            <span className="block truncate text-xs text-metadato">
              {ROLES[persona.role] ?? persona.role}
            </span>
          </span>
        </Link>
        <BotonSalir />
      </div>
    </Oscuro>
  );
}
