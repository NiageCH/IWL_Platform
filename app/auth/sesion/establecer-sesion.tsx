"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Cierre del enlace mágico en flujo implícito.
 *
 * El token viaja en el fragmento de la URL, que nunca llega al servidor. Se
 * lee aquí, se establece la sesión y se limpia el fragmento de la barra de
 * direcciones para que no quede un token en el historial del navegador.
 */
export function EstablecerSesion() {
  const router = useRouter();
  const params = useSearchParams();
  const [estado, setEstado] = useState<"entrando" | "error">("entrando");

  useEffect(() => {
    let cancelado = false;

    async function entrar() {
      const fragmento = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragmento.get("access_token");
      const refreshToken = fragmento.get("refresh_token");

      if (!accessToken || !refreshToken) {
        if (!cancelado) setEstado("error");
        return;
      }

      const { error } = await clienteNavegador().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelado) return;

      if (error) {
        setEstado("error");
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
      router.replace(params.get("siguiente") ?? "/");
      router.refresh();
    }

    void entrar();

    return () => {
      cancelado = true;
    };
  }, [params, router]);

  if (estado === "error") {
    return (
      <div className="relative pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
        <p className="text-sm text-titular">Este enlace ya no sirve.</p>
        <p className="mt-2 text-sm text-secundario">
          Los enlaces de entrada caducan en una hora y valen para un solo uso.
        </p>
        <Link
          href="/entrar"
          className="mt-4 inline-block text-sm text-acento-texto underline underline-offset-4"
        >
          Pedir uno nuevo
        </Link>
      </div>
    );
  }

  return <p className="text-sm text-secundario">Entrando</p>;
}
