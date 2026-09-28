"use client";

import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function BotonSalir() {
  const router = useRouter();

  async function salir() {
    await clienteNavegador().auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      className="accion text-sm text-secundario"
    >
      Salir
    </button>
  );
}
