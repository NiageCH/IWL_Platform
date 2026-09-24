import type { ReactNode } from "react";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";

/**
 * La vista de la compañía va en claro: aquí se redacta el business plan, se
 * lee el checklist y se trabaja con texto largo.
 */
export default function LayoutProyecto({ children }: { children: ReactNode }) {
  return (
    <Marco tema="claro">
      <BarraSuperior />
      {children}
    </Marco>
  );
}
