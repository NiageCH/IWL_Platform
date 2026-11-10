-- =============================================================================
-- El Anexo como propuesta de Acuerdo, firmar el Acuerdo desde la compañía y
-- el cambio de vía
--
-- Modelo v2, puntos 1 y 10, con las respuestas del 9 nov:
--
--   · La propuesta de Acuerdo es el Anexo en borrador, no un objeto aparte:
--     borrador → propuesto → comentado → aceptado → firmado. El Acuerdo
--     general es fijo y se firma junto al Anexo aceptado.
--   · Firmar el Acuerdo pasa la compañía de entrada a incubación: fija
--     etapa, perfil, fase y recorrido, crea KPI y hoja de ruta. En
--     Aceleración exige lo obligatorio del due diligence validado; en
--     Construcción, no. En las dos, la incorporación en «sí» y el Anexo
--     aceptado.
--   · De Construcción a Aceleración: dirección, con motivo, queda en el
--     registro y avisa al mentor principal.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- El Anexo propuesto: quién lo propuso, quién lo aceptó y quién firma
-- -----------------------------------------------------------------------------

alter table annexes
  add column if not exists propuesto_at timestamptz,
  add column if not exists propuesto_por uuid references profiles(id) on delete set null,
  add column if not exists aceptado_at timestamptz,
  add column if not exists aceptado_por uuid references profiles(id) on delete set null,
  add column if not exists firmantes jsonb not null default '[]'::jsonb;

comment on column annexes.firmantes is
  'Quién firma el Acuerdo: [{nombre, calidad: representante|personal}]. Va en la propuesta, que es lo que ella acepta.';

/*
 * Lo que se propone no se toca. Para cambiarlo, IWL lo devuelve a borrador
 * y lo vuelve a proponer, y una aceptación que hubiera se pierde: lo que
 * ella aceptó ya no es lo que hay.
 *
 * Integridad: vale también con la clave de servicio.
 */
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
     ) then
    raise exception 'Un Anexo propuesto no se edita. Devuélvelo a borrador para cambiarlo y propónselo otra vez.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists annexes_guard_propuesto on annexes;
create trigger annexes_guard_propuesto
  before update on annexes
  for each row execute function app.guard_anexo_propuesto();

/*
 * Por dónde puede ir el estado, y quién lo mueve.
 *
 * · Proponerlo es de IWL. En entrada, con la incorporación en «sí» y con
 *   la duración, las horas y quién firma puestos: se propone algo que
 *   signifique algo.
 * · Aceptarlo es de una fundadora de la compañía, nunca de IWL: nadie
 *   valida su propio trabajo. Sin sesión no se comprueba, que es
 *   autorización.
 * · En entrada se firma solo aceptado, y solo firmando el Acuerdo. En
 *   incubación, IWL puede seguir firmando un borrador, como hasta ahora.
 */
create or replace function app.guard_estado_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tramo tramo_compania;
begin
  if new.status is not distinct from old.status then return new; end if;
  select tramo into v_tramo from companies where id = new.company_id;

  if new.status = 'propuesto' and old.status = 'borrador' then
    if v_tramo = 'entrada' and not exists (
      select 1 from decisiones_incorporacion where company_id = new.company_id and decision = 'si'
    ) then
      raise exception 'Antes de proponer el Acuerdo, dirección tiene que decidir la incorporación.' using errcode = 'P0001';
    end if;
    if new.duration_months is null or new.committed_hours is null then
      raise exception 'Antes de proponerlo, pon al menos la duración y las horas comprometidas.' using errcode = 'P0001';
    end if;
    if v_tramo = 'entrada' and jsonb_array_length(new.firmantes) = 0 then
      raise exception 'Falta decir quién firma el Acuerdo.' using errcode = 'P0001';
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

  if new.status = 'firmado' and (
       old.status = 'aceptado'
       or (old.status = 'borrador' and v_tramo is distinct from 'entrada')
     ) then
    return new;
  end if;

  if new.status = 'cerrado' and old.status = 'firmado' then
    return new;
  end if;

  raise exception 'Un Anexo no pasa de «%» a «%».', old.status, new.status using errcode = 'P0001';
end;
$$;

drop trigger if exists annexes_guard_estado on annexes;
create trigger annexes_guard_estado
  before update of status on annexes
  for each row execute function app.guard_estado_anexo();

-- Proponerlo pasa la candidatura a «Acuerdo propuesto»
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
            jsonb_build_object('version', new.version, 'equity', new.equity_pct, 'horas', new.committed_hours));
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

drop trigger if exists annexes_al_proponer on annexes;
create trigger annexes_al_proponer
  after update of status on annexes
  for each row execute function app.al_proponer_anexo();

/*
 * Un borrador es de IWL. Lo propuesto, aceptado o firmado lo ve quien ve
 * la compañía; el borrador, no, porque todavía no es nada que ella tenga
 * que leer.
 */
drop policy if exists annexes_select on annexes;
create policy annexes_select on annexes
  for select using (app.can_read_company(company_id) and (status <> 'borrador' or app.is_iwl()));

-- Aceptar: con su sesión, que es lo que deja el rastro de quién aceptó
create or replace function app.aceptar_anexo(p_anexo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update annexes set status = 'aceptado'
  where id = p_anexo and status in ('propuesto', 'comentado');
  if not found then
    raise exception 'Esa propuesta ya no está para aceptar: puede que IWL la haya cambiado. Vuelve a cargar la página.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.aceptar_anexo(p_anexo uuid)
returns void
language sql
set search_path = public
as $$ select app.aceptar_anexo(p_anexo) $$;

revoke all on function public.aceptar_anexo(uuid) from public, anon;
grant execute on function public.aceptar_anexo(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Comentar la propuesta, como el NDA
-- -----------------------------------------------------------------------------

alter table avisos add column if not exists para uuid references profiles(id) on delete cascade;
comment on column avisos.para is
  'A quién va, si no es a dirección. Sin valor, el aviso es de dirección.';

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha',
                  'anexo_comentario', 'cambio_via'));

drop policy if exists avisos_direccion on avisos;
create policy avisos_direccion on avisos
  for select using (app.is_admin() or para = auth.uid());

drop policy if exists avisos_cerrar on avisos;
create policy avisos_cerrar on avisos
  for update using (app.is_admin() or para = auth.uid())
  with check (app.is_admin() or para = auth.uid());

create table if not exists anexo_comentarios (
  id uuid primary key default gen_random_uuid(),
  annex_id uuid not null references annexes(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  texto text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now(),
  respuesta text,
  respondido_at timestamptz,
  respondido_por uuid references profiles(id) on delete set null
);

create index if not exists anexo_comentarios_anexo on anexo_comentarios (annex_id, created_at);

alter table anexo_comentarios enable row level security;

drop policy if exists anexo_comentarios_leer on anexo_comentarios;
create policy anexo_comentarios_leer on anexo_comentarios
  for select using (app.is_iwl() or app.can_read_company(company_id));

drop policy if exists anexo_comentarios_comentar on anexo_comentarios;
create policy anexo_comentarios_comentar on anexo_comentarios
  for insert with check (exists (
    select 1 from company_members
    where company_id = anexo_comentarios.company_id and profile_id = auth.uid() and member_role = 'fundadora'
  ));

drop policy if exists anexo_comentarios_responder on anexo_comentarios;
create policy anexo_comentarios_responder on anexo_comentarios
  for update using (app.is_iwl()) with check (app.is_iwl());

create or replace function app.al_comentar_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a annexes%rowtype;
begin
  select * into a from annexes where id = new.annex_id;
  if a.id is null or a.company_id is distinct from new.company_id then
    raise exception 'Ese Anexo no es de esta compañía.' using errcode = 'P0001';
  end if;
  if a.status not in ('propuesto', 'comentado') then
    raise exception 'Esta propuesta ya no se puede comentar.' using errcode = 'P0001';
  end if;

  new.profile_id := coalesce(auth.uid(), new.profile_id);
  new.created_at := now();
  new.respuesta := null;
  new.respondido_at := null;
  new.respondido_por := null;

  update annexes set status = 'comentado' where id = a.id and status = 'propuesto';
  insert into avisos (tipo, company_id, profile_id) values ('anexo_comentario', a.company_id, new.profile_id);
  return new;
end;
$$;

drop trigger if exists anexo_comentarios_al_comentar on anexo_comentarios;
create trigger anexo_comentarios_al_comentar
  before insert on anexo_comentarios
  for each row execute function app.al_comentar_anexo();

create or replace function app.al_responder_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.texto is distinct from old.texto or new.annex_id is distinct from old.annex_id
     or new.company_id is distinct from old.company_id or new.profile_id is distinct from old.profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Un comentario no se edita: se responde.' using errcode = '42501';
  end if;
  new.respondido_at := now();
  new.respondido_por := coalesce(auth.uid(), new.respondido_por);
  return new;
end;
$$;

drop trigger if exists anexo_comentarios_al_responder on anexo_comentarios;
create trigger anexo_comentarios_al_responder
  before update on anexo_comentarios
  for each row execute function app.al_responder_anexo();

create or replace function app.tras_responder_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from anexo_comentarios where company_id = new.company_id and respuesta is null
  ) then
    update avisos set cerrado_at = now(), cerrado_por = new.respondido_por
    where company_id = new.company_id and tipo = 'anexo_comentario' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists anexo_comentarios_tras_responder on anexo_comentarios;
create trigger anexo_comentarios_tras_responder
  after update on anexo_comentarios
  for each row execute function app.tras_responder_anexo();

-- -----------------------------------------------------------------------------
-- Firmar el Acuerdo, desde la compañía en entrada
-- -----------------------------------------------------------------------------

create or replace function app.firmar_acuerdo(
  p_company uuid,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_firmado_on date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  co companies%rowtype;
  a annexes%rowtype;
  v_faltan int;
begin
  if not app.is_iwl() then
    raise exception 'Firmar el Acuerdo es del equipo de IWL.' using errcode = '42501';
  end if;

  select * into co from companies where id = p_company for update;
  if not found or co.tramo is distinct from 'entrada' or co.archived_at is not null then
    raise exception 'El Acuerdo se firma con la compañía en entrada.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from decisiones_incorporacion where company_id = p_company and decision = 'si') then
    raise exception 'Falta la decisión de incorporación en «sí».' using errcode = 'P0001';
  end if;

  select * into a from annexes where company_id = p_company order by version desc limit 1 for update;
  if a.id is null or a.status <> 'aceptado' then
    raise exception 'Falta que ella acepte la propuesta de Acuerdo.' using errcode = 'P0001';
  end if;

  if co.situacion_societaria is null then
    raise exception 'Falta la situación societaria.' using errcode = 'P0001';
  end if;
  if co.situacion_societaria = 'constituida'
     and (co.forma_juridica is null or coalesce(co.denominacion_social, '') = '' or coalesce(co.cif, '') = '') then
    raise exception 'Con sociedad constituida hacen falta la forma jurídica, la denominación social y el CIF.'
      using errcode = 'P0001';
  end if;

  -- La puerta del due diligence, solo en Aceleración
  if co.via = 'aceleracion' then
    select count(*) into v_faltan
    from dd_items
    where company_id = p_company and is_required and status not in ('validado', 'no_aplica');
    if v_faltan > 0 then
      raise exception 'En Aceleración, el Acuerdo pide validado lo obligatorio del due diligence. Faltan %.', v_faltan
        using errcode = 'P0001';
    end if;
  end if;

  update companies
  set stage = p_stage,
      tech_profile = p_tech_profile,
      phase_id = (select id from phases where code = p_phase_code),
      tramo = 'incubacion'
  where id = p_company;

  update annexes set status = 'firmado', signed_on = coalesce(p_firmado_on, current_date) where id = a.id;

  perform app.instanciar_kpis(p_company);
  if p_roadmap_template is not null then
    perform app.instanciar_hoja_de_ruta(p_company, p_roadmap_template, coalesce(p_roadmap_start, current_date), a.id);
  end if;

  update candidaturas
  set estado = 'firmada',
      acuerdo_firmado_on = coalesce(p_firmado_on, current_date),
      equity_pct = a.equity_pct,
      acuerdo_firmantes = a.firmantes
  where company_id = p_company;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    p_company, auth.uid(), 'companies', p_company, 'acuerdo_firmado',
    jsonb_build_object('anexo', a.id, 'via', co.via, 'etapa', p_stage, 'firmantes', a.firmantes)
  );
end;
$$;

create or replace function public.firmar_acuerdo(
  p_company uuid,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_firmado_on date default current_date
)
returns void
language sql
set search_path = public
as $$ select app.firmar_acuerdo(p_company, p_stage, p_tech_profile, p_phase_code, p_roadmap_template, p_roadmap_start, p_firmado_on) $$;

revoke all on function public.firmar_acuerdo(uuid, company_stage, company_tech_profile, text, uuid, date, date) from public, anon;
grant execute on function public.firmar_acuerdo(uuid, company_stage, company_tech_profile, text, uuid, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- De Construcción a Aceleración: con motivo, en el registro y al mentor principal
-- -----------------------------------------------------------------------------

create or replace function app.pasar_a_aceleracion(p_company uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_admin() then
    raise exception 'La vía de entrada la cambia la dirección de IWL' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escribe el motivo: queda en el registro y le llega al mentor principal.' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo_via', trim(p_motivo), true);
  update companies set via = 'aceleracion' where id = p_company and via = 'construccion';
  if not found then
    raise exception 'Solo se pasa a Aceleración desde Construcción.' using errcode = 'P0001';
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'companies', p_company, 'cambio_via',
          jsonb_build_object('de', 'construccion', 'a', 'aceleracion', 'motivo', trim(p_motivo)));

  insert into avisos (tipo, company_id, profile_id, para)
  select 'cambio_via', p_company, auth.uid(), m.profile_id
  from company_members m
  where m.company_id = p_company and m.member_role = 'mentor_principal';
end;
$$;

create or replace function public.pasar_a_aceleracion(p_company uuid, p_motivo text)
returns void
language sql
set search_path = public
as $$ select app.pasar_a_aceleracion(p_company, p_motivo) $$;

revoke all on function public.pasar_a_aceleracion(uuid, text) from public, anon;
grant execute on function public.pasar_a_aceleracion(uuid, text) to authenticated;

/*
 * Redefinición de `20261109151000_tramo_via.sql`: con sesión, la vía solo
 * cambia por `pasar_a_aceleracion`, que es lo que pide el motivo, lo deja
 * en el registro y avisa. Un `update` directo se lo saltaría todo.
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
  -- El acta de comité fija la primera; después, solo con su motivo
  if old.via is not null and coalesce(current_setting('app.motivo_via', true), '') = '' then
    raise exception 'La vía se cambia con «Pasar a Aceleración», que pide el motivo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

/*
 * En entrada, un Anexo nace en borrador. Sin esto, insertar uno ya
 * «aceptado» se saltaba la aceptación de ella. En incubación se sigue
 * pudiendo registrar uno firmado, como hasta ahora: es el mismo atajo que
 * firmar un borrador directamente. Sin sesión no se comprueba.
 */
create or replace function app.guard_anexo_nace_borrador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.status <> 'borrador'
     and exists (select 1 from companies where id = new.company_id and tramo = 'entrada') then
    raise exception 'Un Anexo nace en borrador: se propone, ella lo acepta y se firma.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists annexes_nace_borrador on annexes;
create trigger annexes_nace_borrador
  before insert on annexes
  for each row execute function app.guard_anexo_nace_borrador();
