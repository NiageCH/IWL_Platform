import { leerHojaIwl } from "@/lib/datos/hoja";
import {
  EditarHitoPlantilla,
  MoverHitoFundamental,
  NuevoHitoFundamental,
  RetirarHitoFundamental,
} from "@/components/formularios/plantillas";
import { Bloque, Etiqueta, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";

export const metadata = { title: "Hoja de ruta · Administración" };

/**
 * La hoja de ruta del programa, como la define dirección (REVISION, 22 y
 * 23 nov): cuatro tramos con sus hitos fundamentales. Aquí se añaden, se
 * retiran, se ordenan y se cambian sus textos. Cada compañía lleva su copia
 * desde que se le genera la hoja de ruta, así que nada de esto toca
 * ninguna en marcha, ni lo firmado.
 *
 * Los recorridos de antes (tres plantillas por estadio) quedaron inactivos
 * con la hoja de ruta en cuatro tramos: no se enseñan.
 */
export default async function AdminHojaDeRuta() {
  const tramos = await leerHojaIwl();
  const hitos = tramos.reduce((n, t) => n + t.hitos.length, 0);
  const meses = tramos.reduce((n, t) => n + (t.meses ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque accion={<Metadato>{tramos.length} tramos · {hitos} hitos · {meses} meses</Metadato>}>
          Hoja de ruta del programa
        </TituloBloque>
        <p className="px-4 py-3 text-sm text-secundario">
          Una sola hoja de ruta, en cuatro tramos. Cada compañía empieza en el tramo de su estadio y arrastra lo
          que le falte de los anteriores. Aquí se añaden, se retiran, se ordenan y se cambian los hitos. Cada hoja de
          ruta lleva su copia desde que se genera, así que nada de esto toca las que están en marcha ni las firmadas.
          Retirar un hito no lo borra: deja de salir en las hojas de ruta nuevas.
        </p>
      </Bloque>

      {tramos.length === 0 ? (
        <Bloque>
          <SinDatos>No está la hoja de ruta IWL. La crea la migración de los cuatro tramos: revisa que esté aplicada.</SinDatos>
        </Bloque>
      ) : null}

      {tramos.map((t) => (
        <Bloque key={t.id} id={`tramo-${t.tramo}`}>
          <TituloBloque accion={<Metadato>{t.meses ? `${t.meses} meses` : "Sin duración"}</Metadato>}>
            {`Tramo ${t.tramo} · ${t.nombre}`}
          </TituloBloque>
          {t.objetivo ? <p className="border-b border-filete px-4 py-3 text-sm text-secundario">{t.objetivo}</p> : null}
          <ol className="divide-y divide-filete">
            {t.hitos.map((h, i) => (
              <li key={h.id} className="flex flex-col gap-1 px-4 py-3" data-hito={h.titulo}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm text-titular">{h.titulo}</span>
                  {h.condicionaInvertible ? <Etiqueta>Condiciona invertible</Etiqueta> : null}
                  <span className="ml-auto flex flex-wrap gap-2">
                    <MoverHitoFundamental id={h.id} arriba={i > 0} abajo={i < t.hitos.length - 1} />
                    <RetirarHitoFundamental id={h.id} />
                  </span>
                </div>
                <p className="text-xs text-secundario">{h.criterio}</p>
                {h.evidencia ? <p className="text-xs text-metadato">Se espera: {h.evidencia}</p> : null}
                <div className="mt-1">
                  <EditarHitoPlantilla hito={{ id: h.id, titulo: h.titulo, criterio: h.criterio, evidencia: h.evidencia }} />
                </div>
              </li>
            ))}
          </ol>
          <NuevoHitoFundamental tramoId={t.id} />
          {t.retirados.length ? (
            <details className="border-t border-filete px-4 py-3 text-sm">
              <summary className="cursor-pointer text-secundario">
                {t.retirados.length === 1 ? "1 hito retirado" : `${t.retirados.length} hitos retirados`}
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {t.retirados.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-baseline gap-2" data-retirado={h.titulo}>
                    <span className="text-secundario">{h.titulo}</span>
                    <RetirarHitoFundamental id={h.id} volver />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Bloque>
      ))}
    </div>
  );
}
