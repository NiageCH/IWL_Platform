-- =============================================================================
-- Los estados del Anexo como propuesta de Acuerdo, en su propia migración
--
-- Postgres no deja usar un valor de enum en la misma transacción en que se
-- añade. La siguiente migración los usa.
--
-- El Anexo en borrador es la propuesta de Acuerdo (REVISION, 9 nov):
-- borrador → propuesto → comentado → aceptado → firmado.
-- =============================================================================

alter type estado_anexo add value if not exists 'propuesto' before 'firmado';
alter type estado_anexo add value if not exists 'comentado' before 'firmado';
alter type estado_anexo add value if not exists 'aceptado' before 'firmado';
