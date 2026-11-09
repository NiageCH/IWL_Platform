-- =============================================================================
-- Los valores nuevos de la situación societaria, en su propia migración
--
-- Postgres no deja usar un valor de enum en la misma transacción en que se
-- añade, y cada migración es una transacción. La siguiente los usa.
-- =============================================================================

-- Un punto de due diligence que no se le puede pedir a este proyecto: una
-- escritura de constitución, a quien todavía no tiene sociedad
alter type estado_punto_dd add value if not exists 'no_aplica';

-- El hito de constituir la sociedad lo pone la plataforma, no un plan
alter type origen_hito add value if not exists 'societario';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'situacion_societaria') then
    create type situacion_societaria as enum ('sin_constituir', 'en_constitucion', 'constituida');
  end if;
  if not exists (select 1 from pg_type where typname = 'forma_juridica') then
    create type forma_juridica as enum ('sl', 'sa', 'otra', 'extranjera');
  end if;
end $$;
