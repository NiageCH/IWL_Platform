-- =============================================================================
-- «Entregado»: el hito que ella ha dado por hecho y espera revisión
--
-- (REVISION, 13 y 18 nov) Va en su propia migración porque un valor nuevo
-- de un enum no se puede usar en la misma transacción en que se añade.
-- =============================================================================

alter type estado_hito add value if not exists 'entregado' before 'cumplido';
