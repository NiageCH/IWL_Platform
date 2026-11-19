import "server-only";
import { clienteServicio } from "@/lib/supabase/servicio";
import { direccionBase } from "@/lib/direccion";
import { lineaAviso } from "@/lib/avisos";
import { CAMPOS_AVISO, comoAviso, conCuantosCorreos, type FilaAviso } from "@/lib/datos/onboarding";
import { notificar } from "@/lib/correo";

/**
 * El resumen diario de avisos: un correo a cada persona de IWL que tenga
 * alguno abierto, no uno por aviso. Quien no quiere recibirlo lo dice en
 * Mi cuenta.
 *
 * Dirección ve los avisos de todos (los que no van a nadie en concreto) y
 * los suyos; el resto de IWL y los mentores, solo los suyos —los de un
 * cambio de vía y los hitos entregados, al mentor principal—. Es lo mismo
 * que ve cada cual en la cartera.
 */
export async function enviarResumenes(): Promise<{ enviados: number; sinEnviar: number }> {
  const servicio = clienteServicio();
  const [{ data: personas }, { data: avisos }] = await Promise.all([
    servicio
      .from("profiles")
      .select("id, email, full_name, role")
      .in("role", ["admin_iwl", "equipo_iwl", "mentor"])
      .eq("is_active", true)
      .eq("resumen_avisos", "diario"),
    servicio
      .from("avisos")
      .select(`${CAMPOS_AVISO}, para, para_iwl`)
      .is("cerrado_at", null)
      .order("created_at"),
  ]);

  let enviados = 0;
  let sinEnviar = 0;
  for (const p of personas ?? []) {
    if (!p.email) continue;
    const filas = (avisos ?? []) as unknown as Array<FilaAviso & { para: string | null; para_iwl: boolean }>;
    // Los de todo IWL, a dirección y al equipo; no a los mentores
    const suyos = filas.filter(
      (a) =>
        a.para === p.id ||
        (a.para === null && p.role === "admin_iwl") ||
        (a.para_iwl && p.role === "equipo_iwl"),
    );
    if (!suyos.length) continue;
    // Lo mismo que la cartera: qué pasó y qué le toca
    const dichos = await conCuantosCorreos(suyos.map(comoAviso), servicio);
    const lista = dichos.map((a) => `· ${lineaAviso(a)}`).join("\n");
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
