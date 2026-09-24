"use client";

import { useActionState, useId, type ReactNode } from "react";
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
  const [resultado, enviar] = useActionState(
    async (_previo: Resultado, formData: FormData) => {
      const salida = await accion(formData);
      if (salida.ok) onOk?.();
      return salida;
    },
    estadoInicial,
  );

  return (
    <form action={enviar} className={cn("flex flex-col gap-4", className)}>
      {children(resultado)}
      {!resultado.ok ? (
        <p className="border-l-2 border-red-600 pl-3 text-sm text-red-700">
          {resultado.error}
        </p>
      ) : resultado.mensaje ? (
        <p className="border-l-2 border-acento pl-3 text-sm text-secundario">
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
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

const CLASES_CAMPO =
  "border border-filete bg-papel px-3 py-2 text-sm text-titular outline-none focus:border-acento";

export function Texto({
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cn(CLASES_CAMPO, error && "border-red-600", className)}
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
      className={cn(CLASES_CAMPO, "resize-y", error && "border-red-600", className)}
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
      className={cn(CLASES_CAMPO, error && "border-red-600", className)}
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
        "px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50",
        variante === "principal"
          ? "border border-titular bg-titular text-papel hover:opacity-90"
          : "border border-filete bg-papel text-titular hover:border-titular",
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
      <summary className="cursor-pointer px-4 py-2.5 text-sm text-secundario transition-colors hover:text-titular">
        {titulo}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
