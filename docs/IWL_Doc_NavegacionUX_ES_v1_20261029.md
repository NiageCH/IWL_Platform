# Plataforma IWL · rediseño de navegación

Versión 1 · 29 oct 2026 · Inception Woman Lab

Sustituye a los ajustes pantalla a pantalla. Primero se cambia la estructura; después se rehacen las pantallas densas dentro de ella. Claude Code lo lee entero, propone el plan y no escribe código hasta que se apruebe.

---

## 1. Diagnóstico, sobre el código actual

- **La plataforma está ordenada como la base de datos.** Una pestaña por módulo: ocho por compañía en `cabecera-proyecto.tsx`. Quien entra tiene que saber en qué módulo vive lo que busca.
- **Tres pantallas contestan la misma pregunta.** «¿Por dónde vamos?» está en Resumen (bloque «Por dónde va»), en Programa y Anexo (`vistas/programa.tsx`) y en Hoja de ruta (`vistas/ruta.tsx`). Cada mejora añadió una respuesta más en lugar de quitar las otras.
- **No hay inicio.** IWL aterriza en Cartera y la fundadora en Resumen. Ninguna de las dos pantallas dice qué te toca hoy. Las tareas vencidas desde septiembre que nadie vio son la consecuencia.
- **La cabecera pesa más que el contenido.** Nombre, sector, dos enlaces de administración, descripción, fase, etapa, perfil, semáforo, tres cifras con su nota y ocho pestañas, repetidos en cada pantalla.
- **Dos esqueletos distintos.** IWL tiene barra lateral; la fundadora solo barra superior. Lo que aprende una no sirve para la otra.
- **Lo que se hace sobre una compañía vive en Administración.** Editar, archivar o dar de baja se resolvió con enlaces que saltan a otra pantalla.
- **Dos menús duplicados.** `barra-lateral.tsx` y `barra-superior.tsx` repiten la misma lista a mano.

## 2. Principio

**Se navega por lo que cada persona viene a hacer, no por módulo.** Cada pregunta se contesta en un solo sitio. Cada pantalla abre diciendo qué hay, qué falta y cuál es el siguiente paso.

## 3. Navegación global

Mismo esqueleto para los dos roles: barra lateral a la izquierda, cajón en móvil. Una sola lista de entradas por rol, definida en un sitio y leída por la barra lateral y el cajón.

| Equipo IWL | Fundadora |
|---|---|
| Inicio | Inicio |
| Cartera (vistas: tabla · comparativa) | Mi compañía |
| Embudo | Tareas |
| Tareas | |
| Administración (solo admin) | |

Abajo, en los dos: persona, perfil y salir. Comparativa deja de ser entrada propia y pasa a ser una vista dentro de Cartera.

## 4. Inicio por rol

**Fundadora · «Qué te toca».** En este orden: update del mes (estado y fecha límite) · documentos que te piden · tus tareas · comentarios sin responder · próximo hito con fecha. Cada línea lleva al sitio exacto donde se resuelve, con un clic.

**IWL · «Qué requiere atención».** Validaciones pendientes · updates que no han llegado · tareas vencidas · alertas (runway, hallazgos críticos, documentos caducados) · candidaturas por mover en el embudo. Agrupado por compañía. Debajo, la tabla de cartera resumida.

Si no hay nada pendiente, una línea: «Todo al día. Próximo hito: … ».

## 5. La compañía: cinco pestañas

| Pestaña | Contiene | Sustituye a |
|---|---|---|
| Resumen | Por dónde va (fases + siguiente hito con fecha y responsable) · qué falta, máximo cinco puntos · tres cifras clave · contador de compromiso IWL | Resumen |
| Recorrido | Una sola línea de tiempo: fases del programa, tramos de la hoja de ruta e hitos del Anexo, con los dos carriles (compañía e IWL). El Anexo firmado se abre desde aquí | Hoja de ruta · Programa y Anexo |
| Due diligence | Subpestañas Técnico y General. Arriba, los dos scores con su lectura | Due diligence técnico · Due diligence general |
| Negocio | Subpestañas Business plan · Números · Updates | Business plan · KPI y updates |
| Aportación | Extracto, horas, caja, introducciones y entregables | Aportación de IWL |

**Cabecera compacta, una línea:** nombre · fase · semáforo · score técnico · preparación. A la derecha, un único menú de acciones: editar ficha, generar informe, archivar o dar de baja. Descripción, sector, etapa y perfil pasan al Resumen.

**Fases con los nombres que tienen en la base**, sin numeración. La cuarta no lleva «graduación» (decidido el 2 oct 2026).

## 6. Patrones de pantalla

1. **Apertura de tres líneas** en cada pestaña: qué hay · qué falta · siguiente paso. Si una pantalla no sabe escribir esas tres líneas, le sobra contenido.
2. **Un botón principal por pantalla, siempre arriba a la derecha.** Lo demás va en el menú de acciones. Acciones de fila al pasar el ratón, y visibles siempre en móvil.
3. **El detalle se abre en panel lateral**, sin salir de la página ni desplegar en línea. Un hallazgo, un hito, un documento, una tarea.
4. **Pantalla larga = secciones plegables con índice de anclas.** Abierta por defecto solo la primera.
5. **Tareas y comentarios en panel global**, con contador en la cabecera. Se abre desde cualquier pantalla y filtra por la compañía en la que estás.
6. **Las ediciones se hacen donde se mira.** Editar la ficha, archivar o restablecer una contraseña se hacen desde la compañía o la persona, en panel lateral. Administración queda para configurar el programa y gestionar personas.
7. **Cmd+K:** ir a una compañía, encargar una tarea, registrar horas, enviar el update.
8. **Estado vacío con la acción siguiente**, nunca una tabla vacía.

## 7. Rutas

| Actual | Nueva |
|---|---|
| `/` | `/inicio` según rol |
| `/cartera` · `/comparativa` | `/cartera` · `/cartera?vista=comparativa` |
| `…/ruta` · `…/programa` | `…/recorrido` |
| `…/tecnico` · `…/diligencia` | `…/diligencia/tecnico` · `…/diligencia/general` |
| `…/plan` · `…/kpi` | `…/negocio/plan` · `…/negocio/numeros` · `…/negocio/updates` |
| `…/aportacion` | `…/aportacion` |
| (no existe) | `/tareas` |

`…` vale para `/proyecto` y para `/cartera/[slug]`. Las rutas viejas redirigen a las nuevas.

## 8. Orden de construcción

1. Mapa actual: todas las rutas, qué rol las ve y qué acciones tiene cada una. Se entrega antes de tocar nada.
2. Esqueleto común: barra lateral por rol desde una sola lista, cajón en móvil, cabecera compacta, menú de acciones, panel lateral de detalle.
3. Inicio por rol.
4. Las cinco pestañas con redirecciones. Primero se mueve el contenido sin rediseñarlo.
5. Resumen y Recorrido rehechos con los patrones de la sección 6.
6. Due diligence técnico, Aportación y Negocio, uno a uno.
7. Panel global de tareas y comentarios. Cmd+K.

Cada paso, desplegado y con las suites en verde antes del siguiente.

## 9. Criterios de aceptación

- Ninguna pregunta se contesta en dos pantallas.
- Una fundadora envía su update en dos clics desde Inicio.
- Una tarea vencida aparece en Inicio de su responsable el día que vence.
- Desde cualquier pantalla de una compañía se llega a cualquier otra pestaña en un clic.
- Cada pantalla tiene un solo botón principal y está arriba a la derecha.
- Editar la ficha de una compañía no saca de la compañía.
- La cabecera de la compañía ocupa una línea en escritorio.
- Los dos roles comparten esqueleto; las pruebas e2e lo comprueban en escritorio y móvil.

## 10. Prueba con usuarias

Antes del paso 5 y al terminar el 6: veinte minutos con una fundadora y con una persona del equipo IWL, sin explicarles nada. Cinco encargos: enviar el update · subir un documento que te piden · ver qué te falta para ser invertible · ver qué te ha aportado IWL · responder un comentario. Se anota dónde se para cada una. Eso decide qué se cambia, no la opinión.
