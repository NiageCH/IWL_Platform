import type { ReactNode } from "react";

/**
 * Marco de una vista, con su tema.
 *
 * El tema no lo decide un componente ni una preferencia del navegador: lo
 * decide qué se está haciendo. La consola de IWL es oscura porque se mira de
 * seguido y está llena de gráficos; la vista de la compañía es clara porque
 * ahí se redacta y se lee.
 *
 * Ningún componente de dentro sabe en qué tema está: todos leen los mismos
 * tokens, y aquí se decide qué valen.
 */
export function Marco({
  tema,
  children,
}: {
  tema: "claro" | "oscuro";
  children: ReactNode;
}) {
  return (
    <div
      data-tema={tema === "claro" ? "claro" : undefined}
      className={
        tema === "claro"
          ? "flex min-h-screen flex-col bg-lienzo text-cuerpo"
          : "lienzo-degradado flex min-h-screen flex-col bg-lienzo text-cuerpo"
      }
    >
      {children}
    </div>
  );
}
