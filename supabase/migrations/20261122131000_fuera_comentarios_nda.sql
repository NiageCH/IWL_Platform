-- =============================================================================
-- Fuera los comentarios del NDA (REVISION, 22 nov)
--
-- Con la casilla, el NDA es estándar y no se negocia: quien tenga una duda
-- escribe antes de aceptarlo, y eso lo dice la pantalla. Se van la tabla,
-- sus disparadores y su aviso. La versión propia de una candidatura nacía
-- de responder a un comentario: no se crean más, y las que haya se quedan
-- como estaban, porque una firma apunta a la suya.
-- =============================================================================

update avisos set cerrado_at = coalesce(cerrado_at, now()) where tipo = 'nda_comentario';
delete from avisos where tipo = 'nda_comentario';

drop table if exists nda_comentarios cascade;
drop function if exists app.al_comentar_nda() cascade;
drop function if exists app.al_responder_nda() cascade;

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check check (tipo = any (array[
  'primer_acceso', 'nda_firmado', 'situacion_dicha', 'anexo_comentario', 'cambio_estadio',
  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar', 'hito_entregado',
  'hito_sin_revisar', 'candidatura_nueva', 'acta_por_firmar', 'anexo_aceptado', 'documento_entregado',
  'correos_sin_enviar', 'sesion_por_confirmar', 'sesion_no_cuadra', 'sesion_en_direccion',
  'recomendacion_pendiente'
]));
