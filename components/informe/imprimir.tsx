"use client";

/**
 * Botón de impresión.
 *
 * Abre el diálogo del navegador, donde se elige impresora o «Guardar como
 * PDF». Lleva la clase que lo saca del papel: un botón impreso es ruido.
 */
export function Imprimir() {
  return (
    <div className="no-imprimir mb-6 flex flex-wrap items-center gap-4 border border-filete bg-elevado px-4 py-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="barra-acento rounded-md px-3 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
      >
        Imprimir o guardar en PDF
      </button>
      <p className="text-xs text-secundario">
        En el diálogo, elige «Guardar como PDF» como destino. Si el navegador
        pregunta por los gráficos de fondo, márcalos: sin ellos el documento
        sale sin colores.
      </p>
    </div>
  );
}
