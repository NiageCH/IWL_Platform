"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { registrarRecordatorio } from "@/lib/acciones/onboarding";
import { textoRecordatorio, type ClavePaso } from "@/lib/onboarding";

/**
 * Recordarle a alguien el paso en que se ha quedado.
 *
 * Por correo lo envía la plataforma; el mismo texto queda a mano para
 * mandarlo por WhatsApp. En los dos casos se apunta que se recordó, por qué
 * canal y cuándo.
 */
export function Recordar({
  personaId,
  candidaturaId,
  paso,
  nombre,
  correo,
  direccion,
}: {
  personaId: string;
  candidaturaId?: string;
  paso: ClavePaso;
  nombre: string;
  correo: string | null;
  direccion: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [apuntado, setApuntado] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [, empezar] = useTransition();
  const { cuerpo } = textoRecordatorio(paso, nombre, direccion);

  function apuntar(canal: "correo" | "whatsapp") {
    const datos = new FormData();
    datos.set("persona_id", personaId);
    datos.set("candidatura_id", candidaturaId ?? "");
    datos.set("paso", paso);
    datos.set("canal", canal);
    empezar(async () => {
      const r = await registrarRecordatorio(datos);
      setApuntado(r.ok ? canal : null);
      setFallo(r.ok ? null : r.error);
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion inline-flex items-center gap-1.5 text-xs font-medium text-titular"
      >
        <BellRing aria-hidden="true" className="size-3.5 text-acento-texto" />
        Recordar
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-filete bg-elevado p-3 text-sm">
      <p className="mb-2 text-xs text-secundario">
        Se lo envía la plataforma por correo, o copias el texto para
        WhatsApp. Queda apuntado que se lo recordaste.
      </p>
      <textarea
        readOnly
        value={cuerpo}
        rows={5}
        className="w-full rounded-md border border-filete bg-papel px-3 py-2 text-xs text-titular"
        aria-label="Texto del recordatorio"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {correo ? (
          <button type="button" onClick={() => apuntar("correo")} className="accion text-xs">
            Enviar el correo
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(cuerpo);
            apuntar("whatsapp");
          }}
          className="accion text-xs"
        >
          Copiar para WhatsApp
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
          Hecho
        </button>
        {apuntado ? (
          <span className="text-xs text-secundario" role="status">
            {apuntado === "correo" ? "Correo enviado, y apuntado." : "Apuntado: recordatorio por WhatsApp."}
          </span>
        ) : null}
        {fallo ? (
          <span className="text-xs text-mal" role="status">
            {fallo}
          </span>
        ) : null}
      </div>
    </div>
  );
}
