# Plataforma IWL · inicio del mentor y edición con evidencia

Versión 1 · 30 oct 2026 · Inception Woman Lab

Dos piezas que van juntas: el tablero del mentor y la regla de que todo cambio que importa lleva su documento. Complementa a `IWL_Doc_InicioFundadora_ES_v1_20261030.md` y respeta lo decidido en `015 · Qué puede hacer cada mentor` y en la tabla de visibilidad.

---

## 1. El inicio del mentor

En diez segundos: **qué proyectos llevo, cómo van, dónde flojean y qué hago yo esta semana para que avancen.**

```
┌─────────────────────────────────────────────────────────────────┐
│ MIS PROYECTOS                                                    │
│ Siren      Producto · tramo 2/5   ● En plazo    Hito 15 nov      │
│ La Pepi    Diagnóstico · 1/4      ● Atención    Hito vencido     │
├─────────────────────────────────────────────────────────────────┤
│ QUÉ TE TOCA ESTA SEMANA                                          │
│ 1  Sesión con La Pepi: modelo de talleres     4 nov   [Preparar] │
│ 2  Revisar el guion de venta de Siren          vence 6 [Revisar] │
│ 3  Cerrar acta de la sesión del 28 oct         pendiente [Acta]  │
├─────────────────────────────────────────────────────────────────┤
│ DÓNDE FLOJEAN                                                    │
│ Siren    Comercial  · sin cliente de pago, objetivo 1 en dic     │
│          Legal      · cesión de código sin firmar                │
│ La Pepi  Finanzas   · sin modelo económico de talleres           │
├─────────────────────────────────────────────────────────────────┤
│ QUÉ PERFIL FALTA                                                 │
│ Siren · Legal de software      En la red: 1 persona   [Proponer] │
│ La Pepi · Finanzas de marketplace   En la red: nadie  [Buscar]   │
└─────────────────────────────────────────────────────────────────┘
```

**Mis proyectos.** Una fila por compañía asignada: tramo actual, semáforo con su motivo y próximo hito con fecha. Un clic abre la compañía.

**Qué te toca esta semana.** Máximo tres acciones, de todos sus proyectos: sesiones próximas, pasos de hito asignados a él, revisiones pedidas, actas sin cerrar, comentarios sin responder.

**Dónde flojean.** Las áreas más débiles de cada proyecto, como máximo tres, cada una con el dato que lo dice y su objetivo. Salen de:
· distancia al objetivo de la etapa en el due diligence técnico (solo si su tipo de miembro lo puede ver)
· áreas del due diligence general con puntos bloqueantes o pendientes
· hitos retrasados y pasos vencidos
· KPI por debajo del objetivo del Anexo

**Qué perfil falta.** Para cada área débil sin nadie asignado que la cubra, la plataforma dice qué perfil hace falta y si existe en la red: cruza el área débil con las áreas de los perfiles de mentores (`profiles.areas`). Si hay alguien, «Proponer» crea una petición a IWL para asignarlo. Si no hay nadie, «Buscar» deja anotado el perfil que falta en una lista de búsqueda que ve IWL.

La correspondencia entre área débil y perfil de mentor es configuración del programa, no código.

## 2. Qué puede hacer cada tipo de mentor

Sin cambios sobre lo decidido.

| | Mentor principal | Mentor secundario |
|---|---|---|
| Ve | Todo el proyecto, como IWL | Resumen, Recorrido y Negocio. Sin aportación ni hallazgos técnicos |
| «Dónde flojean» incluye técnico | Sí | No |
| Edita y sube documentos | Sí | Sí, en sesiones, pasos asignados y comentarios |
| Confirma hitos y puntúa | Sí, en sus proyectos | No |
| Propone mentores | Sí | Sí |

## 3. Editar con evidencia

**Todo cambio que importa lleva su documento, de los dos lados.** Texto solo vale para lo que no afirma nada.

Componente único, `<Evidencia>`, en todos los sitios donde se cambia algo que importa: subir un archivo, enlazar uno ya existente del data room o pegar un enlace, con una línea de qué demuestra. Lo subido entra en el data room en su carpeta, versionado, y queda enlazado al cambio que justifica.

| Cambio | Evidencia |
|---|---|
| Hito a cumplido | **Obligatoria.** Sin documento no se puede marcar |
| Paso de un hito hecho | Recomendada |
| Sección del business plan editada | Recomendada; obligatoria para pasar a «validada» |
| KPI corregido | Obligatoria: el motivo y, si existe, el soporte |
| Punto del due diligence entregado | Obligatoria: es el documento |
| Acta de sesión | Opcional: material de la sesión |
| Hallazgo técnico resuelto | Obligatoria |

Reglas:
· Se reutiliza `evidence_links`, ampliado para colgar de hitos, pasos, sesiones, KPI y hallazgos, no solo de hipótesis y secciones.
· Cada cambio guarda quién, cuándo, qué cambió y con qué evidencia. Se ve en el historial del elemento.
· Nadie valida su propio cambio: la fundadora carga y aporta evidencia, IWL o el mentor principal valida. El mentor principal no valida un cambio que haya hecho él.
· En móvil se puede subir una foto o un archivo desde la cámara o el teléfono.

## 4. Lo que hay que añadir

- Tablero `/inicio` para mentor con los cuatro bloques.
- Cálculo de «dónde flojean» en `lib/scoring/`, puro y probado.
- Tabla de correspondencia área débil → perfil de mentor, en configuración.
- Lista de perfiles buscados, visible para IWL en su inicio.
- Petición «Proponer mentor», que llega a IWL como tarea.
- `<Evidencia>` y la ampliación de `evidence_links`.
- Evidencia obligatoria donde lo dice la tabla del punto 3, comprobada en la base, no solo en pantalla.

## 5. Criterios de aceptación

- `rev-mentor1` y `rev-mentor2` ven su tablero con la demostración, y el secundario no ve nada técnico ni de aportación.
- Cada área débil muestra el dato que la justifica y su objetivo.
- Un área débil sin mentor que la cubra aparece en «Qué perfil falta», con la red consultada.
- Un hito no pasa a cumplido sin evidencia, tampoco por la API.
- Un documento subido como evidencia aparece en el data room, en su carpeta y con su versión.
- El historial de un hito dice quién lo cerró, cuándo y con qué documento.
