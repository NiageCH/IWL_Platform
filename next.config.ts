import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next 16 escribe un fichero de reglas para agentes en cada `next dev`, y sin
   * AGENTS.md presente lo escribe encima de CLAUDE.md. Aquí CLAUDE.md lo
   * mantenemos a mano: lleva las convenciones del proyecto, no las de Next.
   * Lo específico de Next 16 está anotado en DECISIONES.md.
   */
  agentRules: false,
};

export default nextConfig;
