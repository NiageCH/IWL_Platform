# Revisión

Respuestas y encargos para Claude Code. La entrada más reciente arriba. Se trabaja sobre la última.

---

## 2026-11-04 · Revisión de Rodrigo en local, como Marea Clínica

Rodrigo ha recorrido todas las pantallas. El diagnóstico es uno: **cada pantalla dibuja sus estados, cifras, barras y círculos a su manera**, y por eso falla lo mismo en todas: iconos encima de la palabra y sin color, cifras sin explicación, barras que no avanzan, selectores sin guardar. Se arregla en los componentes, una vez, y después se barre pantalla por pantalla.

### A. Componentes comunes, primero

1. **`<Estado>`.** Icono a la izquierda de la palabra, en la misma línea y centrado en vertical, **siempre con el color de su estado**: icono coloreado y pastilla con fondo suave. Hoy en Último mes, Hallazgos, Hoja de ruta y Aportación el círculo sale encima de la palabra y en gris. Severidades de hallazgo con su color: crítico rojo, alto ámbar, medio y bajo gris.
2. **`<Cifra>`.** Rótulo, número y, si lo hay, el cambio. Al pasar el ratón o pulsar `?`, una explicación de tres líneas: qué mide, contra qué se compara y qué significa la flecha. Y un enlace a la pantalla donde se ve el detalle. Se aplica a «Técnico 94,2 ↑ 47,1» y «Preparación 87,2 ↑ 84,9» de la cabecera, a «Distancia», a Madurez y a todos los KPI. **Escala de tamaños única**: la cifra protagonista siempre al mismo tamaño en todas las pantallas («75 %» de Recorrido igual que «Preparación de ronda»).
3. **Cabecera.** «Incubación» y el semáforo se solapan. Fase como texto y semáforo como `<Estado>` con su palabra; al pulsarlo, el motivo («Un hallazgo crítico abierto») y un enlace a él. «Bloqueo» no se entiende: el semáforo dice qué pasa, no una palabra suelta.
4. **`<BarraProgreso>`.** El relleno es proporcional de verdad: «Hitos del Anexo 6 de 11» hoy sale vacía. Segmentos con el color de cada estado. Se pulsa y abre la lista.
5. **Todo lo que se cuenta se pulsa.** Cada cifra, segmento, hito, hallazgo, punto o KPI abre su detalle en `<PanelLateral>` o lleva a su pantalla.
6. **Editar es un gesto completo, no un desplegable.** Ningún selector suelto. Para cambiar un estado: botón «Actualizar», que abre el panel lateral con estado nuevo, comentario, evidencia adjunta y **Guardar**; debajo, el historial de quién cambió qué y cuándo. Quien no puede cambiarlo ve la pastilla, sin desplegable. Así se ve quién decide.
7. **`<Evidencia>` se adelanta y se usa ya** en: encargar una tarea, registrar un avance, cuestionario técnico, plan de trabajo técnico, cambio de estado de hitos y puntos. Subir archivo, elegir uno del data room o pegar un enlace.
8. **Gráficos con color y explicación.** Radar, madurez y curvas: el objetivo en gris discontinuo; el valor actual de cada eje con el color de su estado frente al objetivo (en objetivo verde, por debajo ámbar, muy por debajo rojo). Al pasar el ratón por un punto, el valor, el objetivo y una línea de qué significa. Esto precisa mi regla anterior: el magenta no pinta datos, **los colores de estado sí**.
9. **Nombres, no categorías.** «Responsable: Compañía» pasa a la persona. Si no hay persona asignada, «Sin asignar» en ámbar.

### B. Documentos y registro

Antes de construir `<Evidencia>`, entrega en `docs/` una página corta, para Rodrigo y no técnica, que diga: dónde se guarda cada archivo, cómo se versiona, quién puede verlo, qué queda registrado de cada cambio (quién, cuándo, qué, con qué evidencia), cuánto tiempo se guarda y cómo se consulta ese registro desde la plataforma. Si algo de eso no existe hoy, la página lo dice y propone cómo.

### C. Pantallas

· **Resumen: solo lectura.** Es resumen y estado. Fuera desplegables. «Qué falta» deja de ser «1hecho1por hacer4vencido1no aplica» en texto plano: barra segmentada con leyenda de pastillas y, debajo, la lista ordenada (vencido, atención, por hacer), cada línea pulsable.
· **Programa y Anexo: se funde en Recorrido** en el paso 4, como estaba previsto. Lo que aporta a la fundadora queda como una tarjeta «Lo acordado»: pilares activos, horas que pone IWL, hitos que condicionan el equity y el Anexo firmado para descargar.
· **Hoja de ruta y Recorrido:** puntos de tramo con color de estado; la cifra de recorrido a escala; registrar un avance con evidencia.
· **Aportación:** tamaños, colores y círculos con los componentes de A.
· **Due diligence técnico:** radar con color y explicación al pasar el ratón; «Distancia» con su `?`; cada dimensión con una línea de qué mide y su nivel objetivo; plan de trabajo con responsable con nombre y edición por panel; cuestionario con evidencia.
· **Madurez y transformación, Due diligence general, Business plan, KPI:** misma pasada con los componentes de A. En KPI, el estado frente a objetivo en color.

### D. Orden

1. Componentes de A, con una página interna de muestra (`/componentes`, solo admin) que enseñe cada uno en todos sus estados. Captura de esa página en la bitácora.
2. Página de B. Espera aprobación.
3. Paso 4: cinco pestañas. Así el barrido se hace una vez sobre las pantallas definitivas.
4. Barrido de C, pestaña por pestaña, con capturas a 1280 px y en móvil.

Criterio para dar por cerrada cada pantalla: ningún estado sin color e icono en línea, ninguna cifra sin explicación, ningún selector sin Guardar, todo lo contable pulsable, tamaños de la escala única.

Sobre la pasada limpia de pruebas: Rodrigo la lanzará con la máquina descargada.

---

## 2026-10-30 · Sobre «La demostración recorre cada estado» (6d7efc4)

Bien resuelto, y de acuerdo con las tres decisiones: semilla local, el crítico que la saca de invertible y el cambio de agosto y septiembre.

**Respuestas**
1. **Quinto tramo, sí: «Cierre de ronda», planificado.** El tablero de la fundadora necesita un tramo futuro en gris para enseñar «a dónde vas». «Retrasado» y «En riesgo» no hace falta forzarlos.
2. **Objetivos a los KPI de Marea ahora**, en la semilla local, y el estado KPI frente a objetivo en «Último mes» del Resumen. Uno en objetivo, uno en atención y uno vencido.
3. Meta y pasos de hito, con el modelo de datos. De acuerdo.

**Antes de eso, la entrada anterior está sin hacer** («Sobre Cinco estados»): Resumen a cuatro bloques, el magenta fuera de los datos, quitar «Va por…» y la numeración de fases, quitar «Nace de seed», plegar los tramos completados en Recorrido y la barra segmentada del business plan. Va primero.

Orden: entrada anterior · estos dos puntos · paso 4 · modelo de datos de los tableros.

---

## 2026-10-30 · Sobre «Cinco estados» (6533987)

Revisadas las capturas. Due diligence es exactamente lo que se buscaba: los 29 cuadrados se leen de un vistazo. Recorrido y Resumen mejoran, pero siguen siendo largos.

**Respuestas**
1. **El avance del programa pasa al lenguaje de estados.** Tramos y fases completados en verde, el actual en azul, los futuros en gris; la barra de tiempo en gris oscuro, en ámbar si quedan menos de 30 días y en rojo si se pasa. **Regla general: el magenta no pinta datos.** Ni estados, ni scores, ni barras. Solo marca, navegación, enlaces y la acción principal. Las barras de «Preparación por área», los radares y las curvas pasan a gris oscuro, con la línea objetivo discontinua.
2. **La barra segmentada del business plan, ahora**, en esta misma tanda.
3. **«En plazo», de acuerdo.**

**Lo que veo en las capturas**
· **Resumen tiene ocho bloques.** Se queda en cuatro: Por dónde va, Qué falta (siguientes pasos y tareas en una sola lista), Último mes y Hallazgos abiertos. Madurez y Recorrido de scores se mueven a Due diligence técnico; Preparación por área, a Due diligence general. Cuando llegue el tablero de la fundadora, Resumen se convierte en él.
· **«Va por Incubación, y después le toca fin del programa»** sigue ahí, y las fases siguen numeradas («01 Acuerdo Marco», «Fase 3 de 4»). Fuera las dos cosas, como dice el documento de navegación.
· **«Nace de seed»** aparece bajo cada tarea en «Quién hace qué». Es un detalle interno que llega a la pantalla. Que no salga nunca, tampoco en la demo.
· **Recorrido:** solo el tramo en curso abierto; los completados, plegados en una línea con su estado y sus cifras. Hoy hay que bajar tres pantallas para llegar al tramo actual.
· **Las pestañas siguen en dos filas.** Es el paso 4; va justo después de la demo.

Orden: estos ajustes · barra del business plan · demostración completa · paso 4.

---

## 2026-10-30 · Calendario y Claude: aparcados

**Decisión de Rodrigo: calendario e IA quedan para más adelante.** `docs/IWL_Doc_CalendarioEIA_ES_v1_20261030.md` se queda como referencia, sin construir nada de él.

· No añadas `sesiones`, `sesion_*` ni `ia_peticiones` al modelo de datos.
· En el inicio de la fundadora, el business plan precargado lo carga **IWL a mano** a partir de los documentos. Sin IA.

Foco, en este orden: estados visuales · demostración completa · paso 4 · modelo de datos de los dos tableros (espera aprobación) · evidencia · inicio de la fundadora · inicio del mentor.

---

## 2026-10-30 · Estados visuales y menos texto

Lee `docs/IWL_Doc_EstadosVisuales_ES_v1_20261030.md`. Rodrigo encuentra la plataforma con demasiado texto y confusa. Un solo lenguaje de cinco estados con color, icono y palabra, igual para los tres públicos, y reglas para quitar texto.

**Orden:** va **antes** de los dos tableros de inicio, para que nazcan con este lenguaje. Primero los tokens, `<Estado>`, `estadoVisual` y la barra segmentada; luego aplicarlo a las pantallas existentes empezando por Resumen, Recorrido y Due diligence; después los tableros.

**Decisión de Rodrigo:** el azul entra solo como color de «En curso». Sigue fuera de enlaces, botones y gráficos. Los tonos decorativos de los iconos (cielo, lila, menta, durazno) se retiran.

Entrega capturas antes y después de las tres primeras pantallas en la bitácora.

---

## 2026-10-30 · Inicio de la fundadora

Lee `docs/IWL_Doc_InicioFundadora_ES_v1_20261030.md`. Es el tablero principal de la fundadora: dónde está, a dónde va y qué le toca. Sustituye, para ella, al paso 3 del rediseño.

**Orden:**
1. Termina la demostración que recorre cada estado, añadiendo lo que este documento necesita: meta del programa, pasos dentro de los hitos y secciones del business plan en «Para revisar». Así el tablero se prueba con la cuenta `rev-fundadora`.
2. Paso 4 (cinco pestañas y rutas), para que cada acción del tablero apunte a su ruta definitiva.
3. Este tablero.

Antes de escribir código, entrega en un archivo de `docs/` el modelo de datos de lo nuevo (meta, pasos, «Para revisar», comprobación previa al acceso) y de qué tablas sale cada bloque del tablero. Espera aprobación.

**Ampliación: inicio del mentor y edición con evidencia.** Lee también `docs/IWL_Doc_InicioMentorYEvidencia_ES_v1_20261030.md`. El modelo de datos que me entregues cubre los dos documentos a la vez, porque comparten pasos de hito y evidencia. Orden dentro del punto 3: primero `<Evidencia>` y la ampliación de `evidence_links`, que usan los dos tableros; después el inicio de la fundadora; después el del mentor.

Pendiente de la entrada anterior: liderazgo femenino de Igor es **100 %**.

---

## 2026-10-29 · Respuestas a la entrada de AgrolabX

1. **Los seis meses de KPI inventados se van.** Un dato falso en un proyecto real no se queda, aunque esté archivado.
2. **Bien quitados los entregables.** Mismo criterio.

**Prioridad:** después de la demostración, las **cuentas de revisión** (entrada de abajo, punto 1). Rodrigo las está esperando para revisar la plataforma por rol. Cuando existan, dilo en la bitácora con la ruta de `.accesos-revision.md`.

---

## 2026-10-29 · Cuentas de revisión por rol y equipos de los proyectos reales

### 1. Cuentas de revisión, una por vista

Para que Rodrigo recorra la plataforma con cada rol. **Todas cuelgan de la demostración (Marea Clínica), nunca de un proyecto real.**

**Correos con alias de Rodrigo**, no inventados: `rodrigo+<alias>@niage.es`. Llegan a su bandeja, así que la recuperación de contraseña funciona y ningún enlace sale a un dominio ajeno.

| Alias | Nombre visible | Rol | Vínculo |
|---|---|---|---|
| `rodrigo+rev-admin@niage.es` | Revisión · Dirección | admin_iwl | Todo |
| `rodrigo+rev-equipo@niage.es` | Revisión · Equipo IWL | equipo_iwl | Todo |
| `rodrigo+rev-niage@niage.es` | Revisión · Ingeniería Niage | revisor_niage | Marea Clínica |
| `rodrigo+rev-mentor1@niage.es` | Revisión · Mentor principal | mentor | Marea Clínica, mentor_principal |
| `rodrigo+rev-mentor2@niage.es` | Revisión · Mentor secundario | mentor | Marea Clínica, mentor_secundario |
| `rodrigo+rev-fundadora@niage.es` | Revisión · Fundadora | fundadora | Marea Clínica |
| `rodrigo+rev-candidata@niage.es` | Revisión · Candidata | candidata | Una candidatura de demostración en NDA firmado, con su due diligence por entregar |

Si existe `lector_externo` como rol con cuenta, añade su fila; si es solo enlace con caducidad, genera un enlace de la demo y ponlo en el fichero de accesos.

Reglas:
· Contraseña aleatoria por cuenta, generada por script, escrita **solo** en `.accesos-revision.md` (añadir a `.gitignore`). Ni en el seed, ni en la bitácora, ni en el chat.
· Nombre visible siempre con el prefijo «Revisión ·», para que nunca se confundan con personas reales en listas, comentarios o tareas.
· Se crean en local y en la nube. Script reutilizable: `npm run cuentas:revision`, idempotente, y `npm run cuentas:revision -- --borrar` para quitarlas todas.
· La cuenta `candidata.prueba@iwl.es` se sustituye por la nueva y se borra.
· En la bitácora: la tabla de arriba con lo que ve cada cuenta al entrar (pantalla de aterrizaje y pestañas visibles). Sirve de comprobación del paso 2 y de la tabla de visibilidad.

### 2. Equipos de los proyectos reales

Se registran como datos de la ficha. **No se crea ninguna cuenta todavía**: los correos están sin confirmar y antes hay que sustituir los `@iwl.es` provisionales.

| Compañía | Persona | Papel |
|---|---|---|
| Igor Labs | Nuria Fernández | CEO. Socia de IWL y CEO de Nicea |
| Siren | Agustina Gómez | Fundadora principal |
| Siren | Camila Aguado | Socia fundadora |
| La Pepi | Daniela Miazzo | Fundadora |
| Proyecto Baires | Dr. Martín Celsi | Referente del proyecto, uno de varios socios |

Nuria entra como **fundadora** de Igor Labs, no como equipo IWL: con rol de IWL vería la cartera del resto de la cohorte.

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
