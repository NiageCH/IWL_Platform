"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import type { Resultado } from "@/lib/acciones/resultado";
import { cn } from "@/lib/utils";

/**
 * Piezas de formulario de IWL.
 *
 * Sobrias y densas: etiqueta pequeña en mayúsculas, campo con filete fino, y
 * el error del campo debajo. Nada de globos ni de signos de exclamación (§8).
 */

const estadoInicial: Resultado = { ok: true };

/**
 * Envuelve una Server Action y expone su resultado a los hijos.
 *
 * `children` recibe el resultado para poder marcar los campos con error sin
 * que cada formulario tenga que cablear su propio estado.
 *
 * **Si la acción falla, lo escrito se queda.** React reinicia el formulario
 * en cuanto una acción termina, y eso con un error de validación es
 * desastroso: alguien rellena quince campos, se equivoca en uno, y pierde
 * los quince. Pasó de verdad, en el formulario de candidatura, y lo peor es
 * que no se nota al desarrollar porque uno prueba con el caso que funciona.
 *
 * Se guarda lo enviado antes de llamar y se repone después si ha salido
 * mal. Los ficheros no se pueden reponer —el navegador no deja escribir en
 * un `input[type=file]` por seguridad— así que esos hay que volver a
 * elegirlos; el resto se queda donde estaba.
 */
export function Formulario({
  accion,
  children,
  className,
  onOk,
}: {
  accion: (formData: FormData) => Promise<Resultado>;
  children: (resultado: Resultado) => ReactNode;
  className?: string;
  /** Se ejecuta cuando la acción sale bien, por ejemplo para cerrar el panel */
  onOk?: () => void;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const enviado = useRef<Array<[string, string]> | null>(null);

  const [resultado, enviar] = useActionState(
    async (_previo: Resultado, formData: FormData) => {
      // Lo escrito, por si hay que reponerlo
      enviado.current = [...formData.entries()].filter(
        (e): e is [string, string] => typeof e[1] === "string",
      );

      const salida = await accion(formData);
      if (salida.ok) {
        enviado.current = null;
        onOk?.();
      }
      return salida;
    },
    estadoInicial,
  );

  /*
   * Reponer va en un efecto y no justo después de la acción: React reinicia
   * el formulario al pintar el resultado, así que hacerlo antes no sirve de
   * nada. Aquí ya ha pasado.
   */
  useEffect(() => {
    if (resultado.ok || !enviado.current || !formulario.current) return;

    const campos = formulario.current.elements;

    for (const [nombre, valor] of enviado.current) {
      /*
       * Un grupo de casillas o de botones de radio comparte nombre, y
       * entonces `namedItem` devuelve la lista entera. Se recorre: lo que
       * llegó marcado se vuelve a marcar, y solo eso.
       */
      const campo = campos.namedItem(nombre);
      const varios = campo instanceof RadioNodeList ? [...campo] : [campo];

      for (const uno of varios) {
        if (uno instanceof HTMLInputElement) {
          // Una casilla no guarda lo escrito en `value`: guarda si está marcada
          if (uno.type === "checkbox" || uno.type === "radio") {
            if (uno.value === valor) uno.checked = true;
          } else if (uno.type !== "file" && uno.type !== "hidden") {
            uno.value = valor;
          }
        } else if (
          uno instanceof HTMLTextAreaElement ||
          uno instanceof HTMLSelectElement
        ) {
          uno.value = valor;
        }
      }
    }
  }, [resultado]);

  return (
    <form
      ref={formulario}
      action={enviar}
      className={cn("flex flex-col gap-4", className)}
    >
      {children(resultado)}
      {!resultado.ok ? (
        <p className="rounded-md border border-mal/40 bg-mal/10 px-3 py-2 text-sm text-mal">
          {resultado.error}
        </p>
      ) : resultado.mensaje ? (
        <p className="rounded-md border border-acento/40 bg-acento/10 px-3 py-2 text-sm text-acento-texto">
          {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  children,
}: {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="cifra text-xs uppercase tracking-wide text-metadato">
        {etiqueta}
      </span>
      {children}
      {ayuda && !error ? (
        <span className="text-xs text-metadato">{ayuda}</span>
      ) : null}
      {error ? <span className="text-xs text-mal">{error}</span> : null}
    </label>
  );
}

const CLASES_CAMPO =
  "rounded-md border border-filete bg-hundido px-3 py-2 text-sm text-titular outline-none transition-colors focus:border-acento focus:ring-1 focus:ring-acento/40";

export function Texto({
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cn(CLASES_CAMPO, error && "border-mal", className)}
    />
  );
}

export function AreaTexto({
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      className={cn(CLASES_CAMPO, "resize-y", error && "border-mal", className)}
    />
  );
}

export function Seleccion({
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={cn(CLASES_CAMPO, error && "border-mal", className)}
    >
      {children}
    </select>
  );
}

export function Boton({
  children,
  variante = "principal",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      disabled={props.disabled || pending}
      className={cn(
        "px-4 py-2 text-sm transition-all disabled:opacity-50",
        variante === "principal"
          ? // La cápsula en mayúsculas de inceptionwomanlab.es
            "boton-marca text-xs"
          : "rounded-full border border-filete bg-elevado px-4 py-2 text-sm font-medium text-titular hover:border-filete-fuerte",
        className,
      )}
    >
      {pending ? "Guardando" : children}
    </button>
  );
}

/**
 * Bloque plegable. La interfaz es densa: los formularios de alta viven
 * cerrados y se abren cuando hacen falta.
 */
export function Desplegable({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <details className="border-t border-filete" name={id}>
      {/*
        Con su propia flecha.
        
        El triángulo que pone el navegador es diminuto y del color del texto:
        sobre el lienzo oscuro no se ve, y el control acababa pareciendo una
        línea de texto suelta. Se le quita y se pone uno que gira al abrir.
      */}
      <summary className="desplegable-titulo flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-secundario transition-colors hover:bg-elevado hover:text-titular">
        <span aria-hidden="true" className="flecha-desplegable text-acento-texto">
          ▸
        </span>
        <span className="accion">{titulo}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
