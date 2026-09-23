"use client";

import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Entrada con enlace mágico. No hay contraseñas en producción.
 */
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
      },
    });

    if (error) {
      setEstado("error");
      setMensaje(error.message);
      return;
    }

    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div className="border-l-2 border-acento pl-4">
        <p className="text-sm text-titular">
          Enlace enviado a <span className="cifra">{correo}</span>.
        </p>
        <p className="mt-2 text-sm text-secundario">
          Ábrelo desde este mismo navegador. Caduca en una hora.
        </p>
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
          className="border border-filete bg-papel px-3 py-2 text-sm text-titular outline-none focus:border-acento"
          placeholder="tu@compania.com"
        />
      </label>

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="border border-titular bg-titular px-3 py-2 text-sm font-medium text-papel transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {estado === "enviando" ? "Enviando" : "Enviar enlace de entrada"}
      </button>

      {estado === "error" ? (
        <p className="border-l-2 border-red-600 pl-3 text-sm text-red-700">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
