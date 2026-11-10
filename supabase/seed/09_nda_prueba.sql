-- =============================================================================
-- Una plantilla del NDA para las pruebas locales
--
-- Las versiones del NDA no se borran —una firma apunta a la suya—, así que
-- una prueba que cargara su plantilla la dejaría para siempre. Va aquí, en
-- la semilla local, y nunca llega a la nube: `sembrar:nube` solo sube
-- `01_config.sql`. En la nube la plantilla empieza vacía y la pegan
-- Rodrigo o Luciana con el texto validado.
--
-- El texto dice lo que es para que nadie lo tome por un NDA de verdad.
-- Lleva los marcadores de una plantilla real, para que las pruebas
-- recorran lo mismo que una candidata: rellenar sus datos y firmar el
-- texto completado. Y las marcas de formato de una real —título, rótulos,
-- cláusulas, expositivos, lista, negrita y bloques de firma—, para que el
-- PDF y la pantalla de ella se prueben con todas.
-- =============================================================================

insert into nda_plantillas (version, texto, hash)
select 0, $nda$# Acuerdo de confidencialidad de prueba

TEXTO DE PRUEBA. NO ES UN NDA.

Este texto solo existe para las pruebas de la plataforma en local. Sirve para comprobar que una candidata puede leer un acuerdo de confidencialidad, firmarlo con su nombre y que Inception Woman Lab lo contrafirme, y que de las dos firmas sale un PDF con el registro completo: nombre, correo, fecha y hora en Madrid y en UTC, dirección IP, navegador, versión del texto y su hash.

### REUNIDOS

Entre Inception Woman Lab y {{contraparte_nombre}}, de {{startup}}{{#si_persona}}, con documento {{documento}} y domicilio en {{domicilio}}{{/si_persona}}{{#si_sociedad}}, en nombre de {{denominacion}}, NIF {{nif}}, como {{cargo}}, con domicilio en {{domicilio}}{{/si_sociedad}}.

En {{lugar}}, con efecto desde la fecha de la última de las firmas del registro de firmas.

### EXPONEN

I. Que el texto real lo pega la dirección de IWL en Administración, Programa, Plantilla del NDA, una vez validado por Luciana.

II. Que este, en cambio, solo sirve para ver cómo se pinta cada marca.

### CLÁUSULAS

## 01 Objeto de la prueba

Las partes de la prueba se comprometen a **no tomar este texto por un acuerdo de verdad**. Un párrafo largo tiene que partirse en varias líneas sin justificar, alineado a la izquierda, con el número de la cláusula colgado en el margen.

## 02 Lo que se comprueba

La prueba comprueba, como mínimo:

a) Que el título, los rótulos y las cláusulas salen con su formato.

b) Que una lista con sangría francesa sigue alineada cuando un elemento ocupa más de una línea, como este, que se alarga a propósito para que se parta.

c) Que las firmas van en dos columnas y no se parten entre páginas.

### FIRMAS

En prueba de conformidad, las partes firman este texto de prueba en el lugar y la fecha indicados en el encabezamiento.

::: firma
POR
**Inception Woman Lab, S.L.**
Nombre: la dirección de IWL
Cargo: Administración
:::

::: firma
POR
**{{#si_sociedad}}{{denominacion}}{{/si_sociedad}}{{#si_persona}}{{contraparte_nombre}}{{/si_persona}}**
Nombre: {{contraparte_nombre}}
Cargo: {{#si_sociedad}}{{cargo}}{{/si_sociedad}}{{#si_persona}}En nombre propio{{/si_persona}}
Documento de identidad: {{documento}}
:::
$nda$,
  ''
where not exists (select 1 from nda_plantillas);
