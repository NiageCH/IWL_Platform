"use client";

import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Entrada.
 *
 * Con contraseña, que es lo que pone la dirección de IWL al dar de alta a
 * alguien. El enlace por correo sigue estando como segunda vía, para quien
 * no se acuerda de la suya, pero ya no es la puerta principal: obligaba a
 * tener el correo funcionando antes de que nadie pudiera entrar a mirar.
 *
 * Esto además libera los correos: con contraseña no hace falta que el buzón
 * exista de verdad, así que una cuenta se puede dar de alta con la dirección
 * que le corresponda a esa persona aunque todavía no la use.
 */
const BANDEJA_LOCAL = "http://127.0.0.1:54324";

function esLocal() {
  return (
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

/**
 * Los mensajes del servidor de auth hablan de «signups» y de «credentials»,
 * que no significan nada para quien los lee.
 *
 * El de contraseña incorrecta se deja deliberadamente vago: decir «ese correo
 * no existe» le confirmaría a cualquiera qué direcciones están dadas de alta.
 */
function traducir(mensaje: string): string {
  if (/invalid login credentials/i.test(mensaje)) {
    return "El correo o la contraseña no son correctos.";
  }
  if (/email not confirmed/i.test(mensaje)) {
    return "Esa cuenta está sin confirmar. Avisa al equipo de IWL.";
  }
  if (/signup|not allowed|not found/i.test(mensaje)) {
    return "Ese correo no tiene acceso a la plataforma. El alta la hace el equipo de IWL.";
  }
  if (/rate limit|too many/i.test(mensaje)) {
    return "Demasiados intentos seguidos. Espera un minuto.";
  }
  return mensaje;
}

export function FormularioEntrada({ siguiente }: { siguiente?: string }) {
  const [via, setVia] = useState<"clave" | "enlace">("clave");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [estado, setEstado] = useState<
    "inicial" | "enviando" | "enviado" | "error"
  >("inicial");
  const [mensaje, setMensaje] = useState("");

  async function entrarConClave(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");

    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (error) {
      setEstado("error");
      setMensaje(traducir(error.message));
      return;
    }

    /*
     * Navegación completa, no `router.push`.
     *
     * La sesión vive en una cookie que acaba de escribir el navegador, y el
     * servidor tiene que leerla para decidir a dónde va cada persona. Con
     * una navegación de cliente eso es una carrera: unas veces llega y otras
     * la página se renderiza todavía sin sesión y devuelve a la entrada.
     * Pasaba una de cada varias veces, que es la peor forma de fallar.
     */
    window.location.assign(
      siguiente && siguiente.startsWith("/") ? siguiente : "/",
    );
  }

  async function pedirEnlace(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");

    const supabase = clienteNavegador();
    const destino = new URL("/auth/confirmar", window.location.origin);
    if (siguiente && siguiente.startsWith("/")) {
      destino.searchParams.set("siguiente", siguiente);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: {
        emailRedirectTo: destino.toString(),
        // Nadie se crea una cuenta por su cuenta: el alta la hace IWL
        shouldCreateUser: false,
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
              className="enlace cifra text-acento-texto"
            >
              abrir la bandeja
            </a>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setEstado("inicial");
            setVia("clave");
          }}
          className="accion mt-4 text-sm text-secundario"
        >
          Volver
        </button>
      </div>
    );
  }

  const campo =
    "rounded-md border border-filete bg-hundido px-3 py-2 text-sm text-titular outline-none transition-colors focus:border-acento focus:ring-1 focus:ring-acento/40";

  return (
    <form
      onSubmit={via === "clave" ? entrarConClave : pedirEnlace}
      className="flex flex-col gap-4"
    >
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
          className={campo}
          placeholder="tu@compania.com"
        />
      </label>

      {via === "clave" ? (
        <label className="flex flex-col gap-2">
          <span className="cifra text-xs uppercase tracking-wide text-metadato">
            Contraseña
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className={campo}
          />
        </label>
      ) : null}

      <button type="submit" disabled={estado === "enviando"} className="boton-marca px-4 py-2 text-xs disabled:opacity-50">
        {estado === "enviando"
          ? "Entrando"
          : via === "clave"
            ? "Entrar"
            : "Enviar enlace de entrada"}
      </button>

      {estado === "error" ? (
        <p className="rounded-md border border-mal/40 bg-mal/10 px-3 py-2 text-sm text-mal">
          {mensaje}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setVia(via === "clave" ? "enlace" : "clave");
          setEstado("inicial");
        }}
        className="accion self-start text-xs text-secundario"
      >
        {via === "clave"
          ? "No recuerdo mi contraseña"
          : "Entrar con contraseña"}
      </button>

      {esLocal() ? (
        <p className="border-t border-filete pt-3 text-xs text-metadato">
          Entorno local. La contraseña de las personas de prueba es{" "}
          <span className="cifra">iwl-local-2026</span>. Si pides un enlace, no
          sale a internet: aparece en la{" "}
          <a
            href={BANDEJA_LOCAL}
            target="_blank"
            rel="noreferrer"
            className="enlace text-acento-texto"
          >
            bandeja de desarrollo
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
