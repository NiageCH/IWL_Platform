import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next 16 escribe un fichero de reglas para agentes en cada `next dev`, y sin
   * AGENTS.md presente lo escribe encima de CLAUDE.md. Aquí CLAUDE.md lo
   * mantenemos a mano: lleva las convenciones del proyecto, no las de Next.
   * Lo específico de Next 16 está anotado en DECISIONES.md.
   */
  agentRules: false,
  /**
   * Las fuentes del PDF del NDA se leen del disco en ejecución, y el rastreo
   * de ficheros no las ve: sin esto, en Vercel el PDF falla al contrafirmar.
   * Van a todas las rutas porque la acción que lo genera se llama desde
   * varias pantallas; son 1,5 MB.
   */
  outputFileTracingIncludes: {
    "/**": ["./lib/fuentes/**/*"],
  },
};

export default nextConfig;
