"use client";

import { quitarMiFoto, subirMiFoto } from "@/lib/acciones/admin";
import type { Resultado } from "@/lib/acciones/resultado";
import { Avatar } from "@/components/ui/persona";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/** El fichero que se elige. Lo que se guarda, reducido, pesa mucho menos */
const MAXIMO = 5 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Lo que se manda al servidor: un cuadrado de 512 px, recortado del centro.
 *
 * Se reduce aquí porque una Server Action no admite más de 1 MB y una foto
 * de móvil pesa tres o cuatro. El doble del tamaño final deja que el
 * servidor la rehaga a 256 sin perder nitidez; PNG para no perder la
 * transparencia de quien suba un recorte.
 */
async function reducir(fichero: File): Promise<Blob> {
  const imagen = await createImageBitmap(fichero);
  const lado = Math.min(imagen.width, imagen.height);
  const destino = Math.min(512, lado);
  const lienzo = document.createElement("canvas");
  lienzo.width = destino;
  lienzo.height = destino;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("sin lienzo");
  ctx.drawImage(
    imagen,
    (imagen.width - lado) / 2,
    (imagen.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    destino,
    destino,
  );
  imagen.close();
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/png"),
  );
}

async function subir(formData: FormData): Promise<Resultado> {
  const fichero = formData.get("foto");
  if (!(fichero instanceof File) || fichero.size === 0) {
    return { ok: false, error: "Elige una imagen.", campos: { foto: "Falta la imagen." } };
  }
  if (!TIPOS.includes(fichero.type)) {
    return { ok: false, error: "Esa imagen no vale. Sirven JPG, PNG y WebP.", campos: { foto: "JPG, PNG o WebP." } };
  }
  if (fichero.size > MAXIMO) {
    return {
      ok: false,
      error: `La imagen pesa ${(fichero.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB y el máximo son 5.`,
      campos: { foto: "Como mucho 5 MB." },
    };
  }
  try {
    formData.set("foto", await reducir(fichero), "foto.png");
  } catch {
    return { ok: false, error: "No se ha podido leer esa imagen. Prueba con otra, o guárdala como JPG.", campos: { foto: "No se puede leer." } };
  }
  return subirMiFoto(formData);
}

/**
 * La foto propia, en Mi cuenta.
 *
 * Los dos formularios se quedan montados: el acuse es su mensaje, y la foto
 * de al lado cambia con la página. El de quitar enseña o esconde su botón,
 * no se desmonta (ver `LogoCompania`).
 */
export function MiFoto({ nombre, foto }: { nombre: string; foto?: string | null }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar nombre={nombre} foto={foto} tamano="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Formulario accion={subir} className="gap-3">
          {(r) => (
            <>
              <Campo
                etiqueta={foto ? "Cambiar la foto" : "Poner una foto"}
                ayuda="JPG, PNG o WebP, hasta 5 MB. Se recorta cuadrada desde el centro."
                error={!r.ok ? r.campos?.foto : undefined}
              >
                <Texto type="file" name="foto" accept={TIPOS.join(",")} required />
              </Campo>
              <div>
                <Boton variante="secundario">Guardar la foto</Boton>
              </div>
            </>
          )}
        </Formulario>
        <Formulario accion={quitarMiFoto}>
          {() =>
            foto ? (
              <div>
                <Boton variante="secundario">Quitar la foto y volver a las iniciales</Boton>
              </div>
            ) : null
          }
        </Formulario>
      </div>
    </div>
  );
}
