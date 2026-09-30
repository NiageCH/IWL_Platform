"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { quitarLogo, subirLogo } from "@/lib/acciones/admin";
import { ChipCompania } from "@/components/chip-compania";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/**
 * El logo de una compañía, en administración.
 *
 * Se enseña lo que hay —el logo, o las iniciales si todavía no tiene— y
 * debajo el control para cambiarlo. Es la única pantalla donde se toca: el
 * logo es un dato de ficha, y las fichas las lleva IWL.
 *
 * El panel no se cierra solo al acabar.
 *
 * Lo hacía, y así se tragaba su propia confirmación: el mensaje vive dentro
 * del formulario, y cerrar el panel lo desmonta antes de que nadie lo lea.
 * Quedaba una subida que funcionaba sin decir que había funcionado. Ahora se
 * queda abierto con el mensaje, y se cierra con el mismo control que lo
 * abrió.
 */
export function LogoCompania({
  companyId,
  nombre,
  logo,
}: {
  companyId: string;
  nombre: string;
  /** Dirección firmada del logo actual, si lo hay */
  logo?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <ChipCompania nombre={nombre} logo={logo} tamano="md" />

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          className="accion inline-flex items-center gap-1.5 text-xs text-secundario"
          aria-expanded={abierto}
        >
          <ImagePlus aria-hidden="true" className="size-3.5" />
          {logo ? "Cambiar el logo" : "Poner un logo"}
        </button>

        {abierto ? (
          <div className="mt-1 flex flex-col gap-2">
            <Formulario accion={subirLogo}>
              {(resultado) => (
                <>
                  <input type="hidden" name="company_id" value={companyId} />
                  <Campo
                    etiqueta="Fichero"
                    ayuda="PNG, JPEG, WebP o SVG. Hasta 2 MB."
                    error={resultado.ok ? undefined : resultado.campos?.logo}
                  >
                    <Texto
                      type="file"
                      name="logo"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      required
                    />
                  </Campo>
                  <Boton>Subir</Boton>
                </>
              )}
            </Formulario>

            {/*
              El formulario de quitar se monta siempre, y lo que aparece y
              desaparece es su botón.

              Al revés no funcionaba: quitar el logo deja `logo` en nulo, la
              rama entera se desmontaba y se llevaba por delante el mensaje
              que acababa de escribir. Un formulario no puede vivir dentro de
              una condición que su propio éxito vuelve falsa.
            */}
            <Formulario accion={quitarLogo}>
              {() =>
                logo ? (
                  <>
                    <input type="hidden" name="company_id" value={companyId} />
                    <Boton variante="secundario">
                      Quitar el logo y volver a las iniciales
                    </Boton>
                  </>
                ) : null
              }
            </Formulario>
          </div>
        ) : null}
      </div>
    </div>
  );
}
