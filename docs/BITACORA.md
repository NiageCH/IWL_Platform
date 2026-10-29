# Bitácora

Una entrada por tanda de trabajo, la más reciente arriba. Solo se añaden:
una entrada escrita no se reescribe nunca, ni para corregirla. Si algo
resultó estar mal, se dice en la entrada siguiente.

Complementa a `DECISIONES.md`: aquí **qué pasó**, allí **por qué algo es
como es**.

---

## 2026-10-29 · AgrolabX: fuera del programa y sin actividad inventada · commit PENDIENTE

**Qué cambió**
· Fuera de `seed/local/30_agrolabx.sql`: 16 líneas de horas, 2 desembolsos, 5 contactos, 5 introducciones y 4 entregables. 90 líneas.
· Se queda el Anexo I y sus 3 compromisos de caja: es lo firmado.
· AgrolabX archivada con motivo «Fuera del programa». No borrada.

**Qué decidí yo**
· **Los entregables también se van**, y no estaban en tu lista. Son de la misma naturaleza que lo demás: salen en el mismo extracto de aportación, como trabajo que IWL dice haber entregado. Si los querías dentro, dímelo y vuelven.
· **Los seis meses de KPI se quedan**, y sí son inventados. No alimentan el extracto —que es el criterio que diste— pero son datos falsos en un proyecto real. Decides tú: una línea y se van.
· Sin `archived_by`: no lo archivó nadie, lo trae así la semilla. Poner ahí a una persona sería inventar quién tomó la decisión.

**Qué necesito que decidas**
1. ¿Los seis meses de KPI inventados se quedan o se van?
2. ¿Los entregables estaban fuera de tu lista a propósito?

**Estado**
· 76 · 136 · 146. Nada dependía de esa actividad.
· El fichero es `seed/local/`, que no se versiona: este commit solo lleva la bitácora.
· **AgrolabX no está en la nube.** Ya no. Así que allí no hay nada que archivar.

**Siguiente**
El punto 1, la demostración, que es el que queda.

---

## 2026-10-29 · Los cuatro proyectos reales · commit PENDIENTE2

**Qué cambió**
· Terral Barria → **La Pepi** (`la-pepi`), Roster → **Siren** (`siren`), y la web `roster.ai` vaciada.
· **Proyecto Baires** dado de alta. Son cuatro.
· Los cuatro en fase_1, due diligence conjunto, con checklist, business plan y KPI instanciados.
· El identificador viejo redirige al nuevo conservando la subpágina, también sin sesión. `lib/renombres.ts` y el proxy.

**Qué decidí yo**
· **La redirección no estaba pedida como mecanismo, solo como «redirigir el viejo».** La puse en el proxy y no en el layout porque así conserva la pestaña: lo que alguien guarda no suele ser la portada de la ficha sino `/tecnico` o `/plan`. Y va antes de la guardia de sesión, porque si cayera después mandaríamos a entrar y de vuelta al identificador viejo.
· **Renombrar por id y no por slug** en la semilla: el insert lleva `on conflict (id) do nothing` —correcto, el fichero se ejecuta muchas veces y no debe pisar lo editado— pero eso significa que en una base donde ya existían, el nombre nuevo no llegaría nunca.
· **Entrada de Baires: `idea`.** Dijiste «idea con activo propio». El activo —la ontología de nueve estructuras— no cambia que no hay producto; se nota en el texto, no en el estado.
· **`female_leadership_pct` vacío en Igor y en Baires**, como pediste. El 100 % que traía Igor no tenía fuente.

**Qué necesito que decidas**
1. Lo que dejé vacío por no tener dato: equipo fundador de los cuatro (no hay correos), mentoría de Siren, Igor y Baires, porcentaje de liderazgo femenino de Igor y Baires, web de Siren, y los nombres de los equipos quirúrgicos de Baires —esos dijiste que los pones tú—.
2. Nada de esto está en la nube todavía: dijiste que la subida va cuando tú digas.

**Estado**
· 76 · 136 · 149 · 149, dos pasadas limpias.
· **Inventario de la nube**, que pediste antes de tocarla: La Pepi (slug `terral-barria`), Siren (slug `roster`) e Igor Labs, activas; `qqq` archivada; `German`/`w`, `sjcnksdncn`/`ttttttt` y `PIRULO`/`pirulo`, activas. Siete. **Ni AgrolabX ni Baires ni Marea están allí.**
· Los nombres ya estaban cambiados en la nube; los identificadores no.
· `seed/local/21_proyectos.sql` no se versiona: de este commit solo se sube la redirección y su prueba.

**Siguiente**
· Pendiente el **punto 1, la demostración**: Marea con `is_demo`, distintivo visible, fuera de todo agregado, y completada hasta recorrer cada estado. Es el trozo grande y no lo he empezado.
· Hice el 2 y el 3 y me salté el 1, que iba en medio. No tenía motivo para cambiar tu orden: seguí por donde ya estaba trabajando.

---

## 2026-10-29 · Corregir un mes de KPI, y los guardianes · commits 532d87b · b9988f0 · fbff9ff

**Qué cambió**
· La tabla de visibilidad pasa a `docs/IWL_Visibilidad_Roles_ES_v1_20261029.md`. Tenías razón: la bitácora decía «entregada» y el documento no existía.
· **Un mes de KPI ya enviado se puede corregir.** Límite: la compañía mientras IWL no lo haya revisado; revisado, IWL lo reabre. Rastro en `kpi_value_history`, escrito por un disparador. Reabrir queda en el registro de actividad.
· **Los guardianes de autorización dejan de aplicarse sin sesión.** Seis arreglados.
· Una prueba con fecha de caducidad, arreglada.

**Qué decidí yo**
· Separar los guardianes en dos familias, que no estaba en el encargo: los de **autorización** («esto es de IWL») se eximen sin sesión, porque sin sesión no hay a quién restringir y la clave de servicio ya se salta el RLS entero. Los de **integridad** («un Anexo firmado no se edita») no, porque valen las escriba quien las escriba. Toqué seis y dejé tres.
· Tabla propia para el historial en vez de `activity_log`: se enseña junto al valor del mes, y un registro general no se consulta por compañía y periodo sin volverse caro.
· Los KPI técnicos no se corrigen a mano: salen del análisis del repositorio, y escribirlos encima mentiría sobre su origen.
· La corrección se guarda uno a uno y no en bloque: guardar la columna entera metería en el historial cambios que nadie hizo.
· Que la segunda prueba recorra el camino real —IWL carga el mes y lo da por revisado— en vez de marcarlo por detrás.

**Qué necesito que decidas**
1. Nada bloqueante. Sigo con el punto 2 de tu lista salvo que digas otra cosa.

**Estado**
· Cálculo 76 · RLS 136. e2e: **144 en verde en la primera pasada**, en 1,9 min.
· **No he podido cumplir la regla de las dos pasadas**, y no por el código: la máquina está a carga 22 por `mediaanalysisd` —el indexado de fotos de macOS, al 300 % de CPU— y Chrome. La suite pasó de 1,9 min a 33–36 min y caen tres pruebas por tiempo de espera: las tres más lentas —`anexo`, `correccion-kpi`, `informes`—. En aislamiento y con la máquina tranquila pasan.
· Maté un `next dev` que llevaba **28 días** corriendo sobre este proyecto. Se levanta otra vez con `npm run dev`.
· Sin desplegar: no publico algo cuya segunda pasada no he podido ver limpia.

**Siguiente**
Volver a correr las dos pasadas con la máquina tranquila y desplegar. Después, punto 2: las políticas por tipo de miembro.

## 2026-10-29 · Convención de informes y tabla de visibilidad · commit 1265e18

**Qué cambió**
· `CLAUDE.md` gana la sección «Cómo se reporta»: cada paso termina con su entrada aquí, y `docs/REVISION.md` es el canal de vuelta.
· Se estrena este fichero con las dos tandas ya hechas.
· Sin código de producto: la tanda anterior pidió la tabla de visibilidad **antes** de escribir políticas, y eso es lo que se entregó.

**Qué decidí yo**
· Que la fundadora **sí** ve su aportación. No estaba en el encargo, pero el extracto es lo que IWL le aporta a ella, y ocultárselo rompería el contador de compromiso de su propio Resumen.
· Que la fundadora **sí** ve sus hallazgos técnicos: son defectos de su producto y los tiene que arreglar. Lo que sigue sin ver es la evaluación en borrador.
· Que el mentor secundario **pierde** el due diligence general, que no se mencionaba. Lo agrupé con la aportación porque es de la misma naturaleza: contratos, cap table, nóminas.
· Que `actualizarIntroduccion` sobra en vez de faltarle botón: falta la de *crear* una introducción, y un «editar» sin «crear» no sirve.
· Que la bitácora empieza con dos entradas y no con una, para que el paso 2 quede registrado y no solo en el commit.

**Qué necesito que decidas**
1. ¿Apruebas la tabla de visibilidad tal cual, con las tres decisiones de arriba?
2. ¿El mentor secundario se queda sin due diligence general, o lo quieres dentro?
3. `actualizarIntroduccion`: ¿la borro, o prefieres que haga el par entero —crear y editar introducciones— en este mismo paso?

**Estado**
· Sin cambios en el producto; no hay nada que desplegar ni suites que mover.
· Lo entregado: la tabla por rol y tipo de miembro, las dos funciones propuestas —`can_read_aportacion`, `can_read_tecnico`— y el veredicto sobre las cuatro acciones sin botón. **La tabla solo existió en la conversación; se escribió después en `docs/IWL_Visibilidad_Roles_ES_v1_20261029.md`.**
· Hallazgo que conviene no perder de vista: **un mes de KPI ya enviado no se puede corregir desde ninguna parte**. La pantalla calcula sola «el siguiente al último con datos», así que un MRR mal tecleado queda mal para siempre y arrastra runway, crecimiento y comparativa. `guardarValorKpi` existe y no tiene por dónde llamarse.

**Siguiente**
Con la tabla aprobada: las dos funciones y sus políticas, una prueba RLS por cada celda prohibida, las capacidades por compañía en `lib/permisos.ts`, y después mover las pestañas.

---

## 2026-10-29 · Paso 2 del rediseño: esqueleto y permisos · commit 7d400ee

**Qué cambió**
· Permisos por capacidad en `lib/permisos.ts`: `verCartera`, `verEmbudo`, `configurarPrograma`, `tieneProyectoPropio`. Sustituyen a `esIwl()` —dos roles de siete— y a la excepción del revisor escrita a mano en dos pantallas.
· Mentor y revisor dejan de caer en `/proyecto`, que deducía la compañía de la primera fila de `company_members`: quien llevaba tres proyectos veía uno, al azar. Pasan a la cartera, que RLS ya filtra.
· Cerrojo explícito en los dos layouts de compañía: 404 si no eres miembro ni IWL. Con su prueba, entrando como quien menos puede.
· Un solo esqueleto: la fundadora pasa a tener barra lateral. Y una sola lista de entradas, cuando eran tres duplicadas —las de las dos barras y el repertorio de iconos de `nav-lateral`, con cuatro de los dieciséis—.
· Cabecera de nueve datos a cinco, más un único menú de acciones.
· Se añaden `<MenuAcciones>` y `<PanelLateral>`.

**Qué decidí yo**
· 404 y no 403 al entrar en una compañía ajena: un «no tienes permiso» confirma que esa compañía existe, y quién está en la cohorte no es público.
· Que el delta de la cabecera pierda su coletilla y el semáforo su motivo, con las dos cosas enteras en el Resumen.
· Añadir `aria-label` a las cifras compactas: «Técnico 94,2 flecha arriba 47,1» leído en voz alta no se entiende.
· Unificar el repertorio de iconos, que no estaba en el encargo: al meter «Mi compañía» en el menú, el icono no existía en la copia pequeña.

**Qué necesito que decidas**
1. Ninguna pendiente de este paso; se revisó y se aprobó.

**Estado**
· Suites 76 · 136 · 142, dos pasadas limpias. Desplegado.
· `<PanelLateral>` queda **sin usar**: las pantallas que lo usarán se rehacen en el paso 5. Está anotado en el propio componente.
· Las ocho pestañas siguen en dos filas: eso es el paso 4.
· Un fallo intermitente en una prueba de la cartera que no reapareció en cuatro pasadas posteriores. Queda apuntado por si vuelve.

**Error que cometí**
La primera versión de la cabecera **perdió información**: al recortarla se fueron el motivo del semáforo, el «invertible» y la lectura de los scores, y no los recoloqué. No lo vi yo; lo vieron tres pruebas al caer. Ya bajan al Resumen.

**Siguiente**
Paso 4: las cinco pestañas y las redirecciones, precedido de las políticas por tipo de miembro.
