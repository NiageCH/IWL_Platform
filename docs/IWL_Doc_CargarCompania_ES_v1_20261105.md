# Plataforma IWL · cargar una compañía desde cero

Versión 1 · 5 nov 2026 · Inception Woman Lab

> **Sustituida por la versión 2** (`IWL_Doc_CargarCompania_ES_v2_20261110.md`): la compañía ya no nace al firmar el Acuerdo sino al contrafirmar el NDA. Esta se conserva como estaba.

Guía práctica para volver a cargar las compañías reales en producción (https://ride.inceptionwlab.es) y comprobar que el recorrido funciona. Se hace con una cuenta de **Dirección IWL** (`admin_iwl`): la entrada **Administración** de la barra lateral solo la ve ese rol. La nube parte sin compañías salvo la de demostración, «Marea Clínica»; las fases, los KPI, los recorridos y las cohortes ya están cargados por `sembrar:nube`.

El orden importa: **entrada → ficha → equipo → Anexo → hoja de ruta → hitos → KPI**. Cada paso dice dónde se hace, quién puede, y qué hay que ver en pantalla después.

---

## 1. La entrada: embudo o alta directa

Las dos puertas acaban en la misma función de la base (`crear_compania`), que en la misma transacción crea la compañía con **su checklist de due diligence, las nueve secciones del business plan y los KPI que le tocan por perfil tecnológico**. La hoja de ruta solo se crea si se elige un recorrido en ese momento.

**Por el embudo**, cuando la startup pasó de verdad por la convocatoria y se quiere conservar su expediente (lo que mandó, las reuniones, el comité, los documentos del due diligence).

1. **Embudo** → bloque «Dar de alta una candidatura a mano» (si no llegó por `/presentarse`). Pide **Cohorte**, **Startup**, **Persona de contacto**, **Su correo**. Botón **Dar de alta**.
2. Abrir la candidatura. En «Por dónde va», **Pasar a …** avanza un paso; **O moverla a** + **Mover** salta a cualquiera. Los pasos: Presentada, En revisión, Reunión, Comité, Preseleccionada, NDA firmado, Due diligence, Acuerdo propuesto.
3. Al llegar al NDA, en «Qué ve ella», **Darle cuenta para el due diligence**. Crea su cuenta con el correo de contacto, enseña la contraseña **una sola vez** y anula el enlace privado. La cuenta nace con rol **Candidata**.
4. En «El acuerdo», rellenar **Etapa, tras el due diligence** (es el estado de entrada que heredará la compañía; si se deja sin fijar, se usa el que ella declaró), **Equity que se pide (%)** y **Qué aporta IWL**. Botón **Guardar**.
5. Desplegable «Firmar el acuerdo y crear la compañía». Campos: **Dirección web** (es el identificador de la URL, no la web de la startup), **Etapa de inversión**, **Perfil técnico**, **Fase del programa**, **Recorrido**, **Empieza el**, **Acuerdo firmado el**. Botón **Firmar y crear la compañía**.

Quién: equipo y dirección de IWL. Abrir o cerrar la convocatoria («Abrir o cerrar la convocatoria», al pie del embudo) solo la dirección.

Qué comprobar: la ficha de la candidatura muestra el bloque «Firmada» con el enlace **Ver su ficha en la cartera**, y la compañía aparece en **Cartera**. Nombre, sector, frase, web, cohorte y liderazgo femenino se copian de la candidatura.

**No se deshace.** Una candidatura firmada no se descarta, no se mueve y no se le cambia el nombre ni lo acordado: la base lo rechaza con «Esa candidatura ya está firmada. Lo acordado no se reescribe.»

**Alta directa**, para una compañía que ya estaba dentro antes de que existiera el embudo, o cuando no interesa reconstruir su selección.

- **Administración → Compañías y cohortes** → desplegable «Dar de alta una compañía». Obligatorios: **Nombre**, **Identificador** (minúsculas y guiones), **Etapa**, **Estado de entrada**, **Perfil tecnológico**, **Fase del programa**. Opcionales: Sector, Cohorte, Liderazgo femenino, En una frase, Constituida el, Web, **Hoja de ruta** (por defecto «Diseñarla más tarde») y **Arranque de la hoja de ruta**. Botón **Dar de alta**.
- Quién: equipo y dirección de IWL (la base); la pantalla, solo la dirección.
- Qué comprobar: el mensaje «… dada de alta, con su checklist y sus KPI listos» (o «… y su hoja de ruta listos» si se eligió recorrido), y la fila nueva en el bloque «Compañías».

Recomendación para esta prueba: **dejar la hoja de ruta para el paso 5** en las dos puertas. Así se prueba también la pantalla de diseño, que es la que ve una compañía recién creada.

## 2. La ficha

**Administración → Compañías y cohortes**, en la fila de la compañía. Desde la propia compañía se llega con el menú de la cabecera → **Editar la ficha**, que abre el formulario ya desplegado.

- **Editar** → Nombre, Sector, Etapa, Perfil tecnológico, Fase del programa, Cohorte, En una frase, Web, Constituida el, **Liderazgo femenino (%)**. Botón **Guardar**.
- **Entró en**: desplegable del estado de entrada, en la misma fila. Se guarda al cambiarlo, sin botón.
- **Poner un logo** → **Fichero** → **Subir**. PNG, JPEG, WebP o SVG, de 2 MB como máximo.

Quién: IWL. **La etapa, la fase y la cohorte solo las mueve IWL**; si lo intenta otra cuenta, la base responde «La etapa, la fase y la cohorte las fija el equipo de IWL».

Qué comprobar: en la fila, las etiquetas de etapa y perfil, «Fase», «Cohorte» y el logo; en **Cartera**, la tarjeta con su logo.

El **identificador** no se puede cambiar desde ninguna pantalla: hay que acertarlo al crear.

## 3. El equipo: la fundadora y los demás

**Administración → Personas y accesos** → desplegable «Dar de alta a una persona».

- **Correo**, **Nombre**, **Rol en la plataforma** (para ella, «Fundadora · solo su compañía»), Cargo, En qué entra, **Contraseña** (en blanco se genera una), **Compañía** y, al elegirla, **Papel en esa compañía** («Equipo fundador»). Botón **Dar de alta**.
- La contraseña sale en el mensaje **una sola vez**: «Su contraseña es «…»: cópiala y pásasela, no se vuelve a enseñar». El panel se queda abierto hasta que lo cierres.
- Es **temporal**. Ella entra en `/entrar` con su correo y esa contraseña (**Entrar**) y la plataforma la lleva a «Elige tu contraseña»: **Nueva contraseña** (12 caracteres como mínimo, distinta de la que le diste), **Otra vez**, **Guardar y entrar**. Hasta entonces no puede hacer nada más que eso o salir.
- Si se pierde la contraseña: en la fila de la persona, **Poner contraseña** (o **Restablecer contraseña** si ya ha entrado) → **Guardar contraseña**. Vuelve a ser temporal.

Mentoría, revisión de Niage y responsable de IWL, igual, con su rol y papel. Para asignar a alguien que ya existe: en su fila, **Compañía** + **Papel** + **Asignar**, o desde la compañía, «Añadir a alguien al equipo del proyecto» → **Añadir al equipo**. Las horas y la tarifa solo aparecen con un papel de mentoría.

Quién: solo la dirección (crear cuentas usa la clave de servicio y la acción lo comprueba a mano).

Qué comprobar: en **Compañías y cohortes**, bajo la compañía, su nombre con la etiqueta «Equipo fundador». Sin nadie asignado la fila dice «Sin nadie asignado. Nadie de IWL la lleva y su equipo fundador no puede entrar.» Luego, entrar como ella: tiene que caer en **Mi compañía**, no en «sin compañía».

**Si vino por el embudo**, ya tiene cuenta con rol Candidata y **firmar no la convierte en fundadora ni la asigna**. En su fila de Personas, cambiar el rol a «Fundadora · solo su compañía» (se guarda al elegirlo) y asignarla con papel «Equipo fundador». Darla de alta otra vez con el mismo correo también vale: actualiza rol y asignación sin tocar su contraseña.

## 4. El Anexo de Programa

**Cartera → la compañía → pestaña «Programa y Anexo»**.

1. Sin Anexo, el bloque lo dice y ofrece **Abrir el Anexo**. Queda en borrador.
2. Rellenar **Duración (meses)**, **Empieza el**, **Termina el**, **Equity (%)**, **Horas comprometidas**, **Valoradas en (€)**, **Financiación directa (€)**, **Perfiles sénior**, **Otros compromisos**. Botón **Guardar el Anexo**. Se puede guardar cuantas veces haga falta.
3. **Firmar el Anexo** → **Fecha de la firma** → **Firmar**. Sin duración y horas comprometidas no deja firmar.

Quién: equipo y dirección de IWL. La fundadora lo ve, no lo edita.

Qué comprobar: la pastilla pasa de borrador a firmado y desaparece el formulario. Ese cambio es el acuse: firmar no enseña mensaje.

**No se deshace.** Firmado, la base no acepta cambios en horas, dinero, equity ni fecha de firma («Un Anexo firmado no se edita. Firma una versión nueva.»). La acción de abrir una versión nueva existe, pero **la pantalla no ofrece el botón** cuando ya hay uno firmado: hoy no se puede renovar un Anexo desde la plataforma. Los pilares del Anexo tampoco tienen pantalla.

## 5. La hoja de ruta

**Cartera → la compañía → pestaña «Hoja de ruta»**. Desde Administración, el enlace **Diseñarla** de la fila lleva aquí.

- Sin etapas, aparece «Diseñar la hoja de ruta»: **Plantilla de partida** (viene sugerida la de su estado de entrada, marcada «· la de su estado»), **Fecha de arranque**, botón **Crear la hoja de ruta**.
- Las plantillas se copian: a partir de ahí las etapas son de la compañía. Se editan en **Administración → Recorridos** solo para las compañías futuras.
- Cada etapa: **Editar la etapa** (Estado, Nombre, Objetivo, Orden, Empieza, Termina, Horas previstas de IWL, Caja prevista, Notas → **Guardar**) y **Borrar la etapa** → **Borrar**.
- Al pie, «Añadir una etapa» → **Añadir etapa**.

Quién: IWL o la mentora que coordina (papel «Mentoría · coordina el proyecto»).

Qué comprobar: el mensaje «Hoja de ruta creada con N etapas», la cabecera «Hoja de ruta» con «Entró en …» y las etapas en orden con sus fechas encadenadas.

Una compañía con etapas no admite otra plantilla («Esta compañía ya tiene hoja de ruta…»): para empezar de nuevo hay que borrar todas sus etapas. Sus hitos no se borran; se quedan en «Hitos ya acordados».

## 6. Los hitos

Dentro de cada etapa de la **Hoja de ruta**: **Añadir un hito a esta etapa** → **Título**, **Criterio de éxito**, **Fecha prevista**, casilla «Condiciona el estado invertible» → **Añadir hito**. Los que trae la plantilla ya están.

- El estado se cambia con el desplegable del propio hito: Pendiente, En curso, Retrasado y, **solo para IWL**, Cumplido. La base lo exige también: confirmar un hito como cumplido es de IWL o de quien coordina el proyecto. La fundadora no puede darse sus hitos por cumplidos.
- Un hito puesto en la etapa equivocada se mueve con su desplegable de etapa (solo IWL).
- **No hay pantalla para editar el título, el criterio o la fecha de un hito, ni para borrarlo.** Conviene escribirlos bien a la primera.

Qué comprobar: el hito en su etapa con su fecha y su estado, y el contador de cumplidos en «Programa y Anexo» → «Hitos».

## 7. Los KPI

**Cartera → la compañía → pestaña «KPI y updates»**. La fundadora lo ve en **Mi compañía** con las mismas pestañas.

- La lista de KPI la fijó el alta según el perfil tecnológico. Cambiar el perfil después **no añade ni quita KPI**, y no hay pantalla para hacerlo a mano.
- Sin valores, el bloque «Cargar los KPI del mes» (Primer mes): **Mes** y un campo por KPI → **Guardar los valores del mes**. El primero fija la línea de partida.
- Después, cada mes: «Cargar los KPI del mes» y «Update mensual» (**Logros del mes**, **Bloqueos**, **Qué pides a IWL**, **Estado** → **Guardar update**). Un mes ya cargado se corrige con **Corregir**, que pide **Por qué cambia**.
- **Revisado por IWL** solo aparece para IWL. Revisado, la fundadora ya no puede cambiar los valores de ese mes («Ese mes ya lo revisó IWL. Pídeles que lo reabran…») hasta que IWL lo reabra.

Quién: IWL, la mentora que coordina y la fundadora asignada con papel «Equipo fundador».

**Objetivos de KPI: no hay pantalla para esto todavía.** La columna del objetivo mensual existe y los gráficos la pintan si tiene valor, pero ninguna acción la escribe.

Qué comprobar: tras guardar, el histórico de meses y los gráficos con el primer punto; el runway, el crecimiento y la conversión aparecen calculados solos cuando hay datos para ello.

---

## Si algo no cuadra

- **La fundadora entra y ve «sin compañía».** Tiene rol de fundadora pero no está asignada, o lo está con otro papel. Escribir en su compañía exige el papel «Equipo fundador».
- **La candidata firmó y sigue viendo su candidatura.** Firmar no cambia su rol ni la asigna: hay que hacerlo en Personas (paso 3).
- **«Hoja de ruta» dice que todavía no hay.** Es lo normal en una compañía nueva: IWL ve debajo «Diseñar la hoja de ruta»; la fundadora solo ve el aviso. Si a IWL no le sale el formulario, es que no hay recorridos cargados (Administración → Recorridos).
- **«Firmar el acuerdo» falla por el identificador.** El campo «Dirección web» de ese formulario es el identificador de la URL, en minúsculas y con guiones, no la web de la startup.
- **El Anexo se firmó con un dato mal.** No se corrige y hoy no hay botón para abrir una versión nueva. Revisar las cifras antes de pulsar **Firmar**.
