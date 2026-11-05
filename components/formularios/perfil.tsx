"use client";

import { cambiarMiContrasena, estrenarContrasena } from "@/lib/acciones/admin";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/**
 * Cambiar la propia contraseña.
 *
 * Se pide dos veces porque no se ve al escribirla y un error de tecleo aquí
 * deja a alguien fuera hasta que la dirección se la vuelva a poner.
 *
 * `primera` es la de la primera entrada: al guardar se entra en la
 * plataforma. Con navegación completa, para que el proxy vuelva a mirar la
 * marca con la contraseña ya cambiada.
 */
export function CambiarContrasena({ primera = false }: { primera?: boolean }) {
  return (
    <Formulario
      accion={primera ? estrenarContrasena : cambiarMiContrasena}
      // Navegación completa a propósito: la de cliente no pasa por el proxy
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      onOk={primera ? () => window.location.assign("/") : undefined}
    >
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
            <Boton>{primera ? "Guardar y entrar" : "Cambiar contraseña"}</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
