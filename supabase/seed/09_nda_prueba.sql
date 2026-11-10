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
-- texto completado.
-- =============================================================================

insert into nda_plantillas (version, texto, hash)
select 0,
  'TEXTO DE PRUEBA. NO ES UN NDA.' || chr(10) || chr(10) ||
  'Este texto solo existe para las pruebas de la plataforma en local. ' ||
  'Sirve para comprobar que una candidata puede leer un acuerdo de confidencialidad, ' ||
  'firmarlo con su nombre y que Inception Woman Lab lo contrafirme, y que de las dos firmas ' ||
  'sale un PDF con el rastro completo: nombre, correo, fecha y hora en Madrid y en UTC, ' ||
  'dirección IP, navegador, versión del texto y su hash.' || chr(10) || chr(10) ||
  'El texto real lo pega la dirección de IWL en Administración, Programa, Plantilla del NDA, ' ||
  'una vez validado por Luciana.' || chr(10) || chr(10) ||
  'Entre Inception Woman Lab y {{contraparte_nombre}}, de {{startup}}' ||
  '{{#si_persona}}, con documento {{documento}} y domicilio en {{domicilio}}{{/si_persona}}' ||
  '{{#si_sociedad}}, en nombre de {{denominacion}}, NIF {{nif}}, como {{cargo}}, con domicilio en {{domicilio}}{{/si_sociedad}}.' ||
  chr(10) || chr(10) ||
  'En {{lugar}}, con efecto desde {{fecha_efecto}}.',
  ''
where not exists (select 1 from nda_plantillas);
