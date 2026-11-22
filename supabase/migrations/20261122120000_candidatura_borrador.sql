-- La candidatura antes de presentarse (REVISION, 22 nov · bloque 2).
--
-- Con el NDA como primer paso, la candidatura nace al aceptarlo, antes de
-- contar nada del proyecto: es un borrador. Va en su propia migración
-- porque Postgres no deja usar un valor de enum en la misma transacción
-- en que se añade.
alter type estado_candidatura add value if not exists 'borrador' before 'presentada';
