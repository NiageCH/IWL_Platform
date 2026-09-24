"use client";

import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Entrada con enlace mágico. No hay contraseñas.
 *
 * En local el correo no sale a internet: Supabase lo intercepta y lo deja en
 * una bandeja que corre junto a la base. Por eso, en desarrollo, la pantalla
 * enlaza directamente a esa bandeja: quien arranca el proyecto por primera vez
 * no tiene por qué saber que ese puerto existe.
 */
const BANDEJA_LOCAL = "http://127.0.0.1:54324";

function esLocal() {
  return (
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

/**
 * El mensaje que devuelve el servidor de auth para un correo no dado de alta
 * habla de «signups», que no significa nada para quien lo lee. Se traduce a lo
 * que de verdad ha pasado, sin confirmar ni desmentir si ese correo existe.
 */
function traducir(mensaje: string): string {
  if (/signup|not allowed|not found/i.test(mensaje)) {
    return "Ese correo no tiene acceso a la plataforma. El alta la hace el equipo de IWL.";
  }
  if (/rate limit|too many/i.test(mensaje)) {
    return "Se han pedido demasiados enlaces seguidos. Espera un minuto.";
  }
  return mensaje;
}

export function FormularioEntrada() {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado" | "error">(
    "inicial",
  );
  const [mensaje, setMensaje] = useState("");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");

    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmar`,
        // Durante el desarrollo se crea la cuenta al vuelo, para poder
        // recorrer la plataforma sin fricción. Al cerrar el acceso, aquí va
        // `shouldCreateUser: false`. Ver DECISIONES.md.
      },
    });

    if (error) {
      setEstado("error");
      setMensaje(traducir(error.message));
      return;
    }

    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div className="relative pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
        <p className="text-sm text-titular">
          Enlace enviado a <span className="cifra">{correo}</span>.
        </p>
        <p className="mt-2 text-sm text-secundario">
          Ábrelo desde este mismo navegador. Caduca en una hora y vale para un
          solo uso.
        </p>

        {esLocal() ? (
          <p className="mt-4 border-t border-filete pt-3 text-sm text-secundario">
            En local el correo no sale a internet. Lo encontrarás en la bandeja
            de desarrollo:{" "}
            <a
              href={BANDEJA_LOCAL}
              target="_blank"
              rel="noreferrer"
              className="cifra text-acento-texto underline underline-offset-4"
            >
              abrir la bandeja
            </a>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setEstado("inicial")}
          className="mt-4 text-sm text-secundario underline underline-offset-4 transition-colors hover:text-titular"
        >
          Pedir otro enlace
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="cifra text-xs uppercase tracking-wide text-metadato">
          Correo
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="rounded-md border border-filete bg-hundido px-3 py-2 text-sm text-titular outline-none transition-colors focus:border-acento focus:ring-1 focus:ring-acento/40"
          placeholder="tu@compania.com"
        />
      </label>

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="barra-acento rounded-md px-3 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
      >
        {estado === "enviando" ? "Enviando" : "Enviar enlace de entrada"}
      </button>

      {estado === "error" ? (
        <p className="rounded-md border border-mal/40 bg-mal/10 px-3 py-2 text-sm text-mal">
          {mensaje}
        </p>
      ) : null}

      {esLocal() ? (
        <p className="border-t border-filete pt-3 text-xs text-metadato">
          Entorno local. El correo no sale a internet: el enlace aparece en la{" "}
          <a
            href={BANDEJA_LOCAL}
            target="_blank"
            rel="noreferrer"
            className="text-acento-texto underline underline-offset-4"
          >
            bandeja de desarrollo
          </a>
          . Personas de prueba en el README.
        </p>
      ) : null}
    </form>
  );
}
