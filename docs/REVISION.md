# Revisión

Respuestas y encargos para Claude Code. La entrada más reciente arriba. Se trabaja sobre la última.

---

## 2026-10-29 · Proyectos reales y un solo proyecto de demostración

**Actualizado tras confirmar con Rodrigo: AgrolabX queda fuera del programa e Igor Labs sigue. Son cuatro proyectos reales, no tres.**

**Decisión de Rodrigo:** en los entornos de trabajo quedan solo los proyectos reales y **un** proyecto inventado completo, que cubre todas las variables. Las compañías de demostración del seed versionado no se borran del repositorio: las suites dependen de ellas.

### 1. El proyecto de demostración

· **Marea Clínica** es la demostración, porque ya es la más completa. Vega Predictiva y Raíz Sensórica se archivan en local y en la nube; siguen en el seed versionado para las pruebas.
· Se marca como demostración en datos (`is_demo`), con un distintivo visible «Demostración» en la cabecera y en la cartera.
· **Queda fuera de todo agregado:** comparativa, embudo hacia invertible, panel de compromiso IWL, Inicio de IWL y alertas. Una demo que cuenta en la cohorte falsea los números reales.
· Se completa para que recorra cada estado al menos una vez: las cuatro fases en su hoja de ruta, hitos en los cuatro estados, hallazgos técnicos de las cuatro severidades y uno resuelto, due diligence con puntos en los cinco estados y un documento caducado, un mes de KPI corregido con su historial, un update vencido sin entregar, introducciones en los cinco estados y una con comisión, un desembolso sin justificante, tareas abiertas, vencidas y cerradas, comentarios sin responder, línea base y reevaluación. Lista en la bitácora de qué estado cubre cada dato.

### 2. Limpieza

· **AgrolabX: borrar toda la actividad inventada** de `seed/local/30_agrolabx.sql`: las 16 líneas de horas, los dos desembolsos, los cinco contactos y las cinco introducciones. Quedan solo los datos del Acuerdo y del Anexo. En un proyecto real eso alimenta el extracto de aportación y la comisión, y no puede haber nada que no haya ocurrido.
· **AgrolabX se archiva** con motivo «Fuera del programa». No se borra: conserva el Acuerdo y el Anexo como histórico. La limpieza de la actividad inventada se hace igual.
· Antes de tocar la nube: lista en la bitácora qué compañías hay hoy allí y en qué estado.

### 3. Los cuatro proyectos reales

Cargar en `seed/local/21_proyectos.sql` (no versionado). Lo que no está aquí se deja **vacío en la plataforma**, sin texto de relleno, y se lista en la bitácora como dato pendiente con quién lo tiene. Fase actual de los cuatro: **Due diligence**, porque ninguno tiene Acuerdo firmado en Drive.

**La Pepi** (antes Terral Barria; cambiar nombre y slug a `la-pepi`, redirigir el viejo)
· Sector: cultura y turismo · Etapa: pre-semilla · Perfil: software con IA · Entrada: prototipo.
· Qué es: archivo vivo de artistas, oficios y espacios de Málaga, para residente y visitante. Archivo de creadores, no agregador de eventos.
· Dónde está: ruta de usuario definitiva cerrada el 8 oct 2026 (pantallas, funcionalidades y roles); ampliación de funcionalidades recibida el 19 oct 2026. Primera versión como web app; app nativa más adelante.
· Validación: encuesta a 99 artistas de Málaga (ago 2026) y análisis de más de 100 soluciones comparables.
· Siguientes pasos: cerrar el MVP sobre la ruta de usuario; decidir filtro de entrada frente a señal de visibilidad; modelo económico de talleres.
· KPI iniciales (sin facturación): artistas dados de alta · espacios dados de alta · actividades publicadas · usuarios activos mensuales · reservas.

**Siren** (antes Roster; cambiar nombre y slug a `siren`, redirigir el viejo; la web `roster.ai` se deja vacía hasta confirmar la nueva)
· Sector: herramientas para desarrollo · Etapa: pre-semilla · Perfil: software con IA · Entrada: prototipo.
· Qué es: escribe qué se espera de cada agente de IA, a partir del código, y comprueba en cada ejecución que se cumple. Genera tests en el CI del cliente, control de deriva y panel por agente.
· Dónde está: one-pager para partners y asesores de septiembre 2026. Acuerdo de incorporación en borrador, sin cerrar.
· Modelo: gratis hasta 5 agentes; precio por agente gestionado de 5 a 20; a medida por encima. Academia gratuita y formación de pago sobre el AI Act.
· Siguientes pasos: cerrar el Acuerdo y su Anexo; primeros design partners; fijar el precio por agente.
· KPI iniciales: equipos con el mapa de superficie activo · agentes gestionados · design partners · equipos en la academia · ingresos por formación.

**Igor Labs**
· Sector: software comercial B2B · Etapa: pre-semilla · Perfil: software con IA · Entrada: MVP.
· Qué es: prospección B2B multicanal con IA. Decide a quién contactar y qué decirle, y ejecuta la secuencia en todos los canales sin intervención manual. Cuatro capas: identifica, prioriza, ejecuta, aprende.
· Dónde está: el modelo ya factura a través de Nicea, la consultora de captación B2B del equipo fundador; Igor Labs sale a escalar esa demanda sobre plataforma propia. Documento de posicionamiento de septiembre 2026.
· Modelo: plataforma más servicio, precio por cuenta y mes en cuatro niveles: 500 € · 1.500 € · 2.500 € · 4.500 €.
· Financiación: NEOTEC (CDTI) como vía de financiación prevista para la capa de IA. Se carga como vía, nunca como ayuda concedida.
· Siguientes pasos, próximos doce meses: cerrar el motor de priorización y generación de mensajes · migrar la cartera de Nicea a la plataforma · incorporar las primeras agencias como canal · construir la línea base de indicadores.
· KPI iniciales: cuentas activas en plataforma · cuentas migradas desde Nicea · agencias incorporadas · MRR · tasa de respuesta multicanal.
· Liderazgo femenino: **100 %**, confirmado por Rodrigo.
· CEO: **Nuria Fernández**, socia de IWL y CEO de Nicea. Su correo queda pendiente para darle acceso.

**Proyecto Baires**
· Sector: salud, cirugía · Etapa: pre-semilla · Perfil: software con IA · Entrada: idea con activo propio (ontología de nueve estructuras definida por los equipos quirúrgicos).
· Qué es: visión por computador sobre la vista crítica del orificio miopectíneo en hernia inguinal TAPP. Tres fases: capacitar, validar, copiloto en quirófano.
· Socios: equipo quirúrgico de Buenos Aires (aporta vídeo, anotación y la ontología) y equipo quirúrgico de Hamburgo (validación externa). Niage aporta ingeniería, plataforma de anotación, gestión regulatoria y capital. Los nombres de los equipos los pone Rodrigo en la ficha; no se cargan desde aquí.
· **Duración total: 24 meses** como máximo (decidido el 21 sep 2026). El one-pager de agosto con 42 meses está desactualizado; no usarlo para la hoja de ruta.
· Siguientes pasos, en este orden: cerrar el consorcio con acuerdo firmado y aprobaciones éticas · piloto de anotación de 500 fotogramas en el mes 2 para medir la concordancia entre observadores · financiar la Fase 1.
· Necesidad de capital: horquilla de dimensionado, no presupuesto cerrado. Fase 1: 410 a 590 k€. No cargar más cifras hasta que se rehaga el plan a 24 meses.
· KPI iniciales: centros con acuerdo firmado · aprobaciones éticas · fotogramas anotados · concordancia entre observadores · IoU del modelo de segmentación.
· Porcentaje de liderazgo femenino: vacío hasta que Rodrigo lo fije.

### 4. Orden

Va **antes** del paso 4 y después de lo que esté en curso de la entrada anterior. Primero la limpieza (punto 2), luego la demo (punto 1) y después los cuatro reales (punto 3). Cada uno con su commit y su entrada en la bitácora. La subida a la nube, solo cuando Rodrigo lo diga.

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
