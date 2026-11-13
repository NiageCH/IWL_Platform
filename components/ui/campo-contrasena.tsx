"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CLASES_CAMPO } from "@/components/ui/formulario";
import { cn } from "@/lib/utils";

/**
 * Un campo de contraseña con el ojo para verla mientras se escribe
 * (REVISION, 13 nov). El único: no queda ningún `type="password"` suelto.
 *
 * - Oculta por defecto.
 * - El botón dice lo que hace —«Mostrar contraseña», «Ocultar
 *   contraseña»— y es `type="button"`: pulsarlo no envía el formulario.
 * - Al enviar el formulario vuelve a ocultarse, sin depender de cómo lo
 *   envíe cada pantalla: escucha el `submit` del formulario que la contiene.
 * - Para dos campos que van juntos —la nueva y la repetida— se le pasa
 *   `visible` y `alCambiar` desde fuera, y el mismo ojo enseña las dos.
 */
export function CampoContrasena({
  visible: visibleFuera,
  alCambiar,
  sinBoton = false,
  error,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  visible?: boolean;
  alCambiar?: (visible: boolean) => void;
  /** El segundo de una pareja: sigue al primero y no lleva ojo propio */
  sinBoton?: boolean;
  error?: boolean;
}) {
  const [visibleDentro, setVisibleDentro] = useState(false);
  const visible = visibleFuera ?? visibleDentro;
  const cambiar = alCambiar ?? setVisibleDentro;
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const formulario = campo.current?.form;
    if (!formulario) return;
    const ocultar = () => cambiar(false);
    formulario.addEventListener("submit", ocultar);
    return () => formulario.removeEventListener("submit", ocultar);
  }, [cambiar]);

  return (
    <div className="relative">
      <input
        {...props}
        ref={campo}
        type={visible ? "text" : "password"}
        className={cn(CLASES_CAMPO, !sinBoton && "pr-11", error && "border-mal", className)}
      />
      {sinBoton ? null : (
        <button
          type="button"
          onClick={() => cambiar(!visible)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-metadato transition-colors hover:text-titular focus-visible:text-titular"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      )}
    </div>
  );
}
