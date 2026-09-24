import type { ReactNode } from "react";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";

/** La consola de IWL va en oscuro: se mira de seguido y está llena de gráficos */
export default function LayoutIwl({ children }: { children: ReactNode }) {
  return (
    <Marco tema="oscuro">
      <BarraSuperior />
      {children}
    </Marco>
  );
}
