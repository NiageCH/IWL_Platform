import { leerHojaIwl } from "@/lib/datos/hoja";
import { HojaProgramaAdmin } from "@/components/formularios/hoja-programa";
import { Bloque, SinDatos, TituloBloque } from "@/components/ui/primitivas";

export const metadata = { title: "Hoja de ruta · Administración" };

/**
 * La hoja de ruta del programa, como la define dirección (REVISION, 22 y
 * 23 nov): cuatro tramos con sus hitos fundamentales. Aquí se añaden, se
 * retiran, se ordenan y se cambian. Cada compañía lleva su copia desde que
 * se le genera la hoja de ruta, así que nada de esto toca ninguna en
 * marcha, ni lo firmado.
 *
 * Con las piezas de Compañías (REVISION, 23 nov: «que no parezca un
 * Word»): tarjetas, filas con su menú y el panel lateral.
 */
export default async function AdminHojaDeRuta() {
  const tramos = await leerHojaIwl();

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque>Hoja de ruta del programa</TituloBloque>
        <div className="px-4 py-3 text-sm">
          <p className="text-titular">
            Lo que cambies aquí vale para las hojas de ruta nuevas, no para las que están en marcha ni para las
            firmadas.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-secundario">
              <span className="accion">Cómo funciona</span>
            </summary>
            <p className="mt-2 text-xs text-secundario">
              Una sola hoja de ruta, en cuatro tramos. Cada compañía empieza en el tramo de su estadio y arrastra lo
              que le falte de los anteriores. Cada hoja de ruta lleva su copia de los hitos desde que se genera.
              Retirar un hito no lo borra: deja de salir en las listas de entrada y en las hojas nuevas, y se puede
              recuperar.
            </p>
          </details>
        </div>
      </Bloque>

      {tramos.length === 0 ? (
        <Bloque>
          <SinDatos>No está la hoja de ruta IWL. La crea la migración de los cuatro tramos: revisa que esté aplicada.</SinDatos>
        </Bloque>
      ) : (
        <HojaProgramaAdmin tramos={tramos} />
      )}
    </div>
  );
}
