# Plataforma IWL · cargar una compañía desde cero

Versión 2 · 10 nov 2026 · Inception Woman Lab

Sustituye a la versión 1 (5 nov). Cambia el corte: **la compañía nace cuando las dos partes han firmado el NDA**, en el tramo de **entrada**, y pasa a la cartera al firmar el Acuerdo. El recorrido en palabras está en `IWL_Doc_FlujoEntrada_ES_v2_20261109.md` y el modelo de datos en `IWL_Doc_ModeloFlujoEntrada_ES_v2_20261109.md`.

Se hace en producción (https://ride.inceptionwlab.es) con una cuenta de **Dirección IWL** (`admin_iwl`). Hay pasos que también puede dar el equipo de IWL; cada uno lo dice.

**El ejemplo es Siren**: un proyecto en MVP, sin sociedad constituida todavía, que entra por **Construcción**. Donde Aceleración es distinto, se dice aparte.

**No se trabaja sin Acuerdo firmado, en ninguna de las dos vías** (decisión de Rodrigo, 10 nov). En Construcción, el tramo de entrada es un diagnóstico corto para decidir, no para construir. El Acuerdo se firma aunque no haya sociedad: el equity queda comprometido y se materializa al constituirla.

El orden importa:

**candidatura → reunión → comité → NDA → compañía en entrada → situación → decisión → Acuerdo → equipo → hoja de ruta → KPI**

Cada paso dice dónde se hace, quién puede y qué hay que ver en pantalla después.

---

## 1. La candidatura

**Embudo** → desplegable «Dar de alta una candidatura a mano», si no llegó por `/presentarse`. Pide **Cohorte**, **Startup**, **Persona de contacto** y **Su correo**. Botón **Dar de alta**.

En su ficha:

- **«Qué ve ella»** tiene su enlace privado, con **Copiar**. Se lo mandas tú: todavía no hay envío de correo. Debajo pone si lo ha abierto y cuándo. Si lo abres tú para comprobarlo, no cuenta.
- **«Por dónde va»**: **Pasar a …** avanza un paso; **O moverla a** + **Mover** salta. Los pasos son Presentada, En revisión, Reunión, Comité, Preseleccionada, NDA enviado, En entrada, Acuerdo propuesto y Firmada.
- **Situación societaria**, si ya se sabe: para Siren, «Sin sociedad constituida». Si se deja sin decir, se lo preguntará la plataforma a ella al entrar (paso 4).

Quién: equipo y dirección.

## 2. La reunión

En la ficha, bloque **Reuniones**:

1. Desplegable **«Proponer reunión»**: dos o tres franjas, en hora de Madrid, con su duración. **Proponer y abrir el correo** guarda la propuesta y abre en tu correo el mensaje ya escrito para ella.
2. Celebrada, **«Anotar esta reunión»**:
   - **Fue el**, **Cómo quedó** (seguir, no seguir, pendiente);
   - **De IWL** y **De la candidatura**, una persona por línea;
   - **Qué se habló** y **Adjuntos**;
   - botón **Guardar la reunión**.

Qué comprobar: las dos quedan en «Qué ha pasado». Mientras haya una sin celebrar, ella ve «Reunión propuesta».

## 3. El comité

Bloque **Comité** → desplegable **«Redactar el acta de comité»**:

- **Fecha del comité**, **Decisión** y **Resumen**.
- Quién lo forma: salen marcados los del comité por defecto, que se fijan en Administración → Programa.
- Según la decisión:
  - **Preseleccionada** pide la **Vía de entrada**. Sale propuesta por su estado: para Siren, en MVP, **Construcción**. Si se cambia, pide **Por qué otra vía**.
  - **Aplazada** pide **Se vuelve a mirar el**. Ese día sale el aviso a dirección.
  - **Descartada** pide el **Motivo** y **El mensaje para ella**, ya redactado.
- Botón **Guardar el acta para firmar**.

**Cada miembro firma con su cuenta**: **Firmar el acta**. Con la primera firma, el acta ya no se edita. Con la última, se cierra: aplica la decisión, pone la vía en la candidatura y deja el PDF en el expediente.

Quién: equipo y dirección. Firma cada miembro elegido.

## 4. El NDA, y nace la compañía

Con la candidatura en **Preseleccionada**, en «Qué ve ella», **Enviar el NDA**:

- crea su cuenta con el correo de contacto y anula el enlace privado;
- pasa la candidatura a «NDA enviado»;
- enseña la contraseña **una sola vez**, con el correo para ella ya escrito: **Abrir el correo** o **Copiar para WhatsApp**. Se cierra con **Hecho**.

Ella entra, cambia la contraseña y solo ve el NDA:

- **Lo puede comentar.** A dirección le llega el aviso «… ha comentado el NDA», con **Responder**. Si hay que cambiarle el texto, en el bloque NDA de su ficha: **«Cambiar el texto solo para ella»**. Si ya había firmado, su firma se anula y vuelve a firmar la versión nueva.
- **Lo firma.** A dirección le llega «… ha firmado el NDA. Falta la firma de IWL», con **Firmar por IWL** ahí mismo. Contrafirma una persona de dirección.

**Al contrafirmar nace la compañía**, en la misma operación:

- en **entrada** y con la vía del acta;
- con el nombre, el sector, la frase, la web y la cohorte de la candidatura;
- el identificador sale del nombre: Siren será `siren`, o `siren-2` si ya existe;
- ella pasa a **fundadora con la misma cuenta** y, al entrar, cae en **Mi compañía**;
- en Construcción, su checklist y su business plan nacen **por construir**: «Por hacer», sin fechas ni avisos;
- en Aceleración nacen **por entregar**, como siempre.

**Si el NDA se firmó fuera**: en el bloque NDA, desplegable **«Se firmó fuera de la plataforma»**, con **El NDA firmado** o **Dónde está** y **Se firmó el**. Botón **Darlo por firmado**. También nace la compañía, pero **sin nadie dentro**: ella no tiene cuenta todavía (paso 7).

Qué comprobar: la ficha de la candidatura dice **«Ya es compañía, en entrada»**, con **Ver la compañía**.

## 5. Dónde está una compañía en entrada

**Cartera**, bloque **«En entrada»**, arriba del todo. Solo lo ve IWL.

- Cada fila tiene su vía, los días que lleva, **su paso** y a quién le toca: a ella, a IWL o a dirección.
- **Aceleración**: «Due diligence: x de y obligatorios validados», **Validar**, que lleva a su due diligence, y **Recordar**, con el mensaje ya escrito para ella.
- **Construcción**: el diagnóstico, con **Reunión**, **Ficha** y **Situación** hecho o por hacer.

**No sale en la lista de la cartera ni en ninguna cifra**: invertibles, comparativa, cohorte o runway. Las que esperan a dirección suben el contador de la barra lateral.

## 6. La situación societaria

Si no se dijo en la candidatura, **Mi compañía abre con «¿Desde dónde partís?»**. Ella la dice una vez: **Situación societaria** (y lo que pida cada una) → **Guardar la situación**. Después solo la cambia IWL.

- Le llega a dirección el aviso «… ha dicho la situación societaria. Falta confirmarla», con **Confirmarla**.
- En la compañía, bloque **«En entrada»** → **Confirmar la situación**. Pasa de «Por confirmar» a «Confirmada».

De la situación sale lo societario. Para Siren, sin sociedad:

- la escritura, el pacto de socios y las cuentas pasan a «No aplica»;
- entran «Pacto entre fundadoras» y «Titularidad de lo construido»;
- se crea el hito **«Constituir la sociedad»**.

Quién: la dice ella; la confirma el equipo o dirección.

## 7. Decidir la incorporación

En la compañía, bloque «En entrada» → desplegable **«Decidir la incorporación»**:

- **Decisión**: Sí o No;
- **En qué se basa**: due diligence o estratégica. Sale propuesta por la vía: en Construcción, estratégica;
- **Motivo**;
- con «No», **Mensaje para ella**, ya escrito.

Botón **Guardar la decisión**.

- **Sí** → «Siguiente: el Acuerdo», con el enlace a Programa.
- **No** → la compañía queda **«No incorporada»**, archivada, y la candidatura descartada. Sale **Enviarle el mensaje**. Su expediente queda.

Quién: **solo dirección, una vez**. Una decisión no se cambia ni se borra.

En **Aceleración**, lo normal es decidir con el due diligence hecho. La lista «En entrada» no pide decidir hasta que lo obligatorio está validado.

## 8. El Acuerdo: el Anexo propuesto, aceptado y firmado

**La compañía → pestaña «Programa y Anexo»**. El Anexo en borrador **es** la propuesta de Acuerdo. Avanza:

**borrador → propuesto → comentado → aceptado → firmado**

1. **Abrir el Anexo** y rellenar: **Duración (meses)**, **Empieza el**, **Termina el**, **Equity (%)**, **Horas comprometidas**, **Valoradas en (€)**, **Financiación directa (€)**, **Perfiles sénior** y **Otros compromisos**. Botón **Guardar el Anexo**, cuantas veces haga falta. **Un borrador no se firma**: no hay botón.
2. **Ella tiene que tener cuenta.** Si el NDA se firmó fuera, el bloque lo dice y ofrece **Dar acceso**. Crea su cuenta con el correo de contacto, la hace fundadora y enseña la contraseña **una sola vez**, con **Hecho**.
3. Desplegable **«Proponerle el Acuerdo»**: quién firma.
   - Sin sociedad, como Siren: **Firman a título personal**, una fundadora por línea. Viene la persona de contacto.
   - Con sociedad: **Firma en nombre de la sociedad** y, si hace falta, a título personal.

   Botón **Proponerle el Acuerdo**. Desde ahí no se edita.
4. **Ella lo ve en Mi compañía**: el resumen le dice «te ha propuesto el Acuerdo». En Programa lo lee, puede **comentarlo** y lo **acepta**. Un comentario llega a dirección con **Responder**.
5. Si hay que cambiar algo: **Volver a borrador para cambiarlo**. Su aceptación se pierde y se le vuelve a proponer.
6. Aceptado, desplegable **«Firmar el Acuerdo y el Anexo»**:
   - **Etapa de inversión**, **Perfil técnico**, **Fase del programa**;
   - **Recorrido** y **Empieza el**, si se quiere ya la hoja de ruta;
   - **Firmado el**.

   Botón **Firmar el Acuerdo**.

Al firmar:

- la compañía pasa a **incubación** y entra en la cartera;
- se crean **sus KPI**, según el perfil técnico, y su **hoja de ruta**, si se eligió recorrido;
- el Anexo queda firmado, y la candidatura, «Firmada».

**La puerta, en la base:**

- En **Construcción**, como Siren, se firma sin ningún punto del due diligence validado.
- En **Aceleración** hace falta lo obligatorio validado. Si no, el mensaje dice cuántos faltan.
- En las dos, la incorporación en «Sí» y el Anexo aceptado.

Quién: proponer, responder y firmar, el equipo y dirección; aceptar, solo ella.

**No se deshace.** Firmado, la base no acepta cambios en horas, dinero, equity ni fecha: «Un Anexo firmado no se edita. Firma una versión nueva.» Hoy la pantalla no ofrece abrir otra versión cuando ya hay una firmada.

## 9. El equipo: mentoría, Niage y responsable de IWL

La fundadora ya está: es la misma cuenta desde el NDA. Para los demás, **Administración → Personas y accesos** → desplegable «Dar de alta a una persona»:

- **Correo**, **Nombre**, **Rol en la plataforma**, Cargo y En qué entra;
- **Contraseña**, que en blanco se genera;
- **Compañía** y **Papel en esa compañía**: mentoría que coordina (mentor principal), mentoría de apoyo, revisión de Niage o responsable de IWL.

Botón **Dar de alta**. La contraseña sale **una sola vez**. Es temporal: al entrar, la cambian.

Para asignar a alguien que ya existe: en su fila, **Compañía** + **Papel** + **Asignar**. O, desde la compañía, «Añadir a alguien al equipo del proyecto».

Quién: solo dirección.

## 10. La ficha

**Administración → Compañías y cohortes**, en su fila, o desde la compañía, menú de la cabecera → **Editar la ficha**.

- **Editar**: nombre, sector, etapa, perfil, fase, cohorte, frase, web y liderazgo femenino.
- **Poner un logo**: PNG, JPEG, WebP o SVG, de 2 MB como máximo.
- La etapa, la fase y la cohorte solo las mueve IWL. El identificador no se cambia desde ninguna pantalla.

En entrada, la etapa y el perfil están vacíos («Sin etapa todavía»): se fijan al firmar el Acuerdo.

## 11. La hoja de ruta y los hitos

Si no se eligió recorrido al firmar: **la compañía → «Hoja de ruta»** → «Diseñar la hoja de ruta»:

- **Plantilla de partida**: viene sugerida la de su estado de entrada;
- **Fecha de arranque**;
- botón **Crear la hoja de ruta**.

Las plantillas se copian: desde ahí, las etapas son de la compañía.

- **Hitos**: dentro de cada etapa, «Añadir un hito a esta etapa» → **Título**, **Criterio de éxito**, **Fecha prevista**, «Condiciona el estado invertible» → **Añadir hito**. «Cumplido» solo lo pone IWL o quien coordina.
- **Lo por construir se pone en marcha con un hito.** Un punto del due diligence enlazado a un hito con fecha pasa solo a «por entregar», con esa fecha. Si el hito estrena fecha después, también. IWL puede además cambiarlo a mano.

Quién: IWL o la mentora que coordina.

## 12. Los KPI

**La compañía → «KPI y updates»**. La lista de KPI la fijó la firma del Acuerdo, según el perfil técnico. Cambiar el perfil después no añade ni quita KPI.

- El primer mes: «Cargar los KPI del mes» → **Mes** y un valor por KPI → **Guardar los valores del mes**. Fija la línea de partida.
- Cada mes: los KPI y el «Update mensual». Un mes cargado se corrige con **Corregir**, que pide el motivo. **Revisado por IWL** lo cierra hasta que IWL lo reabra.

Quién: IWL, la mentora que coordina y la fundadora.

## 13. Si deja de ser Construcción

Cuando empieza a facturar: **Programa y Anexo** → «Vía de entrada» → desplegable **«Pasar a Aceleración»** → **Motivo** → **Pasar a Aceleración**.

- Lo que estaba por construir pasa a por entregar.
- Se ve «Pasó de Construcción a Aceleración el …» con el motivo.
- A su mentor principal le sale el aviso en su cartera.

Quién: solo dirección. De Aceleración no se vuelve.

## 14. Sin embudo: alta directa

Para una compañía que ya estaba dentro antes del embudo: **Administración → Compañías y cohortes** → «Dar de alta una compañía».

- Obligatorios: **Nombre**, **Identificador**, **Etapa**, **Estado de entrada**, **Perfil tecnológico**, **Fase** y la **situación societaria**.
- Opcionales: el resto, y **Hoja de ruta**.

Nace directamente **en incubación**, con checklist, business plan y KPI. A la fundadora se la da de alta en Personas con papel «Equipo fundador». **Su Anexo también se propone y ella lo acepta** antes de firmarse (paso 8): sin una fundadora con cuenta, no se puede proponer.

---

## Si algo no cuadra

- **No sale «Proponerle el Acuerdo».** Falta una fundadora con cuenta en la compañía: el bloque ofrece **Dar acceso**. Si la compañía no viene del embudo, se la da de alta en Personas.
- **«Antes de proponer el Acuerdo, dirección tiene que decidir la incorporación.»** Falta el paso 7.
- **«En Aceleración, el Acuerdo pide validado lo obligatorio… Faltan N.»** Validar en su due diligence, o, si de verdad no se le va a pedir, ponerlo en «No aplica».
- **La fundadora ve «sin compañía».** No está asignada con papel «Equipo fundador». En el embudo lo hace el NDA; en alta directa, Personas.
- **Una compañía firmada el NDA no aparece en la cartera.** Es lo normal: está en «En entrada» hasta firmar el Acuerdo.
- **El Anexo se firmó con un dato mal.** No se corrige. Revisar las cifras antes de proponerlo, que es lo que ella acepta.
