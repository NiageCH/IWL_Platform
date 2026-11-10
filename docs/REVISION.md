# Revisión

Respuestas y encargos para Claude Code. La entrada más reciente arriba. Se trabaja sobre la última.

---

## 2026-11-10 · El NDA se personaliza: marcadores y datos de la firmante

Rodrigo ha cargado en producción la plantilla del NDA (`IWL_NDA_PlantillaGenerica_ES_v2_20261110`). La plataforma la usa tal cual: no rellena nada. El texto tiene huecos que dependen de cada candidata (quién es la Contraparte, persona física o sociedad, su documento, su domicilio, la fecha de efecto), así que hoy se firmaría con los corchetes dentro. **No se envía ningún NDA hasta que esto esté.**

**Qué hace falta:**
1. **Marcadores en la plantilla**, con la sintaxis `{{nombre}}`. Lista cerrada, documentada en la pantalla de la plantilla:
   · de la candidatura: `{{startup}}`, `{{contraparte_nombre}}`;
   · de la firma: `{{fecha_efecto}}` (la de la última firma), `{{lugar}}` (Málaga por defecto, en Programa);
   · de lo que rellena ella: `{{documento}}`, `{{domicilio}}`, y si es sociedad `{{denominacion}}`, `{{nif}}`, `{{cargo}}`.
   Un marcador desconocido no deja guardar la plantilla.
2. **Persona física o sociedad.** Dos bloques condicionales, `{{#si_sociedad}}…{{/si_sociedad}}` y `{{#si_persona}}…{{/si_persona}}`. Sale de la situación societaria: «constituida» es sociedad; las otras dos, persona física.
3. **«Tus datos para el NDA»**, antes de firmar: ella rellena lo que falta. Ve el texto ya completado antes de firmar.
4. **Lo firmado es el texto completado.** El hash, la versión y el PDF se calculan sobre el texto con sus datos, no sobre la plantilla. Guarda también los datos que rellenó.
5. **Sin corchetes.** Si en el texto completado queda un `[` … `]` o un `{{`, no se puede enviar ni firmar, y la pantalla dice qué hueco falta. Así una plantilla a medio hacer no llega nunca a una candidata.
6. **«Enviar el NDA» sigue bloqueado** mientras la plantilla vigente no pase esa comprobación (amplía el punto 1 de la entrada anterior).

El texto legal no lo toques: los marcadores los pone Luciana en la plantilla. Va antes de lo de equity, junto con el arreglo de la entrada anterior.

---

## 2026-11-10 · Producción: la candidata con NDA pendiente no ve nada más

Rodrigo ha probado en producción. La candidata entra y solo ve «Tu NDA está en preparación», sin nada más. Dos fallos, por este orden de urgencia:

1. **«Enviar el NDA» no puede funcionar sin plantilla.** En la nube no hay texto de NDA y el botón ha creado la cuenta y anulado el enlace igualmente: la candidata se queda sin su expediente y sin nada que firmar. Sin plantilla vigente (genérica o propia de ella), el botón sale desactivado con el motivo, «Falta cargar la plantilla del NDA», y un enlace a Administración → Programa. Que lo impida también la base, no solo la pantalla.
2. **La puerta del NDA tapa demasiado.** Corrige lo que pusimos en el flujo («solo ve el NDA»). El NDA protege lo confidencial que se comparte desde ahí; su propia candidatura no lo es. Con el NDA pendiente (`sin_plantilla` o `por_firmar`), `app/candidatura/page.tsx` enseña:
   · arriba, una tarjeta de **siguiente paso**: «Firma el NDA» con el texto, los comentarios y la firma, o «Tu NDA está en preparación» si aún no hay texto;
   · debajo, **su candidatura entera** (`CandidaturaPublica`): estado, lo que envió y lo que aportó, igual que veía por el enlace.
   Detrás del NDA queda solo lo nuevo y confidencial: la sala de datos y lo que comparta IWL.
3. **Textos de esa pantalla:**
   · fuera «no tienes que hacer nada más hasta entonces». Mejor: «Te avisaremos cuando esté listo para firmar. Mientras, aquí tienes tu candidatura.»;
   · fuera las rayas de «Para compartir contigo información confidencial —y tú con nosotras—», según la voz de IWL: coma o frase nueva.

Va antes de lo de «Construcción: no se trabaja sin Acuerdo». Es un fallo en producción.

---

## 2026-11-10 · Construcción: no se trabaja sin Acuerdo, y más equity

**Decisión de Rodrigo.** En Construcción IWL aporta valor desde el primer día (business plan, estrategia comercial, producto). Por eso:
· **Regla para las dos vías: no se trabaja sin Acuerdo firmado.** El tramo de entrada en Construcción es un diagnóstico corto para decidir, no para construir.
· **El Acuerdo se firma aunque no haya sociedad.** El equity queda comprometido y se materializa al constituir. «Constituir la sociedad» es el primer hito del Anexo.
· **Entrar antes cuesta más equity**: la horquilla de Construcción es más alta que la de Aceleración. Las cifras las fija Luciana; no las pongas tú.

**Qué cambia en la plataforma** (después del paso 6 y la guía de carga, sin frenar el despliegue):
1. **Tope del tramo de entrada en Construcción**, en Programa, por defecto 14 días desde que nace la compañía. Al llegar, Atención y aviso a dirección («… lleva 14 días en entrada sin Acuerdo»); a la semana, Vencido. En Aceleración no hay tope: el due diligence ya tiene sus avisos.
2. **Horquilla de equity por vía**, en Programa, vacía hasta que Luciana la fije. Al proponer el Anexo se enseña como referencia; salirse de ella pide motivo, que queda en el registro. Con la horquilla vacía, no se bloquea nada.
3. **Equity sin sociedad**: si la situación es «sin constituir» o «en constitución», el Anexo lo enseña como «Comprometido · se materializa al constituir», y proponerlo exige el hito «Constituir la sociedad» con fecha. Cuando IWL confirme la sociedad constituida, pasa a «Materializado» con la fecha.
4. **Horas solo desde la firma.** Si hoy se pueden registrar horas de acompañamiento en una compañía en entrada, quítalo: la base lo impide y la pantalla dice por qué. «Horas entregadas» cuenta desde la firma del Acuerdo.

Lo legal (instrumento sin SL, qué pasa si constituyen sin IWL o el proyecto muere antes) lo cierra Luciana. Aquí solo va lo que la plataforma enseña y exige.

---

## 2026-11-10 · Paso 5 cerrado. Dos respuestas y el orden

Bien el paso 5 (81f9492 y 37ea32a), y bien retirar la prueba que vivía de un fichero local. Respuestas:

1. **La fundadora tiene cuenta siempre antes del Acuerdo. No hay «Registrar la aceptación».** El NDA firmado fuera se admite porque es anterior a la relación; el Acuerdo ya no lo es: desde la firma ella trabaja en la plataforma, así que la cuenta hace falta igual. «Proponer el Acuerdo» queda bloqueado mientras no tenga cuenta, con el motivo a la vista y el botón «Dar acceso» al lado. Un solo camino, sin aceptaciones registradas por IWL en su nombre.
2. **Sí, propuesta y aceptación obligatorias también al renovar el Anexo en incubación.** Un Anexo nuevo cambia equity, horas o hitos que le afectan; IWL no lo firma sin que ella lo haya aceptado. Mismo recorrido que en entrada: borrador → propuesto → comentado → aceptado → firmado. Quita la firma directa del borrador.

**El orden que propones vale**: primero el paso 6 («En entrada» junto a la cartera), después la guía de carga con Siren como ejemplo.

**Al terminar la guía, paramos para desplegar.** La rama ya lleva muchas migraciones sin estar en producción. Antes de empezar nada nuevo, deja en la bitácora la lista exacta de pasos para Rodrigo (merge, npm install, db push, push, despliegue), qué migraciones entran y qué comprobar en producción después.

---

## 2026-11-10 · Paso 5, primera mitad: aprobado. Dos respuestas

Bien la primera mitad del paso 5 (1570b74). Respuestas:

1. **Sí, deja de generar los documentos de la candidatura al enviar el NDA.** En el modelo v2 los documentos viven en la compañía y generarlos dos veces crea duplicados que alguien acabará rellenando en el sitio equivocado. Las candidaturas anteriores conservan los suyos, sin tocarlos. **Las pruebas de acceso que dependían de ellos se adaptan a los documentos de la compañía**: comprueban lo mismo (quién ve qué) sobre el objeto nuevo. No se mantiene una función muerta para que pase una prueba.
2. **Sí, quita esa combinación de la semilla de demostración.** Y además: **ninguna prueba versionada puede depender de un fichero sin versionar.** Haz que la prueba de la demostración cree sus propios datos o que lea la semilla que sí está en el repo; si lo que tiene que comprobar solo existe en mi fichero local, la prueba sobra. Objetivo: las tres suites en verde en cualquier máquina, sin excepciones conocidas.

Sigue con la segunda mitad (Anexo como propuesta, firma desde la compañía con la puerta del due diligence solo en Aceleración, KPI y hoja de ruta al firmar, cambio de vía con aviso al mentor principal). Al cerrarla, la guía de carga rehecha.

---

## 2026-11-09 · Modelo del flujo de entrada v2: aprobado

Modelo v2 (`IWL_Doc_ModeloFlujoEntrada_ES_v2_20261109.md`) **aprobado**. Respuestas a las tres preguntas:

1. **Pasar de Construcción a Aceleración lo decide dirección, con motivo.** Sin comité: es un cambio de vía dentro del programa, no una nueva selección. Queda en el registro y avisa al mentor principal.
2. **«Por construir» pasa a «por entregar» solo al enlazarse a un hito con fecha**, y IWL puede cambiarlo además a mano, con motivo. Lo automático es la regla; lo manual, la excepción registrada.
3. **La propuesta de Acuerdo es el Anexo en borrador, no un objeto aparte.** Un solo documento que avanza: borrador → propuesto a la fundadora → comentado → aceptado → firmado. Así no se teclean dos veces el equity, las horas, los pilares y los hitos. El Acuerdo general (las secciones 1 a 12) es fijo y se firma junto al Anexo aceptado.

Construye ya los puntos 3 a 7 con este modelo, en el orden que propongas, cada uno con su commit y su entrada en la bitácora. Rehaz la guía de carga con el nuevo corte al final.

---

## 2026-11-09 · Respuesta al modelo del flujo de entrada: dos vías, no un due diligence para todas

**Corrección de fondo de Rodrigo.** El due diligence de entrada solo tiene sentido para una compañía que ya factura y entra a acelerar. Un proyecto en idea o MVP no tiene due diligence que hacer antes de ser aceptado: su construcción documental se hace **de la mano con IWL, dentro del programa**. El modelo tiene que reflejarlo.

### Dos vías de entrada

| Vía | Para quién | Entre el NDA y el Acuerdo | El checklist de due diligence |
|---|---|---|---|
| **Aceleración** | Factura o tiene tracción | Due diligence de entrada: **condiciona** el Acuerdo | Puntos «por entregar», con avance, avisos y «Recordar» |
| **Construcción** | Idea, prototipo o MVP | Diagnóstico corto: reunión, ficha y situación societaria. **No hay puerta documental** | Los mismos puntos como **«por construir»**: se trabajan en la incubación, dentro de la hoja de ruta, sin avisos de vencimiento hasta que tengan fecha en un hito |

· **La vía la decide el comité**, en el acta, junto con la decisión. Sale propuesta por el estado de entrada (idea, prototipo y MVP → Construcción; con ingresos o tracción → Aceleración) y el comité la puede cambiar con motivo.
· Se puede **pasar de Construcción a Aceleración** más adelante, cuando empiece a facturar: queda en el registro.

### La decisión de incorporación, igual en las dos vías

Rodrigo lo concreta: una vez aceptada, IWL analiza lo que hay y decide si sigue. Esa decisión cierra el tramo de entrada en las dos vías y abre el Acuerdo.

· **«Decidir la incorporación»**, en la compañía en entrada, solo dirección. Registra: **base de la decisión** (`due_diligence` o `estrategica`), motivo, fecha y quién decide. En Aceleración la base normal es el due diligence; en Construcción, la estratégica. Las dos valen en cualquier vía, con su motivo.
· Decisión **sí** → **«Proponer el Acuerdo»**: etapa, equity, qué aporta IWL, situación societaria y firmantes. La fundadora **ve la propuesta en Mi compañía**, puede comentarla y la acepta. Después se firma el Acuerdo y su Anexo y la compañía pasa a incubación.
· Decisión **no** → la compañía se archiva como «No incorporada», con el motivo y el mensaje para ella en la voz de IWL.
· En **Construcción**, también el **business plan** nace con sus secciones «por construir»: hay fundadoras que todavía no lo tienen, y se escribe con IWL dentro del programa. No cuenta como pendiente en la entrada.

### Cambios al modelo propuesto

· **`companies.tramo`** pasa a `('entrada', 'incubacion')`, no `due_diligence`. Y columna nueva **`companies.via`** `('aceleracion', 'construccion')`, fijada por el acta de comité.
· La compañía sigue naciendo **al contrafirmar el NDA**, en `tramo = 'entrada'`, en las dos vías: así la fundadora trabaja desde el principio en Mi compañía.
· En Construcción, el Acuerdo se puede firmar sin ningún punto de due diligence validado. En Aceleración, el Acuerdo exige los puntos marcados como obligatorios.
· «En due diligence» de la cartera pasa a **«En entrada»**, con la vía visible en cada fila.
· `dd_items` gana un estado **«por construir»**, que no cuenta como pendiente ni como vencido, y que pasa a «por entregar» cuando se enlaza a un hito con fecha.

### Las siete preguntas, con eso

1. Tramo aparte: **sí**, con los valores de arriba y la columna `via`.
2. Etapa y perfil vacíos en entrada; KPI y hoja de ruta al firmar el Acuerdo: **sí**.
3. Situación societaria: **la dice la fundadora una vez** y **IWL la confirma** como punto más del diagnóstico o del due diligence.
4. Comité: **lista por defecto en Programa, marcada al crear el acta, editable en cada una**. El acta se cierra cuando firman todos los elegidos. El acta incluye la **vía**.
5. NDA propio de la candidata: **sí**, y anula su firma si IWL no ha firmado. Con las dos firmas, un cambio es un NDA nuevo.
6. «NDA enviado» y `diligencia` = la compañía existe: **sí**. Renombra `diligencia` a algo que valga para las dos vías (por ejemplo `entrada`).
7. «Aplazada»: **se queda en Comité**, con fecha de revisión obligatoria y aviso ese día.

Rehaz el modelo con esto, actualiza `IWL_Doc_FlujoEntrada` y espera aprobación antes de construir.

---

## 2026-11-09 · Piloto con Prueba_Ro: nuevo flujo de entrada

Rodrigo ha probado el embudo con una candidatura «Prueba_Ro». Lee `docs/IWL_Doc_FlujoEntrada_ES_v1_20261109.md`: **la compañía nace cuando las dos partes han firmado el NDA**, en fase Due diligence, y el due diligence se hace ya en Mi compañía. Sustituye a la sección 1 de la guía de carga en lo que contradiga.

**Fallos encontrados, primero:**
1. **La ficha de la candidatura se sale por la derecha** de la pantalla. Revísala a 1280, 1440 y móvil.
2. **«Con quién se habla» sale vacío** aunque Rodrigo rellenó todos los datos. Averigua si no se guardan o si no se pintan, y dilo en la bitácora.

**Después, por este orden**, entregando antes el modelo de datos del nuevo corte y esperando aprobación:
3. «Proponer reunión» y «Anotar la reunión».
4. Acta de comité con firma de cada miembro y PDF.
5. «Enviar el NDA» desde Preseleccionada, comentarios de la candidata al NDA, contrafirma que lo dispara todo.
6. Creación automática de la compañía en fase Due diligence, la candidata pasa a fundadora, y la situación societaria como primera pregunta.
7. «En due diligence» separado de la cartera.

Esto absorbe los puntos 1 a 4 de la entrada «Onboarding de Siren» y el diseño del NDA: aplica allí lo que siga valiendo.

---

## 2026-11-09 · Situación societaria: proyectos sin sociedad constituida

Siren no tiene SL constituida, y no será la única. La plataforma hoy da por hecho que hay una sociedad. Hay que poder decir desde dónde parte cada proyecto.

**Campo nuevo en candidatura y compañía: «Situación societaria»**, obligatorio al firmar:
· **Sin constituir**: proyecto de personas físicas.
· **En constitución**: con fecha prevista.
· **Sociedad constituida**: forma jurídica (SL, SA, otra, extranjera), denominación social y CIF/NIF.

**Qué cambia según la situación:**
· **Quién firma.** Sin sociedad, firman las fundadoras **a título personal**, cada una con su nombre; la ficha de firma lo pide así. Con sociedad, la sociedad representada por quien tenga poder, y además las fundadoras si el Acuerdo lo requiere (punto abierto de la Propuesta §17).
· **Due diligence societario.** Sin sociedad, los puntos de escritura, libro de actas, cap table certificada y similares pasan a **No aplica** con el motivo, y entran en su lugar: pacto entre fundadoras sobre el reparto previsto y titularidad de lo construido hasta hoy (código, marca, dominio).
· **Hito automático «Constituir la sociedad»** en la hoja de ruta, con fecha, cuando la situación sea sin constituir o en constitución. Al cumplirlo se piden los datos y los documentos societarios, y la situación cambia sola a constituida.
· **Equity.** El mecanismo del Acuerdo es la compra de participaciones existentes; sin sociedad no hay participaciones. La ficha muestra «Equity pendiente de constitución» y queda ligado al hito anterior. **La cláusula para este caso la define Luciana con asesoría legal**; la plataforma solo refleja el estado, no redacta nada.
· La situación se ve en la cabecera de la compañía y en la cartera, como dato y no como alerta.

Va dentro del bloque de onboarding, junto al arreglo de «Firmar acuerdo y crear compañía» (punto 4), porque es el mismo formulario.

---

## 2026-11-09 · Sobre el diseño del NDA en la plataforma (punto 3)

El diseño va bien: puerta decidida por la base, IP registrada desde el servidor con la clave de servicio y el porqué escrito, contrafirma desde el aviso, PDF con pdf-lib. Cinco ajustes:

1. **No redactes el texto del NDA.** IWL ya tiene plantilla en Drive: `IWL_NDA_PlantillaGenerica_ES_v2_20260922` (la más reciente) y `NDA_IWL_Plantilla_Generica` en la carpeta IWL_AGENTE. Deja la pantalla de plantilla **vacía**; Rodrigo o Luciana pegan ahí el texto validado. Mientras la plantilla esté vacía, la candidata ve «Tu NDA está en preparación» y la puerta no se abre, pero tampoco le deja firmar nada provisional.
2. **Versiones de la plantilla.** Editarla crea una versión nueva; nunca se modifica la que ya se ha firmado. Cada firma guarda la versión y el **hash SHA-256 del texto exacto** que vio. Así se puede demostrar qué firmó aunque la plantilla cambie mañana.
3. **El rastro, en la última página del PDF**: nombre, correo, fecha y hora (Madrid y UTC), IP y navegador de cada firmante, versión de la plantilla y hash. Guarda también el navegador (`user-agent`) en `nda_firmas`.
4. **NDA firmado fuera de la plataforma.** Dirección puede subir un PDF ya firmado (en papel o por otro sistema) y marcarlo como firmado, con `<Evidencia>`. Pasa igual a «NDA firmado» y abre la puerta. Hay candidatas que firmarán así.
5. **Avisar a la candidata** cuando IWL contrafirma: en su pantalla, «IWL ha firmado el NDA. Ya puedes empezar el due diligence», con el siguiente paso.

---

## 2026-11-09 · Onboarding de Siren: lo que Rodrigo encontró al dar de alta a Agustina

Rodrigo ha creado la cuenta de Agustina en producción y el flujo no se sostiene. **Esto va primero, antes que el resto de entradas abiertas**: es justo lo que el piloto tenía que destapar.

### 1. Dirección ve el onboarding paso a paso

En la ficha de cada candidatura y compañía, y resumido en el Inicio de dirección, una línea de pasos con fecha y estado de color:

cuenta creada · **primer acceso** · contraseña cambiada · **NDA firmado por ella** · **NDA firmado por IWL** · due diligence entregado (x de y) · comité · Acuerdo firmado

· Cada paso dice cuántos días lleva la persona en él.
· **Atención** si lleva más de 5 días sin moverse; **Vencido** a los 10. Umbrales en configuración.
· Botón **«Recordar»** en el paso detenido. Hasta que haya proveedor de correo: abre un correo ya redactado (`mailto:`) y un mensaje para copiar a WhatsApp. Cada recordatorio queda en el registro.

### 2. Avisos a dirección

En el Inicio de dirección y con contador en la barra lateral:
· «Agustina Gómez ha entrado por primera vez».
· «Agustina Gómez ha firmado el NDA. Falta la firma de IWL» con botón para firmarlo ahí mismo.
· Cualquier paso detenido que pase a Atención.

### 3. NDA firmado dentro de la plataforma, por las dos partes

Hoy «NDA» es un estado que pone IWL a mano. Pasa a ser una firma:
· En su primera entrada, después de cambiar la contraseña, la candidata ve el NDA (plantilla de IWL) y lo firma: nombre completo escrito, casilla de aceptación, fecha, hora y dirección IP guardadas. Hasta que no firme, no ve nada más.
· IWL lo contrafirma desde el aviso. Firma una persona de dirección, con su nombre.
· Al completarse, se genera el PDF del NDA con las dos firmas y su rastro, va al data room de la candidatura y la candidatura pasa a «NDA firmado».
· Es firma electrónica simple. **Luciana valida que sirve para el NDA** antes de usarlo con fundadoras reales; queda dicho en la pantalla de configuración.

### 4. Fallo en «Firmar acuerdo y crear compañía»

Rodrigo escribió `siren.es` y el formulario lo rechazó con «Minúsculas, números y guiones. Es lo que irá en la dirección web», sin decir qué campo, y no pudo avanzar. Dos campos mezclados:
· **Web de la compañía**: campo propio y opcional. Acepta `siren.es`, `www.siren.es` o con `https://`, y lo normaliza.
· **Identificador interno** (el slug): se genera solo a partir del nombre. No se le pide a nadie; editable solo en «Opciones avanzadas», con el rótulo «Identificador en la plataforma, no es la web».
· Todo error de formulario señala **el campo** con su mensaje debajo, no un aviso general.

### 5. «Ver como»

Pendiente de la entrada del 5 nov. Es lo que Rodrigo necesita para comprobar qué ve Agustina; súbelo de prioridad, justo detrás de este bloque.

**Orden:** 4 (es un bloqueo) · 1 y 2 · 3 · «Ver como» · los cinco huecos de la guía · Siren con mentores.

---

## 2026-11-05 · Respuestas a los cinco huecos de la guía de carga (4883233)

1. **Firmar una candidatura convierte a la candidata en fundadora y la asigna a su compañía**, en el mismo paso y sin crearle otra cuenta. Lo mismo para las cofundadoras que figuren en la candidatura con cuenta. Queda en el registro.
2. **Un Anexo firmado no se edita: se le añade una adenda.** Botón «Nueva adenda» en el Anexo firmado: versión nueva numerada, que dice qué apartados cambia, con su fecha de firma y su evidencia; la anterior queda visible como histórico. Es lo que dice la sección 8 del Acuerdo.
3. **Los tres, antes de cargar Siren.** Son pequeños y el piloto los va a necesitar el primer día:
   · Objetivos de KPI con pantalla propia, editables por IWL y el mentor principal.
   · Editar hitos siempre; borrar solo si no están cumplidos ni tienen evidencia, y queda en el registro.
   · Empezar una hoja de ruta en blanco, sin plantilla, añadiendo tramos a mano.

Y las dos entradas de arriba (Siren como piloto y «Ver como») siguen pendientes de leer.

---

## 2026-11-05 · Siren como proyecto piloto, y «Ver como»

### Siren, de cero y con la fundadora

Rodrigo usará **Siren** como piloto: después de `nube:vaciar`, se monta entero desde la plataforma, con **Agustina Gómez** como fundadora, para probar el flujo real de principio a fin.

· **Correo de Agustina confirmado por Rodrigo: `gomezagustina225@gmail.com`.** Su cuenta se crea desde la plataforma como parte del piloto (candidatura y firma, o alta directa según la guía), no por script. Camila Aguado, pendiente de que Rodrigo diga si entra.

· **Siren no se carga por semilla en la nube.** Se crea desde la plataforma, como se hará con cualquier compañía. Si `nube:vaciar` la borra, bien; si la guía de carga necesita algo que la plataforma no permite hacer desde pantalla, dilo en la bitácora: es justo lo que el piloto tiene que destapar.
· **Mentores de Siren:** Rodrigo como **mentor principal** y Juan Mishima como **mentor técnico**. Rodrigo es `admin_iwl` y Juan `revisor_niage`; la asignación por compañía tiene que poder darles además su papel en Siren sin cambiar su rol global. Que aparezcan como mentores en la ficha, en el inicio del mentor y en los avisos. Si hoy un `admin_iwl` no puede ser mentor principal de una compañía, arréglalo.
· La guía de carga que ya está pedida se escribe **con Siren como ejemplo**, paso a paso.

### «Ver como», para que IWL vea lo que ve cada persona

Nada de cuentas compartidas. Para dirección (`admin_iwl`), un selector **«Ver como…»** en la barra lateral:
· Eliges una persona (por ejemplo, Agustina) y la plataforma se muestra exactamente como la ve ella: su aterrizaje, su menú, sus pestañas y sus datos, aplicando sus permisos reales en la base, no una imitación en pantalla.
· **Solo lectura.** Ningún botón de guardar funciona mientras estás viendo como otra persona; la base lo rechaza, no solo la pantalla.
· **Banda fija arriba**, en ámbar: «Estás viendo la plataforma como Agustina Gómez · Salir». Imposible olvidarlo.
· **Queda en el registro de actividad**: quién vio como quién y cuándo. La persona puede verlo en su registro de accesos.
· No se puede usar «Ver como» sobre otra cuenta de dirección.

Entrega primero el diseño técnico en `docs/` (cómo se aplica de verdad la identidad de la otra persona en RLS y cómo se garantiza la solo lectura) y espera aprobación. Las cuentas de revisión siguen existiendo para la demo, pero el día a día con proyectos reales será con «Ver como».

---

## 2026-11-05 · Nube limpia: todo era prueba

**Anula la entrada de reasignar.** Rodrigo confirma que todo lo que hay en la nube de antes del 5 de noviembre son pruebas, también las 34 candidaturas y lo demás de `luciana@iwl.es` y `rodrigo@nonage.es`. Las cuentas se borran con `--limpiar --confirmar`, sin reasignar.

**Además, la nube empieza de cero en datos.** Las compañías reales se cargarán de nuevo, junto con sus fundadoras, desde la plataforma, para comprobar que el flujo funciona.

Prepara `npm run nube:vaciar`, con simulación por defecto y `--confirmar` para ejecutar:
· Borra todas las candidaturas del embudo y sus ficheros, en los tres estados (abiertas, firmadas y descartadas), **salvo una de muestra por estado**, marcada como demostración y fuera de todo recuento, igual que Marea. La de muestra en NDA es la que usa la cuenta `rev-candidata`.
· Borra todas las compañías y sus ficheros, **salvo Marea Clínica** (`is_demo`), que sostiene las cuentas de revisión.
· **No toca** la configuración del programa (fases, pilares, áreas, dimensiones, KPI, tarifas, recorridos) ni las cuentas.
· Escribe constancia en `docs/constancia/` y una fila en el registro de actividad.
· Se niega a ejecutarse contra la base local salvo con una opción explícita, y contra la nube si `rodrigo@niage.es` no ha cambiado su contraseña.

Después, una guía corta en `docs/` para Rodrigo: cómo cargar una compañía real de cero desde la plataforma, con su fundadora, en el orden correcto (convocatoria o alta directa, ficha, equipo, Anexo, hoja de ruta, hitos, KPI).

---

## 2026-11-05 · Sobre `--limpiar` (820b4b1)

Rodrigo ya entró en `ride.inceptionwlab.es` con `rodrigo@niage.es` y funciona.

1. **Sí: `cuentas:nube` sin opciones solo crea las cuentas que no existen.** Reponer una contraseña, con `--reponer <correo>`. Hoy volver a lanzarlo le cambia la contraseña a Rodrigo y a quien ya la cambió.
2. `docs/constancia/` fuera de git: de acuerdo.
3. Compañías de prueba desde la plataforma, después de la simulación: de acuerdo.

---

## 2026-11-05 · Cuentas de la nube: solo quedan las nuevas

Rodrigo ha listado las 13 cuentas de la nube. **Decisión de Rodrigo: solo quedan las nuevas; todas las demás se borran.** Eso incluye tres que tu `--listar` no marcaba: `qqqq@q.com`, `w@w.es` y `maria@pitulo.com` (alta el 2 oct; la última entró el 29 oct).

**Estado final de la nube:**
· **`rodrigo@niage.es` es la cuenta principal**: `admin_iwl`, con todos los permisos, y la que se usa para comprobar cada paso. Es la última que se toca y la única que el script de limpieza nunca puede borrar ni degradar.
· Equipo: rodrigo@niage.es, luciana@niage.es, laura@niage.es, juan.mishima@niage.es, ingenieria@inceptionwlab.es.
· Las cuentas de revisión `rodrigo+rev-…@niage.es`.
· Nada más.

**Qué preparar:**
1. `npm run cuentas:nube -- --limpiar`: borra toda cuenta que no esté en esas dos listas. Por defecto en simulación, enseñando qué borraría; borra solo con `--confirmar`. **Se niega a ejecutarse si `rodrigo@niage.es` no ha entrado nunca**, para que Rodrigo no se quede fuera.
2. Antes de borrar, guarda en `docs/` un extracto del registro de actividad de esas tres cuentas (qué rol tenían y qué hicieron), para que quede constancia.
3. Las cuatro compañías basura (qqq, pirulo, ttttttt, w) se borran con «borrar con todo» en el mismo paso, o con el script si es más seguro.
4. Que `--listar` enseñe a partir de ahora las 13 cuentas con alta y último acceso, no solo las que sobran.

**Orden para Rodrigo**, en la bitácora con los comandos exactos: fusión en main · migración · push y despliegue · cuentas nuevas · Rodrigo entra con `rodrigo@niage.es` y cambia la contraseña · `--limpiar` en simulación · `--limpiar --confirmar`.

---

## 2026-11-05 · Respuestas sobre la subida (pasos 1 a 3)

Bien parado donde paraste. Respuestas:

1. **Cambio de contraseña obligatorio: sí, constrúyelo antes de que Rodrigo reparta.** Pantalla mínima: al entrar con la marca puesta, solo se puede cambiar la contraseña o salir.
2. **Las cuatro de prueba se borran en la nube.** Solo sirven a las pruebas locales; en producción son ruido. Se quedan en el seed versionado.
3. **`rodrigo@nonage.es` y todas las `@iwl.es` se borran** cuando Rodrigo haya entrado con `rodrigo@niage.es` y lo confirme. De acuerdo con el orden.
4. **Marea sin historia en la nube: de acuerdo.** La revisión completa de la demo se hace en local.
5. **El registro estuvo abierto desde septiembre.** Lista en la bitácora las 13 cuentas de la nube con correo, rol, fecha de alta y último acceso, y marca cualquiera que no reconozcas. Si alguien se dio de alta sin ser del equipo, se dice antes de seguir.
6. **Site URL: `https://ride.inceptionwlab.es`**, con `https://ride.inceptionwlab.es/auth/confirmar` y, mientras dure la transición, también `https://iwl-platform.vercel.app/auth/confirmar` como redirecciones permitidas.
7. Deja en la bitácora cómo cargar `.env.produccion` para `cuentas:revision`, con el comando exacto que Rodrigo tiene que pegar.

---

## 2026-11-05 · Subdominio de producción

Rodrigo elige **`ride.inceptionwlab.es`** como dirección de la plataforma.

Cuando termine la subida a producción, prepara el cambio y deja en la bitácora, para Rodrigo:
1. El dominio a añadir en Vercel (proyecto `iwl-platform`) y el registro DNS exacto que hay que crear en `inceptionwlab.es`.
2. Lo que cambias tú cuando el registro esté activo: Site URL y URL de redirección en Supabase, metadatos y cualquier enlace absoluto en el código.
3. Que `iwl-platform.vercel.app` redirija a `ride.inceptionwlab.es`.

El correo de la plataforma, cuando se contrate, saldrá del mismo dominio.

---

## 2026-11-05 · README al día y GitHub

El README es del 2 de octubre y no cuenta lo que hay. Antes de que Rodrigo publique en GitHub:

**1. Reescribe `README.md`** para alguien del equipo que llega nuevo. Corto, y lo detallado enlazado a `docs/`:
· Qué es la plataforma, en tres líneas, y quién la usa (los seis roles, con la tabla de capacidades de `lib/permisos.ts`).
· Arranque local: Docker, `npx supabase start`, `npm run db:reset`, `npm run dev`, y el aviso de un solo servidor de desarrollo a la vez (`pkill -f "next dev"`).
· Cuentas: de desarrollo, de revisión (`npm run cuentas:revision`, `.accesos-revision.md`) y de la nube (`.accesos-nube.md`). Dónde están y que **no se versionan**.
· Semillas: versionadas (demo para las pruebas) frente a `seed/local/` (proyectos reales y Marea completa), y por qué.
· Pruebas: unitarias, RLS e interfaz en **Chromium y WebKit**; cuánto tardan con la máquina libre.
· Producción: Vercel y Supabase Pro en Fráncfort, URL, cómo se despliega y qué falta antes de las fundadoras (correo, dominio, Vercel Pro, acuerdos de datos).
· Cómo se trabaja: `docs/BITACORA.md`, `docs/REVISION.md`, `DECISIONES.md` y el índice de documentos de `docs/` con una línea cada uno.
· Navegadores soportados: Safari 16.4 o posterior, Chrome 111 o posterior.

**2. Antes de publicar, comprueba** que ni en los ficheros versionados ni en los 14 commits pendientes hay `.env*`, `.accesos-*`, `seed/local/` ni contraseñas, y dilo en la bitácora.

**3. Deja a Rodrigo el comando** para publicar (`git push origin main`) en la bitácora. El remoto es SSH: si a él le falla por clave, que lo diga y se resuelve.

Va antes de la subida a producción, que depende de que el código esté publicado.

---

## 2026-11-05 · Subida a producción: AUTORIZADA para pruebas del equipo

**PRIORIDAD: va ahora, antes de «Mi perfil».** Supabase ya está en plan Pro. Rodrigo ha **transferido el proyecto existente** (Fráncfort, `ffvcrnq…`) a la organización Pro «IWL-Platform»: misma URL y mismas claves. Compruébalo en la bitácora, y si el proyecto estuvo pausado, que ha vuelto entero.

Rodrigo autoriza ahora la subida descrita en «Archivos y registro aprobado, y subida a producción» (bloque que estaba EN ESPERA), con estos cambios. **Objetivo: que el equipo pruebe con sus correos reales. Todavía sin fundadoras.**

### Cuentas en la nube

| Persona | Correo | Rol |
|---|---|---|
| Rodrigo González | rodrigo@niage.es | admin_iwl |
| Luciana Patiño | luciana@niage.es | admin_iwl |
| Laura Gleizer | laura@niage.es | equipo_iwl |
| Juan Mishima | juan.mishima@niage.es | revisor_niage |
| David Rodriguez | ingenieria@inceptionwlab.es | equipo_iwl |

· **David: correo confirmado por Rodrigo**, `ingenieria@inceptionwlab.es`. Se crea con los demás.
· Carlos Silvero y Cecilia Calónico no entran todavía: sin correo real.
· Cuentas de revisión también, con contraseñas nuevas.
· Contraseñas generadas al azar en `.accesos-nube.md` (nuevo, sustituye al del 29 de septiembre), y **cambio de contraseña obligatorio en la primera entrada**.
· Ninguna cuenta `@iwl.es` en la nube. Si existen, se borran.

### Pasos, en orden, cada uno en la bitácora

1. Estado actual de la nube: compañías, cuentas y roles, `disable_signup`.
2. Migraciones.
3. Datos: configuración del programa, La Pepi, Siren, Igor Labs, Proyecto Baires y la demostración Marea Clínica (`is_demo`). **Sin AgrolabX.**
4. Cuentas de la tabla de arriba y de revisión.
5. Ajustes de Auth: registro cerrado, Site URL de producción y URL de redirección.
6. Despliegue del código en Vercel (`fra1`).
7. Comprobación en la URL de producción, Chromium y WebKit, con cada rol: entra, aterriza donde debe y ve lo que dice la tabla de visibilidad. Capturas.
8. Lo que necesite credenciales de Rodrigo (`git push`, `supabase login`, `vercel`), como comandos exactos en la bitácora, en el orden en que tiene que lanzarlos.

Si algo falla, se para y se cuenta.

---

## 2026-11-05 · Tamaño de las cifras, con medidas

Rodrigo sigue viendo las cifras desproporcionadas, también «Horas entregadas 244 de 350» en Aportación (punto 3 de la segunda revisión, aún sin hacer). Para no interpretar, medidas fijas para `<Cifra>` en toda la plataforma:

| Tamaño | Número | Uso |
|---|---|---|
| Normal | Montserrat 600 · 20 px · `tabular-nums` | Toda cifra dentro de una tarjeta |
| Destacada | Montserrat 600 · 28 px | Una sola por pantalla como máximo |

· **Sin Roboto Mono en las cifras grandes.** El mono se queda para tablas, fechas y metadatos; a 30 px o más es lo que las hace verse enormes.
· **«de 350» va aparte**, en 14 px y gris (`zinc-500`): «**244** de 350 h». El número que importa en grande; la referencia, pequeña.
· Unidades pegadas al número y en el tamaño pequeño: «**9,8** meses», «**13.900** €».
· Rótulo encima en 12 px, nota debajo en 13 px.
· Aplica en todas las pantallas a la vez, desde el componente. Captura de Aportación, Resumen y KPI antes y después, en Chromium y WebKit.

Va en la tanda de quitar los cuadritos, que es la siguiente.

---

## 2026-11-05 · Mi perfil, para todos los usuarios

Hoy `/perfil` solo cambia la contraseña. Cargo, áreas, biografía y CV existen en `profiles`, pero solo los edita Administración. Cada persona tiene que poder mantener su propio perfil.

**Campos, en `/perfil` y editables por la propia persona:**
· **Foto.** Cajón nuevo `avatares`: PNG, JPEG o WebP, 2 MB, recorte cuadrado al subir. Sustituye a las iniciales en la barra lateral, comentarios, tareas, sesiones y listas de personas. Sin foto, siguen las iniciales.
· **Nombre visible** y **cargo** (`job_title`) y **organización**.
· **Resumen**: biografía corta, 300 caracteres como máximo, con contador.
· **LinkedIn**: enlace validado a `linkedin.com/in/…`. Se enseña como icono pulsable junto al nombre.
· **Áreas de experiencia** (`expertise`), elegidas de una lista cerrada que se mantiene en configuración, no texto libre. Es lo que alimenta «Qué perfil falta» en el inicio del mentor.
· **CV** (ya existe `cv_path`): subir y reemplazar desde aquí.
· **Teléfono**, opcional y oculto por defecto; la persona decide si lo ve su compañía.
· Contraseña, como hoy, en un bloque aparte.

**Quién ve el perfil de quién**, con la misma regla que todo lo demás:
· IWL ve todos.
· Una fundadora ve los de su equipo, sus mentores asignados, su revisor de Niage y el equipo de IWL. Nunca los de otra compañía.
· Un mentor ve los de las fundadoras de sus compañías asignadas y el equipo de IWL.
· Al pulsar el nombre o la foto de alguien en cualquier pantalla se abre su ficha en panel lateral.

**Primera entrada:** si a una persona le falta foto, resumen o, siendo mentor, áreas, su inicio muestra «Completa tu perfil» como acción en Atención. Barra de avance de un solo color.

Administración sigue pudiendo editar cualquier perfil, y cada cambio queda en el registro de actividad.

Orden: después de quitar los cuadritos, antes de la revisión de dirección.

---

## 2026-11-05 · Revisión de Rodrigo como mentor

1. **La fila de cuadritos sigue en todas las pantallas** que ha visto como mentor. Ya está pedido quitarla; que no quede ni una.
2. **Espacio de mentoría.** Lee `docs/IWL_Doc_EspacioMentoria_ES_v1_20261105.md`: sesiones con preparación y acta, notas del mentor, conversación por compañía y seguimiento. **Reactiva la fase A del calendario**, solo esa (cuenta organizadora de IWL, invitaciones con Meet). La fase B y la IA siguen aparcadas.
   · Pendiente de Rodrigo: qué cuenta de Google Workspace organiza las sesiones.
   · El modelo de datos de este espacio va en el mismo archivo de modelo de datos de los tableros, que espera aprobación.

Orden: `<Evidencia>` · quitar cuadritos · revisión de dirección · tableros y espacio de mentoría (modelo de datos primero).

---

## 2026-11-05 · Revisión de Rodrigo como dirección (rev-admin)

1. **«Scorecards de la cohorte» está bien escrito**: cohorte es femenino. Se queda. Revisa que no aparezca «el cohorte» en ninguna pantalla.
2. **Encargar una tarea con adjuntos.** Ya está en `<Evidencia>`; confirma que encargar una tarea es de los primeros sitios donde se usa.
3. **Embudo, el recorrido de la candidatura: estático y monocromo.** Mismo tratamiento que Recorrido: línea de pasos con el color de su estado, el paso actual destacado y cuántos días lleva en él. En la vista general del embudo, cada candidatura con su paso y su estado en una línea.
4. **Personas y accesos: filtro por tipo.** Equipo IWL · Ingeniería Niage · Mentores · Fundadoras · Candidatas · Cuentas de revisión. Y búsqueda por nombre o correo.
5. **Recorrido: demasiado texto y monocromo.** Además de plegar los tramos completados: línea de tiempo con los tramos como bloques proporcionales a su duración, «hoy» marcado, hitos como puntos de color sobre ella. Cada tramo abre con su objetivo en una línea y tres cifras (hitos, horas de IWL, semanas). El texto largo, detrás de «Ver detalle».
6. **Evaluación técnica: no se entiende qué significa cada número.** Al puntuar una dimensión, el revisor ve los cinco niveles (0 a 4) **con su descripción para esa dimensión**, el nivel objetivo de la etapa marcado, y elige uno pulsando la descripción, no escribiendo un número. Si `tech_maturity_levels` ya tiene esas descripciones, se enseñan; si no, entrega la tabla de descripciones por dimensión en `docs/` para que Rodrigo y Juan Mishima la validen.
7. **Materias de la aportación: no se entiende para qué sirve.** Es configuración: las seis materias con las que se clasifican las horas de IWL. Una línea arriba que lo diga, y al lado de cada materia cuántas horas tiene registradas y en cuántas compañías. Si no se puede borrar una materia con horas, que lo diga.

**Decisión pendiente de Rodrigo, no construir:** entrar con Google. Ver la respuesta en el chat; habrá entrada si se aprueba.

Orden: va detrás de `<Evidencia>` y de quitar la fila de cuadritos.

---

## 2026-11-05 · Archivos y registro aprobado, y subida a producción

### Decisiones de Rodrigo sobre `IWL_Doc_ArchivosYRegistro`

1. **Registro de aperturas: sí**, una línea por cada enlace firmado. Y además **la fundadora ve quién ha abierto los documentos de su compañía**, en su data room.
2. **Pantalla del registro de actividad: sí.** Completa en Administración con filtro por compañía y fecha; las últimas diez líneas en la ficha de cada compañía.
3. **Plazos de conservación, provisionales** hasta que los valide la asesoría: documentos del Acuerdo, la relación más seis años · registro de accesos, dos años · registro de actividad, mientras exista la compañía. Se declaran en configuración, no en código, y la página lo dice como provisional.
4. **50 MB por archivo** en el data room.
5. Puntos 4, 5 y 7: de acuerdo con tus propuestas.

Con esto, **`<Evidencia>` queda desbloqueado**. Va antes que la fila de cuadritos: Rodrigo lo está pidiendo en todas las pantallas.

### Subida a producción: EN ESPERA

**No ejecutar nada de este bloque.** Rodrigo quiere revisar antes las vistas de IWL (dirección, equipo, Niage y mentores). Cuando lo autorice, habrá una entrada nueva que lo diga. Lo de abajo queda como el plan que se seguirá entonces.

Antes de subir nada, en este orden, y cada paso en la bitácora:

1. **Lista lo que hay hoy en la nube**: compañías, cuentas y su rol, y si el registro está cerrado (`disable_signup: true`).
2. **Correos del equipo a los reales.** En la nube no entra ninguna cuenta `@iwl.es`. Rodrigo pasa a `rodrigo@niage.es`. Del resto, si no hay correo real confirmado, la cuenta no se crea en la nube y se lista como pendiente.
3. **Migraciones** (`db push`) y **datos**: configuración del programa, los cuatro proyectos reales (La Pepi, Siren, Igor Labs, Proyecto Baires), **sin AgrolabX**, y la demostración Marea Clínica marcada como `is_demo`.
4. **Cuentas de revisión en la nube**, con contraseñas nuevas, en `.accesos-revision.md` separadas de las locales.
5. **Ninguna cuenta de fundadora todavía.** Sus correos están sin confirmar.
6. **Código:** si el `git push` te lo bloquea, deja los comandos exactos en la bitácora y Rodrigo los lanza. Lo mismo con cualquier paso que necesite sus credenciales.
7. Después del despliegue, comprueba en la URL de producción, con Chromium y WebKit, que entran las cuentas de revisión y que cada una ve lo que dice la tabla de visibilidad. Capturas en la bitácora.
8. **`.accesos-nube.md` del 29 de septiembre se borra** cuando las cuentas nuevas funcionen.

Si algo de esto falla, se para y se cuenta. No se sube a medias.

---

## 2026-11-04 · Segunda revisión de Rodrigo (en Chrome)

**1. Fuera la fila de cuadritos de colores, en todas las pantallas.** Cinco colores seguidos no se leen como avance; se leen como ruido. Sustituye a la regla «barra segmentada» de `IWL_Doc_EstadosVisuales`:
· **Una barra de avance de un solo color**: verde lo hecho, gris claro el resto, y «23 de 29» al lado.
· **Debajo, solo las excepciones**, como pastillas `<Estado>`: «2 vencidos», «1 en atención». Si no hay excepciones, nada.
· Pulsar la barra o una pastilla abre la lista filtrada.
· Aplica a Qué falta, Due diligence general (arriba y en cada área), Due diligence técnico, Business plan y cualquier otro sitio donde esté. La barra segmentada se queda en `/componentes` como pieza retirada, o se borra.

**2. «Bloqueo» sigue sin explicarse.** Como ya está pedido: «Bloqueado» y el motivo **escrito al lado en la cabecera** («Un hallazgo crítico abierto»), pulsable hasta el hallazgo.

**3. Aportación: «Horas entregadas 242 de 350» es demasiado grande y en negrita.** Usa `<Cifra>` en su tamaño normal, igual que el resto de cifras de la plataforma.

**4. Scorecard técnico sin color.** Relleno suave del valor actual en el color de su estado frente al objetivo (verde si llega, ámbar si no, rojo si está lejos), con poca opacidad; objetivo en gris discontinuo; al pasar el ratón por cada eje, valor, objetivo y una línea de qué mide.

**5. «Dónde está la distancia»: el número sigue sin explicación.** `<Cifra>` con su `?`: qué mide la distancia, en qué escala, y si más es mejor o peor. Y cada fila de dimensión con una línea de qué significa.

**6. Adjuntar archivos en el due diligence técnico.** Sigue sin poderse. Es `<Evidencia>`, que espera la página del punto B. **Entrega esa página ya**, antes que el Resumen: Rodrigo la está pidiendo en todas las pantallas.

**Orden actualizado:** Safari · página del punto B · los tres ajustes de `/componentes` · estos seis puntos · Resumen completo · paso 4 · barrido.

---

## 2026-11-04 · Safari

Rodrigo revisa en **Safari**, y lo que veía mal no se reproducía en Chromium. Las fundadoras van a entrar desde Mac y desde iPhone, así que Safari es un navegador principal, no secundario.

1. Añade **WebKit** a los proyectos de Playwright, en escritorio y en iPhone, y que la suite de interfaz pase en los dos motores.
2. Revisa en WebKit los cuatro síntomas que vio Rodrigo: icono encima de la palabra, icono sin color, barra de hitos vacía, fase y semáforo solapados. Si alguno se reproduce, arréglalo antes que nada y cuéntalo en la bitácora con la causa.
3. Las capturas de la bitácora, a partir de ahora, en Chromium y en WebKit.

---

## 2026-11-04 · Cambio de orden: el Resumen, terminado de punta a punta

Rodrigo ve «todo igual» porque la mayor parte de su revisión depende de lo que aún no está: cifras con explicación, nada de desplegables, todo pulsable, Resumen de solo lectura. Las piezas existen en `/componentes`, pero ninguna pantalla está terminada.

**Nuevo orden:**
1. Los tres ajustes de la entrada anterior (KPI, «Bloqueado», icono de dólar).
2. **El Resumen, entero, como pantalla de referencia**: cabecera con `<Cifra>` y su `?` en Técnico y Preparación, semáforo con motivo al lado, solo lectura sin ningún desplegable, «Qué falta» con barra y lista pulsable, Último mes y Hallazgos con `<Estado>` y pulsables. Captura en la bitácora. Rodrigo lo valida antes de seguir.
3. Página del punto B.
4. Paso 4.
5. Barrido del resto de pantallas con el Resumen como patrón.

---

## 2026-11-04 · Sobre `/componentes` (acee55c · c4d9402)

La página de muestra funciona y es la herramienta correcta. Tres ajustes antes de aplicar las piezas:

1. **Los KPI no «vencen».** «Caja 227.510 € · Vencido» se lee como una fecha pasada. Para una cifra frente a su objetivo, palabras propias con los mismos colores: **En objetivo** (verde) · **Cerca** (ámbar) · **Lejos** (rojo) · **Sin objetivo** (gris).
2. **«Bloqueo» no se entiende**, lo dijo Rodrigo. El semáforo rojo dice **«Bloqueado»** y su motivo va siempre al lado, no solo al pasar el ratón.
3. **Fuera el icono de dólar en magenta de «Horas de IWL».** Es decorativo, no son euros y el magenta no pinta datos.

Sobre lo que Rodrigo vio en local: de acuerdo con tu diagnóstico, era un servidor de desarrollo arrancado antes de los cambios. Lo vuelve a mirar con el servidor reiniciado.

Sigue el orden: página del punto B (registro y documentos) y espera aprobación.

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
