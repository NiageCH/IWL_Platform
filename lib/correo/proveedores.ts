/**
 * Quién entrega los correos. Cambiar de proveedor es escribir otro
 * adaptador aquí: el resto de la plataforma solo conoce `notificar`.
 *
 *   · resend: el de producción, por su API HTTP. Con `RESEND_API_KEY`.
 *   · mailpit: el buzón local que trae Supabase. No sale nada a internet;
 *     se lee en http://127.0.0.1:54324, y las pruebas lo consultan.
 *
 * Sin ninguno, no se envía: el correo queda «sin enviar» y Administración
 * lo dice.
 */

export interface Mensaje {
  para: { correo: string; nombre?: string | null };
  asunto: string;
  texto: string;
  html: string;
}

export interface Proveedor {
  nombre: "resend" | "mailpit";
  enviar(m: Mensaje): Promise<{ id: string }>;
}

/** «Nombre <correo>» en sus dos partes */
export function partirRemitente(r: string): { nombre: string | null; correo: string } {
  const m = r.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { nombre: m[1] || null, correo: m[2].trim() } : { nombre: null, correo: r.trim() };
}

export function remitente() {
  return process.env.CORREO_REMITENTE || "Inception Woman Lab <plataforma@inceptionwlab.es>";
}

export function respuestaA() {
  return process.env.CORREO_RESPUESTA || "iwl@inceptionwlab.es";
}

const resend: Proveedor = {
  nombre: "resend",
  async enviar(m) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente(),
        to: [m.para.nombre ? `${m.para.nombre} <${m.para.correo}>` : m.para.correo],
        reply_to: respuestaA(),
        subject: m.asunto,
        text: m.texto,
        html: m.html,
      }),
    });
    const cuerpo = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok || !cuerpo.id) throw new Error(cuerpo.message ?? `Resend respondió ${r.status}`);
    return { id: cuerpo.id };
  },
};

const mailpit: Proveedor = {
  nombre: "mailpit",
  async enviar(m) {
    const de = partirRemitente(remitente());
    const r = await fetch(`${process.env.MAILPIT_URL || "http://127.0.0.1:54324"}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: de.correo, Name: de.nombre ?? "" },
        To: [{ Email: m.para.correo, Name: m.para.nombre ?? "" }],
        ReplyTo: [{ Email: respuestaA() }],
        Subject: m.asunto,
        Text: m.texto,
        HTML: m.html,
      }),
    });
    const cuerpo = (await r.json().catch(() => ({}))) as { ID?: string };
    if (!r.ok || !cuerpo.ID) throw new Error(`Mailpit respondió ${r.status}`);
    return { id: cuerpo.ID };
  },
};

/**
 * El proveedor que toca. `CORREO_PROVEEDOR` lo fuerza («resend»,
 * «mailpit» o «ninguno»). Si no, Resend si hay clave; Mailpit si la base
 * es la local; y si no, ninguno.
 */
export function proveedor(): Proveedor | null {
  const forzado = process.env.CORREO_PROVEEDOR;
  if (forzado === "ninguno") return null;
  if (forzado === "resend") return process.env.RESEND_API_KEY ? resend : null;
  if (forzado === "mailpit") return mailpit;
  if (process.env.RESEND_API_KEY) return resend;
  if (/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) return mailpit;
  return null;
}
