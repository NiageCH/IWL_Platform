-- =============================================================================
-- El rol de una candidata
--
-- Al firmar el NDA, la startup entra en la plataforma para cargar la
-- documentación del due diligence. Todavía no es compañía —puede no llegar a
-- serlo— así que no vale `fundadora`: ese rol se apoya en `company_members`,
-- y aquí no hay compañía a la que pertenecer.
--
-- En su propia migración porque Postgres no deja usar un valor de enum nuevo
-- en la misma transacción en que se añade.
-- =============================================================================

alter type app_role add value if not exists 'candidata';
