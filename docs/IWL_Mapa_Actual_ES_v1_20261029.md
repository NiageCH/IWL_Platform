# Mapa actual · rutas, roles y acciones

Paso 1 de `IWL_Doc_NavegacionUX_ES_v1_20261029.md` · 29 oct 2026

Extraído del código, no de memoria: los guardas salen de cada `page.tsx` y de
los layouts de grupo, las acciones de `lib/acciones/`, y quién alcanza cada
una de qué componente la importa.

---

## 1. Roles y dónde aterriza cada uno

Seis roles en `app_role`. La raíz `/` reparte según el rol.

| Rol | Aterriza en | Alcance |
|---|---|---|
| `admin_iwl` | `/cartera` | Todo, incluida la configuración del programa |
| `equipo_iwl` | `/cartera` | Toda la cartera; `/admin` le rebota a `/cartera` |
| `revisor_niage` | `/cartera` | Solo las compañías donde está asignado |
| `fundadora` | `/proyecto` | Solo su compañía |
| `mentor` | `/proyecto` | Las compañías donde está asignado |
| `lector_externo` | `/proyecto` o `/sin-compania` | Sin uso real todavía |
| `candidata` | `/candidatura` | Su candidatura y lo que se le pide |

**Quién es «IWL»**: `esIwl()` solo cubre `admin_iwl` y `equipo_iwl`. Un
revisor de Niage **no** es IWL para la interfaz, aunque sí entra en la
cartera por una excepción explícita en `/cartera` y `/comparativa`.

**Cómo se protege cada grupo:**

- `/admin/*` — layout del grupo: `admin_iwl` o rebota a `/cartera`.
- `/cartera`, `/comparativa` — guarda en la propia página.
- `/cartera/[slug]/*` — **sin guarda de rol**. Lo resuelve
  `companiaPorSlug()`: si RLS no devuelve filas, redirige a `/cartera`.
- `/proyecto/*` — **sin guarda de rol**. Lo resuelve
  `companiaDeLaPersona()`: busca la primera fila de `company_members` de esa
  persona. Sin fila, `/sin-compania`.

## 2. Rutas

### Sin sesión (el proxy las deja pasar por nombre)

| Ruta | Quién | Qué hace |
|---|---|---|
| `/entrar` | cualquiera | Contraseña o enlace por correo |
| `/presentarse` | cualquiera | Formulario público de candidatura |
| `/candidatura/[token]` | quien tenga el testigo | Ver su candidatura, completar ficha, añadir material |
| `/auth/confirmar` | — | Canjea el enlace de correo |
| `/auth/sesion` | — | Fija la sesión y redirige |

### Con sesión, comunes

| Ruta | Quién | Qué hace |
|---|---|---|
| `/` | cualquiera | Redirige por rol |
| `/perfil` | cualquiera | Cambiar la propia contraseña |
| `/sin-compania` | sin compañía | Explica a quién pedir acceso |
| `/candidatura` | `candidata` | Su estado y la sala de documentos |
| `/informe/[tipo]/[slug]` | quien pueda leer esa compañía | Tres tipos: `tecnico-inversor`, `mensual`, `aportacion`. Pensada para imprimir |

### La compañía · ocho pestañas, dos direcciones

El mismo contenido con dos prefijos: `/proyecto` (fundadora y mentor) y
`/cartera/[slug]` (IWL y revisor).

| Pestaña | Sufijo | Vista | Acciones que ofrece |
|---|---|---|---|
| Resumen | *(ninguno)* | `vistas/resumen` | Congelar línea base · tareas: crear, reasignar, cambiar estado |
| Hoja de ruta | `/ruta` | `vistas/ruta` | Diseñar hoja de ruta · crear, editar y borrar etapa · crear y mover hito · fijar estado de entrada · registrar y borrar avance · registrar aportación |
| Programa y Anexo | `/programa` | `vistas/programa` | Abrir, guardar y firmar Anexo · cambiar estado de hito · registrar horas · objetar |
| Aportación de IWL | `/aportacion` | `vistas/aportacion` | Registrar aportación |
| Due diligence técnico | `/tecnico` | `vistas/tecnico` | Abrir y publicar evaluación · puntuar dimensión · registrar y cerrar hallazgo · crear y mover punto de plan · responder cuestionario |
| Due diligence general | `/diligencia` | `vistas/diligencia` | Cambiar estado de punto · subir documento desde la línea · subir al data room · abrir documento |
| Business plan | `/plan` | `vistas/plan` | Guardar sección · comentar · adjuntar el business plan |
| KPI y updates | `/kpi` | `vistas/kpi` | Guardar los valores del mes · guardar update |

### Solo IWL

| Ruta | Quién | Qué hace |
|---|---|---|
| `/cartera` | IWL + revisor | Lista de la cohorte, scorecards, siguientes pasos, logos |
| `/comparativa` | IWL + revisor | Tres gráficos y la tabla de cifras |
| `/embudo` | IWL | Recorrido, candidaturas, firmadas, descartadas · alta a mano · abrir y cerrar convocatoria |
| `/embudo/[id]` | IWL | Mover, descartar, reabrir · acuerdo y equity · firmar · enlaces · eventos · dar acceso · pedir y abrir documentos · corregir datos |

### Solo dirección (`admin_iwl`)

| Ruta | Qué configura |
|---|---|
| `/admin` | Índice |
| `/admin/companias` | Alta, edición, logo, archivar, borrar, cohortes, objetivos, equipo |
| `/admin/personas` | Alta, edición, rol, asignaciones, correo, contraseña, archivar, borrar |
| `/admin/personas/[id]` | Ficha de una persona, CV |
| `/admin/evaluacion` | Pesos de dimensión y área, objetivos por etapa |
| `/admin/programa` | Umbrales, bandas, tarifas, pesos de madurez, objetivos de tracción |
| `/admin/rutas` | Plantillas de hoja de ruta |

## 3. Acciones

**91 Server Actions en doce módulos.** Repartidas así:

| Módulo | N.º | Dónde se llaman |
|---|---|---|
| `admin` | 30 | `/admin/*` y los dos enlaces desde la cabecera de una compañía |
| `candidaturas` | 15 | `/embudo` y `/embudo/[id]` |
| `ruta` | 14 | `/…/ruta` y `/admin/rutas` |
| `tecnico` | 8 | `/…/tecnico` |
| `programa` | 7 | `/…/programa` |
| `kpi` | 3 | `/…/kpi` |
| `presentarse` | 3 | `/presentarse` y `/candidatura/[token]` |
| `tareas` | 3 | `/…` (Resumen) |
| `plan` | 3 | `/…/plan` |
| `diligencia` | 2 | `/…/diligencia` |
| `documentos` | 2 | `/…/diligencia` y `/…/plan` |
| `linea-base` | 1 | `/…` (Resumen) |

### Cinco acciones sin punto de entrada

La familia «existe y no tiene botón», que ya ha costado cuatro hallazgos.
Quedan estas:

| Acción | Qué haría | Dónde faltaría |
|---|---|---|
| `registrarHallazgoGeneral` | Registrar un hallazgo del DD general | `/…/diligencia` |
| `guardarHipotesis` | Añadir o editar una hipótesis del business plan | `/…/plan` |
| `guardarValorKpi` | Corregir un KPI suelto | `/…/kpi` |
| `actualizarIntroduccion` | Apuntar una introducción del Anexo | `/…/programa` |
| `contenidoCompania` | *(lectura auxiliar, no es un botón)* | — |

## 4. Lo que el mapa confirma del diagnóstico

1. **Ocho pestañas por compañía**, definidas a mano en
   `cabecera-proyecto.tsx`, y con el prefijo duplicado para los dos roles.
2. **«¿Por dónde vamos?» se contesta en tres sitios**: el bloque «Por dónde
   va» del Resumen, las fases y hitos de Programa, y las etapas de Hoja de
   ruta. Las tres leen los mismos datos.
3. **Dos menús a mano**: `barra-lateral.tsx` (IWL) y `barra-superior.tsx`
   (fundadora) repiten la misma lista de entradas en dos ficheros.
4. **No hay `/inicio`**: la raíz redirige a una lista, no a una agenda.
5. **No hay `/tareas`**: el módulo existe desde esta semana y solo se ve
   dentro de una compañía. Una tarea vencida no aparece en ninguna parte
   donde su responsable la vaya a ver.
6. **Lo que se hace sobre una compañía vive en Administración**: editar,
   archivar y dar de baja son dos enlaces en la cabecera que sacan de la
   compañía.

## 5. Tres cosas del documento que chocan con el código

Hay que decidirlas antes del paso 2.

**a) El nombre de la cuarta fase.** El documento dice «Cierre y graduación»
(§5). El 2 de octubre se cambió a «Fin del programa» por petición expresa
—«quita lo de graduación»— y así está en la base y en una migración. O se
revierte, o el documento se corrige.

**b) «Tareas» como entrada de la fundadora.** El documento se la da (§3).
Hoy una fundadora solo puede crear tareas a su propio nombre: asignar a
otra persona es de IWL o de quien coordina, y lo impone un disparador. La
entrada tiene sentido para ver las suyas, pero no para repartir trabajo.

**c) Quién entra por `/proyecto`.** El documento habla de dos roles, IWL y
fundadora. En el código son cuatro: un mentor y un revisor asignados a una
compañía también caen en `/proyecto`, y ven la vista de fundadora. Si el
esqueleto se define «por rol», hay que decir qué ve un mentor.
