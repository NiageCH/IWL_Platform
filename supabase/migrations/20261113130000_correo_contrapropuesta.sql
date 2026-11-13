-- =============================================================================
-- A IWL le llega un correo cuando ella propone otras fechas
--
-- (REVISION, 13 nov) Hasta ahora solo quedaba el aviso en la plataforma y el
-- resumen diario. El correo lleva sus fechas y el enlace a la ficha. Es un
-- evento nuevo, y la lista de eventos de `correos` es cerrada.
-- =============================================================================

alter table correos drop constraint if exists correos_evento_check;
alter table correos add constraint correos_evento_check check (evento in (
  'enlace_candidatura',
  'reunion_propuesta',
  'reunion_confirmada',
  'reunion_cambiada',
  'reunion_cancelada',
  'reunion_contrapropuesta',
  'nda_enviado',
  'acceso_dado',
  'respuesta_comentario',
  'acuerdo_propuesto',
  'descarte',
  'recordatorio',
  'resumen_avisos'
));
