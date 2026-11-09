-- =============================================================================
-- Tramo, vía y «por construir»: la base del nuevo flujo de entrada
--
-- Modelo aprobado el 9 nov: `docs/IWL_Doc_ModeloFlujoEntrada_ES_v2_20261109.md`.
--
--   · La compañía está en `entrada` o en `incubacion`. En entrada no cuenta
--     en la cartera ni en ningún agregado; se ve aparte.
--   · Entra por una de dos vías: Aceleración, con due diligence que
--     condiciona el Acuerdo, o Construcción, donde lo documental se hace
--     con IWL dentro del programa.
--   · «Por construir»: lo que no se le pide a la entrada. No cuenta como
--     pendiente ni vencido, y pasa a «por entregar» al enlazarse a un hito
--     con fecha.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- `diligencia` pasó a llamarse `entrada`
--
-- Tres funciones lo llevaban escrito como texto, y un texto no se renombra
-- con el enum: fallarían al ejecutarse, no al crearse. Se recrean desde su
-- definición vigente, cambiando solo ese valor, para no resucitar una
-- versión vieja.
-- -----------------------------------------------------------------------------

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname in ('momento_candidata', 'ver_candidatura', 'mis_peticiones')
      and p.prosrc like '%''diligencia''%'
  loop
    execute replace(pg_get_functiondef(f), '''diligencia''', '''entrada''');
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Tramo y vía
-- -----------------------------------------------------------------------------

alter table companies
  add column if not exists tramo tramo_compania not null default 'incubacion',
  add column if not exists via via_entrada;

comment on column companies.tramo is
  'Entrada: aceptada pero sin Acuerdo; no cuenta en cartera ni en agregados. Incubación: dentro del programa.';
comment on column companies.via is
  'Aceleración (due diligence que condiciona el Acuerdo) o Construcción (lo documental se hace dentro del programa). La fija el acta de comité.';

-- En entrada todavía no se ha decidido la etapa ni el perfil técnico
alter table companies alter column stage drop not null;
alter table companies alter column tech_profile drop not null;
alter table companies drop constraint if exists etapa_y_perfil_en_incubacion;
alter table companies add constraint etapa_y_perfil_en_incubacion
  check (tramo = 'entrada' or (stage is not null and tech_profile is not null));

/*
 * La vía la cambia dirección, con motivo, y solo de Construcción a
 * Aceleración: cuando empieza a facturar. Al revés no se pasa. Queda en el
 * registro, y lo que estaba por construir pasa a por entregar.
 */
create or replace function app.guard_cambio_via()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.via is not distinct from old.via then return new; end if;
  if auth.uid() is null or pg_trigger_depth() > 1 then return new; end if;

  if not app.is_admin() then
    raise exception 'La vía de entrada la cambia la dirección de IWL' using errcode = '42501';
  end if;
  if old.via = 'aceleracion' and new.via = 'construccion' then
    raise exception 'De Aceleración no se vuelve a Construcción' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_guard_via on companies;
create trigger companies_guard_via
  before update on companies
  for each row execute function app.guard_cambio_via();

create or replace function app.al_pasar_a_aceleracion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.via = 'construccion' and new.via = 'aceleracion' then
    update dd_items set status = 'pendiente'
    where company_id = new.id and status = 'por_construir';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_pasa_a_aceleracion on companies;
create trigger companies_pasa_a_aceleracion
  after update of via on companies
  for each row execute function app.al_pasar_a_aceleracion();

-- -----------------------------------------------------------------------------
-- «Por construir» se pone en marcha al enlazarse a un hito con fecha
-- -----------------------------------------------------------------------------

alter table dd_items
  add column if not exists milestone_id uuid references milestones(id) on delete set null;

comment on column dd_items.milestone_id is
  'El hito en que se construye este punto. Con fecha, el punto pasa de «por construir» a «por entregar» y toma esa fecha.';

create or replace function app.activar_por_construir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
begin
  if new.status = 'por_construir' and new.milestone_id is not null then
    select due_date into v_fecha from milestones where id = new.milestone_id;
    if v_fecha is not null then
      new.status := 'pendiente';
      new.due_date := v_fecha;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dd_items_activar_por_construir on dd_items;
create trigger dd_items_activar_por_construir
  before insert or update of milestone_id, status on dd_items
  for each row execute function app.activar_por_construir();

-- Y si el hito estrena fecha después, también
create or replace function app.al_fechar_hito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.due_date is not null and new.due_date is distinct from old.due_date then
    update dd_items
    set status = 'pendiente', due_date = new.due_date
    where milestone_id = new.id and status = 'por_construir';
  end if;
  return new;
end;
$$;

drop trigger if exists milestones_activar_por_construir on milestones;
create trigger milestones_activar_por_construir
  after update of due_date on milestones
  for each row execute function app.al_fechar_hito();

/*
 * Redefinición de `20261109120000_situacion_societaria.sql`: además de
 * «No aplica», poner o quitar «por construir» a mano es de quien valida.
 * Lo automático —enlazar a un hito con fecha— va por disparador y no pasa
 * por aquí.
 */
create or replace function app.guard_no_aplica_dd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 then return new; end if;

  if (new.status in ('no_aplica', 'por_construir')
      or (tg_op = 'UPDATE' and old.status in ('no_aplica', 'por_construir')))
     and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end)
     and not app.can_validate_company(new.company_id) then
    raise exception 'Que un punto no aplique o quede por construir lo decide quien valida el due diligence'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
