import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import Link from "next/link";
import { ReintentarCorreo, ReintentarTodos } from "@/components/formularios/correo";
import { NOMBRE_EVENTO } from "@/lib/correo/plantillas";
import type { FilaCorreo, FilaCorreoSuelta } from "@/lib/datos/correos";
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

/**
 * Los correos de toda la plataforma, en Administración (REVISION, 19 nov).
 *
 * Arriba los que no salieron, con «Reintentar» uno a uno y todos de una
 * vez: es adonde lleva el aviso de correos sin enviar, que se cierra solo
 * cuando no queda ninguno. Debajo, los últimos que sí, para ver que el
 * proveedor funciona.
 */
export function CorreosDeTodos({ sinEnviar, ultimos }: { sinEnviar: FilaCorreoSuelta[]; ultimos: FilaCorreoSuelta[] }) {
  return (
    <Bloque id="correos" className="scroll-mt-48">
      <TituloBloque
        accion={sinEnviar.length ? <ReintentarTodos cuantos={sinEnviar.length} /> : <Metadato>Todos enviados</Metadato>}
      >
        Correos
      </TituloBloque>
      {sinEnviar.length === 0 ? (
        <SinDatos>
          No hay ningún correo sin enviar. Si uno no sale —el proveedor falla, o
          no hay ninguno configurado—, aparece aquí y te llega un aviso.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete" aria-label="Sin enviar">
          {sinEnviar.map((c) => (
            <FilaDeCorreo key={c.id} c={c} />
          ))}
        </ul>
      )}
      {ultimos.length ? (
        <>
          <p className="border-t border-filete px-5 pt-3 text-xs text-metadato">Los últimos enviados</p>
          <ul className="divide-y divide-filete" aria-label="Enviados">
            {ultimos.map((c) => (
              <FilaDeCorreo key={c.id} c={c} />
            ))}
          </ul>
        </>
      ) : null}
    </Bloque>
  );
}

function FilaDeCorreo({ c }: { c: FilaCorreoSuelta }) {
  return (
    <li className="flex flex-col gap-1 px-5 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-titular">{NOMBRE_EVENTO[c.evento]}</span>
        <Estado
          valor={c.estado === "enviado" ? "hecho" : c.estado === "sin_enviar" ? "atencion" : "curso"}
          rotulo={c.estado === "enviado" ? "Enviado" : c.estado === "sin_enviar" ? "Sin enviar" : "Enviándose"}
        />
        {c.donde ? (
          <Link href={c.donde.href} className="enlace text-xs text-acento-texto">
            {c.donde.nombre}
          </Link>
        ) : null}
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
  );
}
