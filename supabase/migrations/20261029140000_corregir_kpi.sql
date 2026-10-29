-- =============================================================================
-- Corregir un mes de KPI ya enviado
--
-- Hasta ahora no se podía. La pantalla calcula sola el mes a cargar —«el
-- siguiente al último con datos»— así que un MRR mal tecleado quedaba mal
-- para siempre, y arrastraba el runway, el crecimiento y la comparativa.
-- La acción para corregir un valor suelto existía desde el principio y no
-- tenía por dónde llamarse.
--
-- Corregir un número que ya se entregó no es lo mismo que cargarlo: alguien
-- pudo tomar una decisión con el valor viejo. Así que no basta con dejar
-- escribir encima. Hacen falta tres cosas, y son las tres de aquí:
--
--   1. Un límite: mientras IWL no lo haya validado, lo corrige la compañía.
--      Validado, hace falta que IWL lo reabra.
--   2. Un rastro: qué decía antes, qué dice ahora, quién y cuándo.
--   3. Una puerta para reabrir, que es de IWL.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. El rastro
--
-- Tabla propia y no `activity_log`: esto se enseña en la pantalla del mes,
-- junto al valor, y un registro de actividad general no se consulta por
-- compañía y periodo sin volverse caro. Además aquí interesa el par de
-- valores, que en un log genérico acabaría dentro de un jsonb.
-- -----------------------------------------------------------------------------

create table kpi_value_history (
  id              uuid primary key default gen_random_uuid(),
  kpi_value_id    uuid references kpi_values (id) on delete set null,
  company_id      uuid not null references companies (id) on delete cascade,
  company_kpi_id  uuid not null references company_kpis (id) on delete cascade,
  period          date not null,
  valor_anterior  numeric(16,4),
  valor_nuevo     numeric(16,4),
  nota            text,
  changed_by      uuid references profiles (id) on delete set null,
  changed_at      timestamptz not null default now()
);

create index kpi_value_history_idx
  on kpi_value_history (company_id, period desc, changed_at desc);

comment on table kpi_value_history is
  'Correcciones de un KPI ya cargado: qué decía antes, qué dice ahora, '
  'quién y cuándo. Se escribe sola desde un disparador.';

/*
 * Se escribe sola.
 *
 * Si dependiera de que la acción se acuerde de insertar la fila, bastaría
 * una corrección por otro camino —una importación, una consulta a mano—
 * para que el rastro mintiera por omisión. Un rastro con huecos es peor que
 * no tenerlo: invita a confiar en él.
 *
 * Solo cuando el valor cambia de verdad. Volver a guardar el mismo número
 * no es una corrección y llenaría el historial de ruido.
 */
create or replace function app.registrar_correccion_kpi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.value is distinct from old.value then
    insert into kpi_value_history (
      kpi_value_id, company_id, company_kpi_id, period,
      valor_anterior, valor_nuevo, nota, changed_by
    )
    values (
      new.id, new.company_id, new.company_kpi_id, new.period,
      old.value, new.value, new.note, auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger kpi_values_historial
  after update on kpi_values
  for each row execute function app.registrar_correccion_kpi();

-- -----------------------------------------------------------------------------
-- 2. El límite
--
-- Un mes cuyo update está `revisado` lo ha mirado IWL y puede haber dado
-- pie a una decisión. La compañía no lo reescribe por su cuenta: pide que
-- se reabra. IWL sí, porque es quien valida y quien responde de ello.
-- -----------------------------------------------------------------------------

create or replace function app.mes_validado(
  target_company uuid,
  target_period date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from monthly_updates
    where company_id = target_company
      and period = target_period
      and status = 'revisado'
  )
$$;

grant execute on function app.mes_validado(uuid, date) to authenticated;

create or replace function app.guard_kpi_mes_validado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
   * Sin sesión no hay a quién restringir: la clave de servicio ya se salta
   * el RLS entero, y la semilla se declara una sesión cuando quiere que
   * esto se aplique.
   */
  if auth.uid() is null then
    return new;
  end if;

  if new.value is distinct from old.value
     and app.mes_validado(new.company_id, new.period)
     and not app.is_iwl() then
    raise exception
      'Ese mes ya lo revisó IWL. Pídeles que lo reabran y podrás corregirlo.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger kpi_values_guard_validado
  before update on kpi_values
  for each row execute function app.guard_kpi_mes_validado();

-- -----------------------------------------------------------------------------
-- 3. La puerta para reabrir
--
-- De IWL, y deja rastro: reabrir un mes revisado es deshacer una
-- validación, y eso tiene que poder explicarse después.
-- -----------------------------------------------------------------------------

create or replace function app.reabrir_update(target_update uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila monthly_updates;
begin
  if not app.is_iwl() then
    raise exception 'Reabrir un mes revisado es del equipo de IWL'
      using errcode = '42501';
  end if;

  select * into fila from monthly_updates where id = target_update;
  if fila.id is null then
    raise exception 'Ese update no existe' using errcode = '23503';
  end if;

  if fila.status <> 'revisado' then
    raise exception 'Ese mes no está revisado: ya se puede corregir'
      using errcode = 'P0001';
  end if;

  update monthly_updates
  set status = 'entregado', reviewed_at = null, reviewed_by = null
  where id = target_update;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    fila.company_id, auth.uid(), 'monthly_updates', target_update, 'reabrir',
    jsonb_build_object('periodo', fila.period)
  );
end;
$$;

do $$
begin
  execute 'revoke all on function app.reabrir_update(uuid) from public, anon';
  execute 'grant execute on function app.reabrir_update(uuid) to authenticated';
end;
$$;

create or replace function public.reabrir_update(target_update uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin perform app.reabrir_update(target_update); end; $$;

do $$
begin
  execute 'revoke all on function public.reabrir_update(uuid) from public, anon';
  execute 'grant execute on function public.reabrir_update(uuid) to authenticated';
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS del historial
--
-- Se lee con la compañía y **no se escribe desde fuera**: lo pone el
-- disparador, que es `security definer`. Sin política de insert, nadie
-- puede fabricar una corrección que no ocurrió.
-- -----------------------------------------------------------------------------

alter table kpi_value_history enable row level security;

create policy kpi_value_history_select on kpi_value_history
  for select to authenticated using (app.can_read_company(company_id));
