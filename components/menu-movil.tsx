"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NavSecciones, type Seccion } from "./nav-secciones";

/**
 * El menú de la barra de arriba cuando no cabe en una fila (REVISION, 23
 * nov). Las pestañas iban en la misma línea que la marca, con desbordamiento
 * horizontal, y en un móvil salían recortadas y montadas sobre la cabecera:
 * «rtera», «nbudo», «ministración». Ahora un botón «Menú» las despliega
 * debajo de la barra, enteras y en las filas que hagan falta.
 *
 * Se cierra al llegar a otra página sin efecto ninguno: lo abierto se
 * recuerda junto con la dirección en que se abrió, y en otra ya no cuenta.
 */
export function MenuMovil({ secciones }: { secciones: Seccion[] }) {
  const ruta = usePathname();
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === ruta;
  const pendientes = secciones.reduce((n, s) => n + (s.contador ?? 0), 0);

  return (
    <>
      <button
        type="button"
        className="accion inline-flex items-center gap-1.5 text-sm"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        onClick={() => setAbiertoEn(abierto ? null : ruta)}
      >
        {abierto ? <X aria-hidden="true" className="size-4" /> : <Menu aria-hidden="true" className="size-4" />}
        Menú
        {pendientes && !abierto ? (
          <span className="cifra rounded-full border border-filete px-1.5 text-xs">
            {pendientes}
            <span className="sr-only"> pendientes</span>
          </span>
        ) : null}
      </button>
      {abierto ? (
        <div
          id="menu-movil"
          className="absolute inset-x-0 top-full border-b border-filete bg-lienzo px-4 py-3 shadow-lg sm:px-6"
          onKeyDown={(e) => {
            if (e.key === "Escape") setAbiertoEn(null);
          }}
        >
          <NavSecciones className="mb-0" secciones={secciones} />
        </div>
      ) : null}
    </>
  );
}
