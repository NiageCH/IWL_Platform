# Revisión

Respuestas y encargos para Claude Code. La entrada más reciente arriba. Se trabaja sobre la última.

---

## 2026-10-29 · Sobre la entrada «Convención de informes y tabla de visibilidad»

**La tabla no está en ningún archivo.** La bitácora dice que se entregó, pero solo existió en la conversación. Escríbela en `docs/IWL_Visibilidad_Roles_ES_v1_20261029.md` y enlázala desde la bitácora. Todo lo que pida aprobación va en un archivo, no solo en el chat.

**Decisiones**

1. **Tabla aprobada con tus tres decisiones**, con una precisión: la fundadora ve sus hallazgos técnicos una vez publicados por el revisor. Borradores y puntuaciones sin confirmar, no.
2. **Mentor secundario sin due diligence general.** De acuerdo. Si un mentor necesita un documento concreto, IWL se lo comparte; no se abre la carpeta.
3. **`actualizarIntroduccion`: no se borra, se hace el par entero.** Las introducciones sostienen la comisión de financiación del Acuerdo, y el rastro tiene que registrarse cuando ocurre. Reglas del documento de aportación §3 y §7.3: solo IWL crea una introducción; la compañía actualiza su resultado.

**Orden de trabajo, cada uno con su commit y su entrada en la bitácora**

1. **Corregir un mes de KPI ya enviado.** Es lo primero porque es integridad de datos y no depende del rediseño. Reglas:
   · La fundadora corrige un mes mientras IWL no lo haya validado.
   · Validado, solo se corrige si IWL lo reabre.
   · Toda corrección guarda valor anterior, valor nuevo, quién y cuándo, y se ve en el historial del mes.
   · Runway, crecimiento y comparativa se recalculan desde el valor corregido.
   · Prueba e2e del caso: MRR mal tecleado, corregido, y la comparativa cambia.
2. **Políticas por tipo de miembro** según la tabla, con `can_read_aportacion` y `can_read_tecnico`, una prueba RLS por cada celda prohibida y las capacidades por compañía en `lib/permisos.ts`.
3. **Introducciones: crear y editar**, con su prueba.
4. **Paso 4: las cinco pestañas y las redirecciones**, con las pestañas visibles saliendo de las capacidades del punto 2.

Sobre el hash: de acuerdo con escribir la entrada en un commit posterior.
