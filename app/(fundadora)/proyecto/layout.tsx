import type { ReactNode } from "react";
import { BarraSuperior } from "@/components/barra-superior";

export default function LayoutProyecto({ children }: { children: ReactNode }) {
  return (
    <>
      <BarraSuperior />
      {children}
    </>
  );
}
