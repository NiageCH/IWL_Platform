-- =============================================================================
-- No se trabaja sin Acuerdo, y entrar antes cuesta más equity
--
-- Decisión de Rodrigo (REVISION, 10 nov), para las dos vías: el tramo de
-- entrada en Construcción es un diagnóstico corto para decidir, no para
-- construir; el Acuerdo se firma aunque no haya sociedad, con el equity
-- comprometido hasta constituirla.
--
--   1. Tope del tramo de entrada en Construcción, en Programa: 14 días por
--      defecto. Se calcula al leer, como el aviso de revisión del comité.
--   2. Horquilla de equity por vía, en Programa, vacía hasta que Luciana la
--      fije. Salirse al proponer pide motivo, que queda en el registro.
--   3. Sin sociedad, el equity es «Comprometido» y proponer el Anexo exige
--      el hito «Constituir la sociedad» con fecha. Al constituirse, pasa a
--      «Materializado» con la fecha.
--   4. Las horas, solo desde la firma del Acuerdo.
-- =============================================================================

insert into platform_settings (key, value, description) values
  ('entrada_tope_construccion_dias', '14'::jsonb,
   'Días que puede estar en entrada una compañía de Construcción antes de que avise: Atención al llegar, Vencido a la semana'),
  ('equity_horquilla', '{}'::jsonb,
   'Horquilla de equity por vía, {"aceleracion": {"min": x, "max": y}, "construccion": {...}}. Vacía, no se comprueba')
on conflict (key) do nothing;

alter table annexes
  add column if not exists equity_fuera_motivo text,
  add column if not exists equity_materializado_on date;

comment on column annexes.equity_fuera_motivo is
  'Por qué el equity propuesto se sale de la horquilla de su vía. Obligatorio para proponerlo si se sale.';
comment on column annexes.equity_materializado_on is
  'Cuándo se materializó el equity comprometido: el día en que la sociedad quedó constituida.';

/*
 * Redefinición de `20261110150000_anexo_siempre_aceptado.sql`. Al proponer,
 * además:
 *   · la horquilla de su vía, si está fijada: fuera de ella, el motivo;
 *   · sin sociedad, el hito «Constituir la sociedad» con fecha, que queda
 *     como hito de este Anexo.
 */
create or replace function app.guard_estado_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co companies%rowtype;
  v_horquilla jsonb;
  v_min numeric;
  v_max numeric;
begin
  if new.status is not distinct from old.status then return new; end if;
  select * into co from companies where id = new.company_id;

  if new.status = 'propuesto' and old.status = 'borrador' then
    if co.tramo = 'entrada' and not exists (
      select 1 from decisiones_incorporacion where company_id = new.company_id and decision = 'si'
    ) then
      raise exception 'Antes de proponer el Acuerdo, dirección tiene que decidir la incorporación.' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from company_members where company_id = new.company_id and member_role = 'fundadora'
    ) then
      raise exception 'Para proponérselo, ella tiene que tener cuenta en la plataforma: es donde lo lee y lo acepta. Dale acceso primero.'
        using errcode = 'P0001';
    end if;
    if new.duration_months is null or new.committed_hours is null then
      raise exception 'Antes de proponerlo, pon al menos la duración y las horas comprometidas.' using errcode = 'P0001';
    end if;
    if jsonb_array_length(new.firmantes) = 0 then
      raise exception 'Falta decir quién firma el Acuerdo.' using errcode = 'P0001';
    end if;

    -- La horquilla de su vía, si Luciana la ha fijado
    if co.via is not null and new.equity_pct is not null then
      select value -> co.via::text into v_horquilla from platform_settings where key = 'equity_horquilla';
      v_min := nullif(v_horquilla ->> 'min', '')::numeric;
      v_max := nullif(v_horquilla ->> 'max', '')::numeric;
      if ((v_min is not null and new.equity_pct < v_min) or (v_max is not null and new.equity_pct > v_max))
         and length(trim(coalesce(new.equity_fuera_motivo, ''))) = 0 then
        raise exception 'El equity se sale de la horquilla de %: escribe por qué. Queda en el registro.',
          case co.via when 'aceleracion' then 'Aceleración' else 'Construcción' end
          using errcode = 'P0001';
      end if;
    end if;

    -- Sin sociedad, el equity se materializa al constituir: el hito, con fecha
    if co.situacion_societaria in ('sin_constituir', 'en_constitucion') then
      if not exists (
        select 1 from milestones
        where company_id = new.company_id and origin = 'societario' and due_date is not null
      ) then
        raise exception 'Sin sociedad, el equity queda comprometido hasta constituirla: pon la fecha prevista del hito «Constituir la sociedad».'
          using errcode = 'P0001';
      end if;
      update milestones set annex_id = new.id
      where company_id = new.company_id and origin = 'societario' and annex_id is null;
    end if;

    new.propuesto_at := now();
    new.propuesto_por := coalesce(auth.uid(), new.propuesto_por);
    new.aceptado_at := null;
    new.aceptado_por := null;
    return new;
  end if;

  if new.status = 'comentado' and old.status in ('propuesto', 'comentado') then
    return new;
  end if;

  if new.status = 'aceptado' and old.status in ('propuesto', 'comentado') then
    if auth.uid() is not null and not exists (
      select 1 from company_members
      where company_id = new.company_id and profile_id = auth.uid() and member_role = 'fundadora'
    ) then
      raise exception 'La propuesta la acepta la fundadora.' using errcode = '42501';
    end if;
    new.aceptado_at := now();
    new.aceptado_por := coalesce(auth.uid(), new.aceptado_por);
    return new;
  end if;

  if new.status = 'borrador' and old.status in ('propuesto', 'comentado', 'aceptado') then
    new.propuesto_at := null;
    new.propuesto_por := null;
    new.aceptado_at := null;
    new.aceptado_por := null;
    return new;
  end if;

  if new.status = 'firmado' and old.status = 'aceptado' then
    return new;
  end if;

  if new.status = 'cerrado' and old.status = 'firmado' then
    return new;
  end if;

  if new.status = 'firmado' then
    raise exception 'Un Anexo se firma cuando ella lo ha aceptado: propónselo primero.' using errcode = 'P0001';
  end if;
  raise exception 'Un Anexo no pasa de «%» a «%».', old.status, new.status using errcode = 'P0001';
end;
$$;

/*
 * Redefinición de `20261110141000_anexo_propuesta_y_acuerdo.sql`: el motivo
 * de salirse de la horquilla va al registro con la propuesta.
 */
create or replace function app.al_proponer_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'propuesto' and old.status = 'borrador' then
    update candidaturas
    set estado = 'acuerdo', acuerdo_propuesto_on = current_date
    where company_id = new.company_id and estado = 'entrada';

    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (new.company_id, auth.uid(), 'annexes', new.id, 'proponer',
            jsonb_strip_nulls(jsonb_build_object(
              'version', new.version, 'equity', new.equity_pct, 'horas', new.committed_hours,
              'fuera_de_horquilla', nullif(trim(coalesce(new.equity_fuera_motivo, '')), ''))));
  elsif new.status = 'aceptado' then
    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (new.company_id, auth.uid(), 'annexes', new.id, 'aceptar', jsonb_build_object('version', new.version));
  elsif new.status = 'borrador' and old.status <> 'borrador' then
    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (new.company_id, auth.uid(), 'annexes', new.id, 'volver_a_borrador',
            jsonb_build_object('version', new.version, 'estaba', old.status));
  end if;
  return new;
end;
$$;

-- El motivo forma parte de lo propuesto: tampoco se cambia sin volver a borrador
create or replace function app.guard_anexo_propuesto()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('propuesto', 'comentado', 'aceptado')
     and new.status in ('propuesto', 'comentado', 'aceptado')
     and (
          new.duration_months is distinct from old.duration_months
       or new.starts_on is distinct from old.starts_on
       or new.ends_on is distinct from old.ends_on
       or new.committed_hours is distinct from old.committed_hours
       or new.committed_hours_value is distinct from old.committed_hours_value
       or new.committed_cash is distinct from old.committed_cash
       or new.committed_seniors is distinct from old.committed_seniors
       or new.equity_pct is distinct from old.equity_pct
       or new.other_commitments is distinct from old.other_commitments
       or new.firmantes is distinct from old.firmantes
       or new.equity_fuera_motivo is distinct from old.equity_fuera_motivo
     ) then
    raise exception 'Un Anexo propuesto no se edita. Devuélvelo a borrador para cambiarlo y propónselo otra vez.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Al constituirse la sociedad, el equity comprometido se materializa
-- -----------------------------------------------------------------------------

create or replace function app.al_constituir_sociedad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.situacion_societaria = 'constituida'
     and old.situacion_societaria in ('sin_constituir', 'en_constitucion') then
    update annexes
    set equity_materializado_on = current_date
    where company_id = new.id and equity_materializado_on is null
      and status in ('propuesto', 'comentado', 'aceptado', 'firmado');

    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (new.id, auth.uid(), 'companies', new.id, 'equity_materializado',
            jsonb_build_object('el', current_date));
  end if;
  return new;
end;
$$;

drop trigger if exists companies_al_constituir on companies;
create trigger companies_al_constituir
  after update of situacion_societaria on companies
  for each row execute function app.al_constituir_sociedad();

-- -----------------------------------------------------------------------------
-- Las horas, solo desde la firma del Acuerdo
--
-- En entrada no hay Acuerdo, así que no hay horas que imputar. En una que
-- vino por el embudo, tampoco anteriores a su firma. Las compañías de antes,
-- sin candidatura firmada, no cambian. Integridad: vale también sin sesión.
-- -----------------------------------------------------------------------------

create or replace function app.guard_horas_sin_acuerdo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tramo tramo_compania;
  v_firma date;
begin
  select tramo into v_tramo from companies where id = new.company_id;
  if v_tramo = 'entrada' then
    raise exception 'Todavía no hay Acuerdo firmado: las horas de acompañamiento cuentan desde la firma.'
      using errcode = 'P0001';
  end if;

  select acuerdo_firmado_on into v_firma
  from candidaturas where company_id = new.company_id and acuerdo_firmado_on is not null
  limit 1;
  if v_firma is not null and new.worked_on < v_firma then
    raise exception 'Las horas cuentan desde la firma del Acuerdo, el %: esa fecha es anterior.',
      to_char(v_firma, 'DD/MM/YYYY') using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists contribution_hours_sin_acuerdo on contribution_hours;
create trigger contribution_hours_sin_acuerdo
  before insert or update of worked_on, company_id on contribution_hours
  for each row execute function app.guard_horas_sin_acuerdo();
