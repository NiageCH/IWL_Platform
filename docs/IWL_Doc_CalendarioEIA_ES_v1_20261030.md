# Plataforma IWL · calendario e inteligencia artificial

Versión 1 · 30 oct 2026 · Inception Woman Lab

Dos integraciones para producción: Google Calendar, para que las sesiones se agenden y se celebren sin salir de la plataforma, y Claude, para que la plataforma trabaje por detrás. Hoy no existe ninguna de las dos, ni tampoco una tabla de sesiones de mentoría: solo la de sesiones de revisión técnica.

---

## Parte 1 · Calendario

### Cómo funciona

**Fase A · Sin pedir permisos a nadie.** Una cuenta organizadora de IWL en Google Workspace crea las sesiones con su videollamada de Meet e invita a fundadora, mentor y equipo IWL. La invitación llega a cualquier calendario: Google, Outlook o iCloud. Nadie tiene que conectar nada.

- **Sesión** nueva desde la compañía o desde «Qué te toca»: tipo, pilar, asistentes, fecha y duración. La plataforma crea el evento con Meet, guarda el enlace y lo enseña en la sesión.
- Mover o cancelar en la plataforma mueve o cancela el evento.
- Tras la sesión, la plataforma pide el acta: acuerdos, siguientes pasos y horas. Las horas van al registro de aportación sin escribirlas dos veces.
- **Fechas de la plataforma en tu calendario.** Cada persona tiene un enlace de suscripción privado (formato iCal) con sus fechas: hitos, pasos, update del mes y vencimientos de due diligence. Se añade una vez y se actualiza solo. Revocable desde Mi cuenta.

**Fase B · Disponibilidad.** Quien quiera conecta su Google Calendar con OAuth, con permiso de solo lectura de ocupado/libre. Con eso la plataforma propone huecos comunes al crear una sesión y la fundadora puede reservar con su mentor en los huecos que este abre. Se escribe en su calendario solo si lo autoriza aparte.

Fase A primero: resuelve agendar y videollamada desde el primer día, sin depender de la verificación de Google. La fase B pide permisos de calendario a cuentas de fuera de vuestro dominio (las fundadoras usan Gmail), y eso exige que Google verifique la aplicación. Se solicita en cuanto empiece la fase A, porque tarda.

### Datos

`sesiones` (compañía, tipo, pilar, inicio, fin, estado, enlace Meet, id del evento en Google, organizador) · `sesion_asistentes` (persona, rol, respuesta) · `sesion_actas` (acuerdos, siguientes pasos, evidencia) · `calendario_suscripciones` (persona, token, revocada) · `calendario_conexiones` (fase B: persona, proveedor, permisos, token cifrado).

Las horas del acta crean líneas en `contribution_hours` enlazadas a la sesión. Los siguientes pasos crean tareas o pasos de hito.

## Parte 2 · Claude en la plataforma

### Principios

1. **Claude propone, una persona valida.** Todo lo que genera entra como «Para revisar» con la marca «Propuesto por IA». Nada se valida solo.
2. **Ve lo mismo que quien lo pide.** El contexto se arma con la sesión del usuario, así que RLS decide qué llega al modelo. Un mentor secundario no puede pedir nada que incluya aportación o hallazgos técnicos.
3. **Cita de dónde sale.** Cada afirmación enlaza al documento, KPI o hito que la sostiene. Sin fuente, no se muestra.
4. **Solo en servidor.** La clave de la API vive en las variables del servidor; el navegador nunca habla con Claude.
5. **Todo queda registrado:** quién lo pidió, sobre qué compañía, qué modelo, coste y resultado. Límite de gasto mensual configurable.

### Qué hace, por orden de valor

| # | Función | Dónde se ve |
|---|---|---|
| 1 | **Precargar el business plan** a partir del pitch, one-pager y documentos de la candidatura | Primera entrada de la fundadora |
| 2 | **Acta de sesión** a partir de las notas del mentor: acuerdos, pasos y responsables | Al cerrar una sesión |
| 3 | **Resumen del update mensual** y lo que no cuadra entre business plan, KPI y hitos | Inicio de IWL y del mentor |
| 4 | **Por qué flojea** un área, y qué perfil de mentor la cubre | «Dónde flojean» y «Qué perfil falta» |
| 5 | **Lectura del análisis técnico**: propone hallazgos a partir del informe del análisis de código | Due diligence técnico, para el revisor de Niage |
| 6 | **Pregúntale al proyecto**: preguntas en lenguaje natural sobre los datos de la compañía, con respuesta guardable como tarea | Panel lateral, en cada compañía |

Se construyen en ese orden y de uno en uno. El 1 va junto al inicio de la fundadora.

### Cómo se monta

- `lib/ia/`: una función por tarea, cada una con su instrucción, su esquema de salida validado con Zod y sus pruebas con casos fijos de la demostración.
- Lo largo (leer varios documentos, analizar un informe) va a la cola de trabajos que ya usa el worker. Lo corto (preguntar al proyecto) responde en directo.
- Modelo configurable por tarea en la configuración del programa, para usar uno más ligero en lo simple.
- Tabla `ia_peticiones`: usuario, compañía, tarea, modelo, tokens, coste, estado, resultado y si se aceptó. Sirve para auditar y para saber qué funciones se usan.
- Interruptor por compañía: si una compañía no lo autoriza, la IA no toca sus datos.

### Lo legal antes de producción

- Anthropic pasa a ser encargado del tratamiento de datos de las compañías. Hace falta su acuerdo de tratamiento de datos firmado con la cuenta de empresa, y revisar en el contrato la retención de datos y la región de tratamiento.
- Una cláusula en el Acuerdo de Incorporación y en la política de privacidad que diga que la plataforma usa IA para resumir y proponer, que una persona valida, y que la compañía puede desactivarlo.
- Sin eso, el interruptor de cada compañía nace apagado.

## Criterios de aceptación

- Crear una sesión envía la invitación con Meet a todos los asistentes, sin que nadie conecte su calendario.
- Mover la sesión en la plataforma la mueve en el calendario de todos.
- La suscripción iCal de una fundadora muestra sus hitos y el update del mes, y deja de funcionar al revocarla.
- El acta de una sesión crea las horas y las tareas sin reescribirlas.
- Nada generado por Claude aparece como validado.
- Una petición de un mentor secundario no incluye datos de aportación ni hallazgos técnicos; lo comprueba una prueba.
- Con el interruptor apagado, ninguna función de IA se ejecuta sobre esa compañía.
