-- =============================================================================
-- El equity de IWL, desde la firma, no por hitos (REVISION, 22 nov · bloque 6)
--
-- El equity de IWL es un porcentaje del Anexo que existe desde la firma del
-- Acuerdo. Ningún hito de la compañía lo devenga: fuera la marca «Devenga
-- equity». «Libera financiación» no cambia.
--
-- La columna no se borra: el modelo la deja para el equity de los mentores
-- no pagados, que se definirá más adelante y no se construye todavía. Hasta
-- entonces, vacía y sin poder rellenarse, también con la clave de servicio.
-- Las funciones que la leen siguen valiendo: con todo a nulo, no hay nada
-- que devengar.
-- =============================================================================

update milestones set accrues_equity_pct = null where accrues_equity_pct is not null;

alter table milestones drop constraint if exists milestones_sin_equity_de_compania;
alter table milestones add constraint milestones_sin_equity_de_compania
  check (accrues_equity_pct is null);

comment on column milestones.accrues_equity_pct is
  'Sin uso desde el 22 nov: el equity de IWL va con el Anexo desde la firma. Reservada para el equity de mentores no pagados, sin definir.';
