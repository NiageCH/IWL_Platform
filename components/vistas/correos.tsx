import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { ReintentarCorreo } from "@/components/formularios/correo";
import { NOMBRE_EVENTO } from "@/lib/correo/plantillas";
import type { FilaCorreo } from "@/lib/datos/correos";
import { fecha } from "@/lib/utils";

/**
 * Los correos que le ha enviado la plataforma, y en qué quedaron. Uno que
 * no salió —el proveedor falló, o no hay ninguno— se ve aquí con
 * «Reintentar», en vez de perderse.
 */
export function BloqueCorreos({ correos }: { correos: FilaCorreo[] }) {
  const sinEnviar = correos.filter((c) => c.estado !== "enviado").length;
  return (
    <Bloque>
      <TituloBloque accion={<Metadato>{sinEnviar ? `${sinEnviar} sin enviar` : correos.length}</Metadato>}>
        Correos
      </TituloBloque>
      {correos.length === 0 ? (
        <SinDatos>Todavía no se le ha enviado ningún correo desde la plataforma.</SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {correos.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 px-5 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-titular">{NOMBRE_EVENTO[c.evento]}</span>
                <Estado
                  valor={c.estado === "enviado" ? "hecho" : c.estado === "sin_enviar" ? "atencion" : "curso"}
                  rotulo={c.estado === "enviado" ? "Enviado" : c.estado === "sin_enviar" ? "Sin enviar" : "Enviándose"}
                />
              </div>
              <p className="text-xs text-metadato [overflow-wrap:anywhere]">
                A {c.destinatario} · {fecha(c.enviado_at ?? c.created_at)}
                {c.intentos > 1 ? ` · ${c.intentos} intentos` : ""}
              </p>
              {c.estado === "sin_enviar" ? (
                <div className="flex flex-wrap items-center gap-3">
                  {c.error ? <p className="text-xs text-cuerpo">{c.error}</p> : null}
                  <ReintentarCorreo id={c.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Bloque>
  );
}
