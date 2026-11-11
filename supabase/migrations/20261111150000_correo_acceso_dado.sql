-- =============================================================================
-- El correo de «Darle cuenta», cuando el NDA se firmó fuera
--
-- (REVISION, 11 nov) Darle cuenta sin pasar por «Enviar el NDA» —para el due
-- diligence, o desde el Acuerdo— manda también el correo con el enlace para
-- elegir contraseña, como el del NDA. Nunca la contraseña.
-- =============================================================================

alter table correos drop constraint if exists correos_evento_check;
alter table correos add constraint correos_evento_check check (evento in (
  'enlace_candidatura', 'reunion_propuesta', 'reunion_confirmada', 'reunion_cambiada',
  'reunion_cancelada', 'nda_enviado', 'acceso_dado', 'respuesta_comentario', 'acuerdo_propuesto',
  'descarte', 'recordatorio', 'resumen_avisos'
));
