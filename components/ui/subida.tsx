"use client";

import { useCallback, useState } from "react";
import { prepararSubida, type DestinoSubida } from "@/lib/acciones/subidas";
import type { Resultado } from "@/lib/acciones/resultado";
import { comprobarFichero, type ClaseSubida } from "@/lib/subidas";

/**
 * Subir ficheros sin pasar por el servidor de la aplicación.
 *
 * Envuelve la acción de un formulario: antes de llamarla, cada fichero del
 * campo se comprueba aquí (tamaño y tipo, para no gastar la subida), se
 * pide su dirección firmada, se sube a Storage con barra de progreso y se
 * sustituye en el formulario por su ruta y su nombre original. La acción
 * recibe solo texto y registra lo subido (`leerSubida`).
 *
 * Ver `lib/subidas.ts` para el porqué.
 */

export interface CampoSubida {
  /** El `name` del `<input type="file">` */
  campo: string;
  clase: Exclude<ClaseSubida, "foto">;
  /** Adónde va, con lo que haya en el formulario */
  destino: (formData: FormData) => DestinoSubida;
}

export interface Progreso {
  nombre: string;
  /** De 0 a 100 */
  porcentaje: number;
}

function subirCon(url: string, fichero: File, alAvanzar: (p: number) => void): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", fichero.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alAvanzar(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolver()
        : rechazar(new Error(xhr.status === 413 ? "pesa más de lo que admite el almacenamiento" : `respuesta ${xhr.status}`));
    xhr.onerror = () => rechazar(new Error("se ha cortado la conexión"));
    xhr.send(fichero);
  });
}

export function useSubidas() {
  const [progreso, setProgreso] = useState<Progreso | null>(null);

  const conSubidas = useCallback(
    (accion: (formData: FormData) => Promise<Resultado>, campos: CampoSubida[]) =>
      async (formData: FormData): Promise<Resultado> => {
        // Primero se comprueba todo: no se sube nada si algo no vale
        const pendientes: Array<{ c: CampoSubida; ficheros: File[] }> = [];
        for (const c of campos) {
          const ficheros = formData
            .getAll(c.campo)
            .filter((f): f is File => f instanceof File && f.size > 0);
          for (const f of ficheros) {
            const problema = comprobarFichero(c.clase, { nombre: f.name, tamano: f.size, tipo: f.type });
            if (problema) return { ok: false, error: problema, campos: { [c.campo]: problema } };
          }
          pendientes.push({ c, ficheros });
        }

        try {
          for (const { c, ficheros } of pendientes) {
            formData.delete(c.campo);
            formData.delete(`${c.campo}_nombre`);
            for (const f of ficheros) {
              const preparada = await prepararSubida(c.destino(formData), {
                nombre: f.name,
                tamano: f.size,
                tipo: f.type,
              });
              if (!preparada.ok) return { ok: false, error: preparada.error, campos: { [c.campo]: preparada.error } };

              setProgreso({ nombre: f.name, porcentaje: 0 });
              try {
                await subirCon(preparada.url, f, (p) => setProgreso({ nombre: f.name, porcentaje: p }));
              } catch (e) {
                const motivo = e instanceof Error ? e.message : "fallo desconocido";
                return {
                  ok: false,
                  error: `No se ha podido subir ${f.name}: ${motivo}. Vuelve a intentarlo.`,
                  campos: { [c.campo]: "No se ha subido." },
                };
              }
              formData.append(c.campo, preparada.ruta);
              formData.append(`${c.campo}_nombre`, f.name);
            }
          }
        } finally {
          setProgreso(null);
        }

        return accion(formData);
      },
    [],
  );

  return { progreso, conSubidas };
}

/** La barra de la subida en curso. No ocupa sitio si no hay ninguna */
export function BarraSubida({ progreso }: { progreso: Progreso | null }) {
  if (!progreso) return null;
  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex justify-between gap-3 text-xs text-secundario">
        <span className="truncate">Subiendo {progreso.nombre}</span>
        <span className="cifra">{progreso.porcentaje}&nbsp;%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Subiendo ${progreso.nombre}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progreso.porcentaje}
        className="h-1.5 overflow-hidden rounded-full bg-elevado"
      >
        <div className="h-full rounded-full bg-dato transition-[width]" style={{ width: `${progreso.porcentaje}%` }} />
      </div>
    </div>
  );
}
