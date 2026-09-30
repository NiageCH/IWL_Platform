import type { ReactNode } from "react";

/**
 * Marco de una vista, con su tema.
 *
 * El tema no lo decide un componente ni una preferencia del navegador: lo
 * decide qué se está haciendo. Donde se trabaja —se redacta, se lee una tabla
 * larga, se repasa un checklist— va claro. Lo oscuro queda para la cara de la
 * marca: la barra de navegación y la pantalla de entrada.
 *
 * Antes era una pantalla entera o la otra, y la consola de IWL era oscura de
 * arriba abajo sobre negro puro. Se veía como una cueva y, peor, plana: sin
 * sitio por debajo, ninguna tarjeta podía levantarse.
 *
 * Ningún componente de dentro sabe en qué tema está: todos leen los mismos
 * tokens, y aquí se decide qué valen. Por eso una isla oscura dentro de una
 * página clara —`<Oscuro>`— no necesita que nadie se entere.
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
      data-tema={tema}
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

/**
 * Una isla oscura dentro de una página clara.
 *
 * Es lo que hace que la barra de navegación siga siendo de la marca mientras
 * el área de trabajo es de papel. Dentro valen los tokens oscuros, así que
 * cualquier componente que se meta aquí se pinta solo.
 */
export function Oscuro({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-tema="oscuro" className={className}>
      {children}
    </div>
  );
}
