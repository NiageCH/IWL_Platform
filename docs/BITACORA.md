# Bitácora

Una entrada por tanda de trabajo, la más reciente arriba. Solo se añaden:
una entrada escrita no se reescribe nunca, ni para corregirla. Si algo
resultó estar mal, se dice en la entrada siguiente.

Complementa a `DECISIONES.md`: aquí **qué pasó**, allí **por qué algo es
como es**.

---

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
· Lo entregado: la tabla por rol y tipo de miembro, las dos funciones propuestas —`can_read_aportacion`, `can_read_tecnico`— y el veredicto sobre las cuatro acciones sin botón.
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
