import "server-only";
import { nombreCompleto, nombrePersona } from "@/lib/etiquetas";
import { clienteServicio } from "@/lib/supabase/servicio";
import { direccionBase } from "@/lib/direccion";
import { textoAviso } from "@/lib/avisos";
import { notificar } from "@/lib/correo";

/**
 * El resumen diario de avisos: un correo a cada persona de IWL que tenga
 * alguno abierto, no uno por aviso. Quien no quiere recibirlo lo dice en
 * Mi cuenta.
 *
 * Dirección ve los avisos de todos (los que no van a nadie en concreto) y
 * los suyos; el resto de IWL, solo los suyos —los de un cambio de vía, al
 * mentor principal—. Es lo mismo que ve cada cual en la cartera.
 */
export async function enviarResumenes(): Promise<{ enviados: number; sinEnviar: number }> {
  const servicio = clienteServicio();
  const [{ data: personas }, { data: avisos }] = await Promise.all([
    servicio
      .from("profiles")
      .select("id, email, full_name, role")
      .in("role", ["admin_iwl", "equipo_iwl"])
      .eq("is_active", true)
      .eq("resumen_avisos", "diario"),
    servicio
      .from("avisos")
      .select("tipo, para, created_at, profiles!avisos_profile_id_fkey ( full_name, last_name, email ), companies ( name ), candidaturas ( nombre, contacto_nombre, contacto_apellidos )")
      .is("cerrado_at", null)
      .order("created_at"),
  ]);

  let enviados = 0;
  let sinEnviar = 0;
  for (const p of personas ?? []) {
    if (!p.email) continue;
    const suyos = (avisos ?? []).filter((a) => a.para === p.id || (a.para === null && p.role === "admin_iwl"));
    if (!suyos.length) continue;
    const lista = suyos
      .map((a) => {
        const quien = a.profiles as unknown as { full_name: string | null; last_name: string | null; email: string | null } | null;
        const candidatura = a.candidaturas as unknown as { nombre: string; contacto_nombre: string | null; contacto_apellidos: string | null } | null;
        const donde =
          (a.companies as unknown as { name: string } | null)?.name ??
          (a.candidaturas as unknown as { nombre: string } | null)?.nombre ??
          null;
        return `· ${textoAviso(a.tipo, quien ? nombrePersona(quien) : nombreCompleto(candidatura?.contacto_nombre, candidatura?.contacto_apellidos) || "Alguien", donde)}${donde && a.tipo !== "cambio_via" ? ` (${donde})` : ""}`;
      })
      .join("\n");
    const r = await notificar(
      { correo: p.email, nombre: p.full_name, profileId: p.id },
      "resumen_avisos",
      { nombre: p.full_name, cuantos: suyos.length, lista, enlace: `${direccionBase()}/cartera` },
    );
    if (r.estado === "enviado") enviados++;
    else sinEnviar++;
  }
  return { enviados, sinEnviar };
}
