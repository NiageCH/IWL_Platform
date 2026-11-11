import { afterEach, describe, expect, it, vi } from "vitest";
import { brevo, proveedor } from "./proveedores";

const MENSAJE = {
  para: { correo: "ella@ejemplo.test", nombre: "Alba Prueba" },
  asunto: "Asunto",
  texto: "Texto",
  html: "<p>Texto</p>",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("qué proveedor entrega", () => {
  it("Brevo, si hay clave", () => {
    vi.stubEnv("CORREO_PROVEEDOR", "");
    vi.stubEnv("BREVO_API_KEY", "clave");
    expect(proveedor()?.nombre).toBe("brevo");
  });
  it("Mailpit en local sin clave", () => {
    vi.stubEnv("CORREO_PROVEEDOR", "");
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(proveedor()?.nombre).toBe("mailpit");
  });
  it("ninguno, fuera de local y sin clave, aunque se fuerce Brevo", () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("CORREO_PROVEEDOR", "");
    expect(proveedor()).toBeNull();
    vi.stubEnv("CORREO_PROVEEDOR", "brevo");
    expect(proveedor()).toBeNull();
  });
  it("«ninguno» manda sobre la clave", () => {
    vi.stubEnv("BREVO_API_KEY", "clave");
    vi.stubEnv("CORREO_PROVEEDOR", "ninguno");
    expect(proveedor()).toBeNull();
  });
});

describe("el adaptador de Brevo", () => {
  it("llama a su API con la clave en la cabecera y devuelve el id del mensaje", async () => {
    vi.stubEnv("BREVO_API_KEY", "clave-brevo");
    vi.stubEnv("CORREO_REMITENTE", "Inception Woman Lab <plataforma@inceptionwlab.es>");
    vi.stubEnv("CORREO_RESPUESTA", "iwl@inceptionwlab.es");
    const llamada = vi.fn(async () => new Response(JSON.stringify({ messageId: "<abc@smtp-relay.mailin.fr>" }), { status: 201 }));
    vi.stubGlobal("fetch", llamada);

    expect(await brevo.enviar(MENSAJE)).toEqual({ id: "<abc@smtp-relay.mailin.fr>" });
    const [url, init] = llamada.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("clave-brevo");
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: "plataforma@inceptionwlab.es", name: "Inception Woman Lab" },
      to: [{ email: "ella@ejemplo.test", name: "Alba Prueba" }],
      replyTo: { email: "iwl@inceptionwlab.es" },
      subject: "Asunto",
      textContent: "Texto",
      htmlContent: "<p>Texto</p>",
    });
  });

  it("si Brevo lo rechaza, el error lleva su mensaje", async () => {
    vi.stubEnv("BREVO_API_KEY", "mala");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ code: "unauthorized", message: "Key not found" }), { status: 401 }));
    await expect(brevo.enviar(MENSAJE)).rejects.toThrow("Key not found");
  });
});
