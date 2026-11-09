-- =============================================================================
-- Los valores del nuevo flujo de entrada, en su propia migración
--
-- Postgres no deja usar un valor de enum en la misma transacción en que se
-- añade. La siguiente migración los usa. Modelo aprobado:
-- `docs/IWL_Doc_ModeloFlujoEntrada_ES_v2_20261109.md`.
-- =============================================================================

-- `diligencia` era el due diligence de la candidata. Ahora es el tramo en que
-- la compañía ya existe, en cualquiera de las dos vías: se llama `entrada`.
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'estado_candidatura' and e.enumlabel = 'diligencia'
  ) then
    alter type estado_candidatura rename value 'diligencia' to 'entrada';
  end if;
end $$;

-- Lo que no se pide a la entrada: se construye con IWL dentro del programa
alter type estado_punto_dd add value if not exists 'por_construir';
alter type estado_seccion_bp add value if not exists 'por_construir';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tramo_compania') then
    create type tramo_compania as enum ('entrada', 'incubacion');
  end if;
  if not exists (select 1 from pg_type where typname = 'via_entrada') then
    create type via_entrada as enum ('aceleracion', 'construccion');
  end if;
end $$;
