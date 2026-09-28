"use client";

import { cambiarMiContrasena } from "@/lib/acciones/admin";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/**
 * Cambiar la propia contraseña.
 *
 * Se pide dos veces porque no se ve al escribirla y un error de tecleo aquí
 * deja a alguien fuera hasta que la dirección se la vuelva a poner.
 */
export function CambiarContrasena() {
  return (
    <Formulario accion={cambiarMiContrasena}>
      {(resultado) => (
        <>
          <Campo
            etiqueta="Nueva contraseña"
            ayuda="Al menos 12 caracteres"
            error={!resultado.ok ? resultado.campos?.password : undefined}
          >
            <Texto
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Campo>

          <Campo
            etiqueta="Otra vez"
            error={!resultado.ok ? resultado.campos?.repetida : undefined}
          >
            <Texto
              name="repetida"
              type="password"
              autoComplete="new-password"
              required
            />
          </Campo>

          <div>
            <Boton>Cambiar contraseña</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
