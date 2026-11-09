-- =============================================================================
-- Situación societaria: proyectos sin sociedad constituida
--
-- Siren no tiene SL, y no será la única. La plataforma daba por hecho una
-- sociedad: le pedía la escritura y el libro de actas, y el Acuerdo compra
-- participaciones que todavía no existen. Ahora cada proyecto dice desde
-- dónde parte, y eso cambia qué se le pide y qué hito tiene por delante.
--
-- Lo que hay aquí:
--   · La situación, en la candidatura y en la compañía.
--   · Los puntos de due diligence que exigen sociedad pasan a «No aplica»
--     sin ella, y entran los que la sustituyen.
--   · Un hito «Constituir la sociedad» que, al cumplirse, la da por
--     constituida y vuelve a pedir lo societario.
--   · Quién firma el Acuerdo: a título personal o en nombre de la sociedad.
--
-- La cláusula de equity para este caso la define Luciana con asesoría
-- legal. La plataforma solo refleja el estado; no redacta nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- La situación
-- -----------------------------------------------------------------------------

alter table candidaturas
  add column if not exists situacion_societaria situacion_societaria,
  add column if not exists constitucion_prevista date,
  add column if not exists forma_juridica forma_juridica,
  add column if not exists denominacion_social text,
  add column if not exists cif text,
  -- Quién firma el Acuerdo: [{nombre, calidad: 'personal' | 'representante'}]
  add column if not exists acuerdo_firmantes jsonb not null default '[]';

alter table companies
  add column if not exists situacion_societaria situacion_societaria,
  add column if not exists constitucion_prevista date,
  add column if not exists forma_juridica forma_juridica,
  add column if not exists denominacion_social text,
  add column if not exists cif text;

-- En constitución sin fecha prevista no dice nada: la fecha es la del hito
alter table candidaturas drop constraint if exists constitucion_con_fecha;
alter table candidaturas add constraint constitucion_con_fecha
  check (situacion_societaria is distinct from 'en_constitucion' or constitucion_prevista is not null);

alter table companies drop constraint if exists constitucion_con_fecha;
alter table companies add constraint constitucion_con_fecha
  check (situacion_societaria is distinct from 'en_constitucion' or constitucion_prevista is not null);

comment on column companies.situacion_societaria is
  'Desde dónde parte el proyecto. Nulo es que no se ha dicho. Sin sociedad, lo societario no aplica y hay un hito para constituirla.';

-- -----------------------------------------------------------------------------
-- Qué puntos dependen de que haya sociedad
-- -----------------------------------------------------------------------------

alter table dd_item_templates
  add column if not exists requiere_sociedad boolean not null default false,
  add column if not exists solo_sin_sociedad boolean not null default false;

comment on column dd_item_templates.requiere_sociedad is
  'Sin sociedad constituida no se puede pedir: pasa a «No aplica».';
comment on column dd_item_templates.solo_sin_sociedad is
  'Solo se pide a proyectos sin sociedad: sustituye a lo societario.';

update dd_item_templates
set requiere_sociedad = true
where code in ('sl_escritura', 'sl_pacto_socios', 'sl_cap_table', 'sl_actas', 'fin_cuentas');

-- Lo que se pide en su lugar
insert into dd_item_templates (area_id, code, title, description, is_required, order_index, solo_sin_sociedad)
select a.id, v.code, v.title, v.description, true, v.orden, true
from dd_areas a
cross join (values
  ('sl_pacto_fundadoras', 'Pacto entre fundadoras',
   'Cómo prevén repartirse la sociedad cuando se constituya, y qué aporta cada una mientras tanto.', 10),
  ('sl_titularidad', 'Titularidad de lo construido',
   'A nombre de quién están hoy el código, la marca y el dominio, y el compromiso de aportarlos a la sociedad.', 11)
) as v(code, title, description, orden)
where a.code = 'societario_legal'
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- El checklist de una compañía nueva no lleva lo que sustituye a la sociedad
--
-- Redefinición de `20260923140000_dd_general_dataroom.sql`: igual, salvo
-- que no instancia lo de «solo sin sociedad». Eso lo pone `ajustar_societario`
-- cuando hace falta, que sabe en qué situación está la compañía.
-- -----------------------------------------------------------------------------

create or replace function app.instanciar_checklist_dd(target_company uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creados integer;
begin
  insert into dd_items (
    company_id, area_id, template_id, title, description,
    is_required, validity_months
  )
  select
    target_company, t.area_id, t.id, t.title, t.description,
    t.is_required, t.validity_months
  from dd_item_templates t
  join dd_areas a on a.id = t.area_id
  where t.is_active and a.is_active and not t.solo_sin_sociedad
  on conflict (company_id, template_id) do nothing;

  get diagnostics creados = row_count;
  return creados;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ajustar una compañía a su situación
--
-- Se llama al crearla y cada vez que cambia la situación o la fecha
-- prevista. Es idempotente: pasarla dos veces deja lo mismo.
--
-- Solo toca lo que no ha empezado. Un punto ya entregado no pasa a «No
-- aplica» aunque la situación cambie: lo entregado no se esconde.
-- -----------------------------------------------------------------------------

create or replace function app.ajustar_societario(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_situacion situacion_societaria;
  v_prevista date;
  v_motivo constant text := 'No aplica: el proyecto todavía no tiene sociedad constituida.';
begin
  select situacion_societaria, constitucion_prevista
    into v_situacion, v_prevista
  from companies where id = p_company;

  -- Sin decir, se deja como está: no se adivina
  if v_situacion is null then return; end if;

  if v_situacion <> 'constituida' then
    update dd_items i
    set status = 'no_aplica', notes = v_motivo
    from dd_item_templates t
    where i.template_id = t.id and i.company_id = p_company
      and t.requiere_sociedad and i.status = 'pendiente';

    insert into dd_items (company_id, area_id, template_id, title, description, is_required, validity_months)
    select p_company, t.area_id, t.id, t.title, t.description, t.is_required, t.validity_months
    from dd_item_templates t
    where t.solo_sin_sociedad and t.is_active
    on conflict (company_id, template_id) do nothing;

    if exists (select 1 from milestones where company_id = p_company and origin = 'societario') then
      update milestones set due_date = v_prevista
      where company_id = p_company and origin = 'societario' and status <> 'cumplido';
    else
      insert into milestones (company_id, title, success_criteria, description, due_date, origin, status)
      values (
        p_company,
        'Constituir la sociedad',
        'Escritura de constitución firmada y CIF asignado.',
        'Lo pone la plataforma porque el proyecto todavía no tiene sociedad. Al darlo por cumplido, la compañía pasa a constituida y se le piden los datos y los documentos societarios.',
        v_prevista,
        'societario',
        'pendiente'
      );
    end if;
  else
    -- Constituida: lo societario se vuelve a pedir
    update dd_items i
    set status = 'pendiente', notes = null
    from dd_item_templates t
    where i.template_id = t.id and i.company_id = p_company
      and t.requiere_sociedad and i.status = 'no_aplica' and i.notes = v_motivo;

    update milestones set status = 'cumplido'
    where company_id = p_company and origin = 'societario' and status <> 'cumplido';
  end if;
end;
$$;

create or replace function app.al_cambiar_situacion_compania()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.situacion_societaria is distinct from old.situacion_societaria
     or new.constitucion_prevista is distinct from old.constitucion_prevista then
    perform app.ajustar_societario(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists companies_situacion_societaria on companies;
create trigger companies_situacion_societaria
  after update on companies
  for each row execute function app.al_cambiar_situacion_compania();

-- -----------------------------------------------------------------------------
-- Cumplir «Constituir la sociedad» la da por constituida
--
-- Quien lo cumple es quien coordina el proyecto o IWL, como cualquier hito.
-- Los datos de la sociedad no se adivinan: la ficha los pide hasta que
-- estén.
-- -----------------------------------------------------------------------------

create or replace function app.al_cumplir_constitucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.origin = 'societario' and new.status = 'cumplido'
     and old.status is distinct from 'cumplido' then
    update companies
    set situacion_societaria = 'constituida'
    where id = new.company_id and situacion_societaria is distinct from 'constituida';
  end if;
  return new;
end;
$$;

drop trigger if exists milestones_constitucion on milestones;
create trigger milestones_constitucion
  after update on milestones
  for each row execute function app.al_cumplir_constitucion();

-- -----------------------------------------------------------------------------
-- Quién cambia la situación
--
-- Redefinición de `20261029150000_guardas_sin_sesion.sql`: además de la
-- etapa, la fase y la cohorte, la situación societaria y sus datos son de
-- IWL. Salvo cuando la cambia la propia base al cumplirse el hito
-- —`pg_trigger_depth() > 1`—, que es la forma de que quien coordina pueda
-- dar la sociedad por constituida sin poder escribir la situación a mano.
-- -----------------------------------------------------------------------------

create or replace function app.guard_company_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or app.is_iwl() then
    return new;
  end if;

  if new.stage is distinct from old.stage
     or new.phase_id is distinct from old.phase_id
     or new.cohort_id is distinct from old.cohort_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'La etapa, la fase y la cohorte las fija el equipo de IWL'
      using errcode = '42501';
  end if;

  if pg_trigger_depth() <= 1 and (
       new.situacion_societaria is distinct from old.situacion_societaria
       or new.constitucion_prevista is distinct from old.constitucion_prevista
       or new.forma_juridica is distinct from old.forma_juridica
       or new.denominacion_social is distinct from old.denominacion_social
       or new.cif is distinct from old.cif) then
    raise exception 'La situación societaria la fija el equipo de IWL'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Un punto «No aplica» lo decide quien valida
--
-- Redefinición de `20261029150000_guardas_sin_sesion.sql`. Sin esto, la
-- fundadora podía quitarse puntos de encima marcándolos como no aplicables.
-- -----------------------------------------------------------------------------

create or replace function app.guard_no_aplica_dd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 then return new; end if;

  if (new.status = 'no_aplica' or (tg_op = 'UPDATE' and old.status = 'no_aplica'))
     and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end)
     and not app.can_validate_company(new.company_id) then
    raise exception 'Que un punto no aplique lo decide quien valida el due diligence'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists dd_items_guard_no_aplica on dd_items;
create trigger dd_items_guard_no_aplica
  before insert or update on dd_items
  for each row execute function app.guard_no_aplica_dd();

-- -----------------------------------------------------------------------------
-- Lo que se le pide a una candidata, según su situación
--
-- El due diligence de selección se pide en el NDA, antes de que haya
-- compañía. Sin sociedad, no se le pide lo societario y sí lo que lo
-- sustituye. Lo que ya tiene documentos no se quita.
-- -----------------------------------------------------------------------------

create or replace function app.ajustar_peticiones_societarias(p_candidatura uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_situacion situacion_societaria;
begin
  select situacion_societaria into v_situacion from candidaturas where id = p_candidatura;
  if v_situacion is null then return; end if;

  -- Todavía no se le ha pedido nada: lo hará `pedir_due_diligence` al llegar al NDA
  if not exists (select 1 from candidatura_peticiones where candidatura_id = p_candidatura) then
    return;
  end if;

  delete from candidatura_peticiones p
  using dd_item_templates t
  where p.item_template_id = t.id and p.candidatura_id = p_candidatura
    and (case when v_situacion = 'constituida' then t.solo_sin_sociedad else t.requiere_sociedad end)
    and not exists (select 1 from candidatura_documentos d where d.peticion_id = p.id);

  insert into candidatura_peticiones (candidatura_id, item_template_id, area, titulo, detalle, obligatoria, orden)
  select p_candidatura, t.id, a.name, t.title, t.description, coalesce(t.is_required, false),
         a.order_index * 100 + t.order_index
  from dd_item_templates t
  join dd_areas a on a.id = t.area_id
  where coalesce(t.is_active, true)
    and (case when v_situacion = 'constituida' then t.requiere_sociedad else t.solo_sin_sociedad end)
    and not exists (
      select 1 from candidatura_peticiones p
      where p.candidatura_id = p_candidatura and p.item_template_id = t.id
    );
end;
$$;

/*
 * Redefinición de `20261001150000_documentacion_candidata.sql`: no pide lo
 * que solo es para proyectos sin sociedad, y después se ajusta a la
 * situación de la candidata.
 */
create or replace function app.pedir_due_diligence(p_candidatura uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuantas int;
begin
  select count(*) into v_cuantas
  from candidatura_peticiones where candidatura_id = p_candidatura;

  if v_cuantas > 0 then
    return 0;
  end if;

  insert into candidatura_peticiones (
    candidatura_id, item_template_id, area, titulo, detalle, obligatoria, orden
  )
  select
    p_candidatura, t.id, a.name, t.title, t.description,
    coalesce(t.is_required, false), a.order_index * 100 + t.order_index
  from dd_item_templates t
  join dd_areas a on a.id = t.area_id
  where coalesce(t.is_active, true) and not t.solo_sin_sociedad
  order by a.order_index, t.order_index;

  get diagnostics v_cuantas = row_count;

  perform app.ajustar_peticiones_societarias(p_candidatura);
  return v_cuantas;
end;
$$;

create or replace function app.al_cambiar_situacion_candidatura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.situacion_societaria is distinct from old.situacion_societaria then
    perform app.ajustar_peticiones_societarias(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists candidaturas_situacion_societaria on candidaturas;
create trigger candidaturas_situacion_societaria
  after update on candidaturas
  for each row execute function app.al_cambiar_situacion_candidatura();

-- -----------------------------------------------------------------------------
-- Firmar: la situación y quién firma son obligatorios, y pasan a la compañía
--
-- Redefinición de `20261001100000_candidaturas.sql`, igual hasta crear la
-- compañía. Después copia la situación y ajusta lo que depende de ella.
-- -----------------------------------------------------------------------------

create or replace function app.firmar_candidatura(
  p_candidatura uuid,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_firmado_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_company uuid;
begin
  if not app.is_iwl() then
    raise exception 'Firmar un acuerdo es del equipo de IWL.'
      using errcode = '42501';
  end if;

  select * into c from candidaturas where id = p_candidatura for update;

  if not found then
    raise exception 'Esa candidatura no existe.' using errcode = 'P0001';
  end if;

  if c.company_id is not null then
    raise exception 'Esa candidatura ya tiene compañía.' using errcode = 'P0001';
  end if;

  if c.estado = 'descartada' then
    raise exception 'Esa candidatura está descartada. Reábrela antes de firmar.'
      using errcode = 'P0001';
  end if;

  if c.situacion_societaria is null then
    raise exception 'Falta la situación societaria: di si hay sociedad, si está en constitución o si no la hay.'
      using errcode = 'P0001';
  end if;

  if c.situacion_societaria = 'constituida'
     and (c.forma_juridica is null or coalesce(c.denominacion_social, '') = '' or coalesce(c.cif, '') = '') then
    raise exception 'Con sociedad constituida hacen falta la forma jurídica, la denominación social y el CIF.'
      using errcode = 'P0001';
  end if;

  if jsonb_array_length(coalesce(c.acuerdo_firmantes, '[]')) = 0 then
    raise exception 'Falta decir quién firma el Acuerdo.' using errcode = 'P0001';
  end if;

  v_company := app.crear_compania(
    p_name              => c.nombre,
    p_slug              => p_slug,
    p_stage             => p_stage,
    p_tech_profile      => p_tech_profile,
    p_phase_code        => p_phase_code,
    p_entry_state       => coalesce(c.estado_verificado, c.estado_declarado),
    p_roadmap_template  => p_roadmap_template,
    p_roadmap_start     => p_roadmap_start,
    p_sector            => c.sector,
    p_one_liner         => c.one_liner,
    p_cohort_id         => c.cohort_id,
    p_female_leadership_pct => c.liderazgo_femenino_pct,
    p_founded_on        => null,
    p_website           => c.website
  );

  -- La situación pasa a la compañía; el disparador ajusta lo que depende de ella
  update companies
  set situacion_societaria = c.situacion_societaria,
      constitucion_prevista = c.constitucion_prevista,
      forma_juridica = c.forma_juridica,
      denominacion_social = c.denominacion_social,
      cif = c.cif
  where id = v_company;

  update candidaturas
  set company_id = v_company,
      estado = 'firmada',
      acuerdo_firmado_on = coalesce(p_firmado_on, current_date)
  where id = p_candidatura;

  return v_company;
end;
$$;

-- -----------------------------------------------------------------------------
-- Las vistas, desde su última definición
-- -----------------------------------------------------------------------------

-- `embudo_candidaturas`, de `20261105140000_candidatura_demo.sql`
drop view if exists embudo_candidaturas;

create view embudo_candidaturas as
select
  c.*,
  co.name as cohorte,
  comp.slug as company_slug,
  (
    select count(*) from candidatura_enlaces e where e.candidatura_id = c.id
  ) as enlaces,
  (
    select max(ev.ocurrido_on)
    from candidatura_eventos ev
    where ev.candidatura_id = c.id
  ) as ultimo_movimiento
from candidaturas c
join cohorts co on co.id = c.cohort_id
left join companies comp on comp.id = c.company_id;

alter view embudo_candidaturas set (security_invoker = true);
grant select on embudo_candidaturas to authenticated;

-- `admin_companias`, de `20260930120000_logos.sql`, con la situación
drop view if exists admin_companias;

create view admin_companias as
select
  c.id,
  c.name,
  c.slug,
  c.sector,
  c.stage,
  c.tech_profile,
  c.entry_state,
  c.one_liner,
  c.website,
  c.founded_on,
  c.female_leadership_pct,
  c.phase_id,
  c.cohort_id,
  c.created_at,
  c.archived_at,
  c.archive_reason,
  c.logo_path,
  c.situacion_societaria,
  c.constitucion_prevista,
  c.forma_juridica,
  c.denominacion_social,
  c.cif,
  f.name as phase_name,
  co.name as cohort_name,
  app.compania_tiene_actividad(c.id) as tiene_actividad,
  (select count(*) from roadmap_stages s where s.company_id = c.id) as etapas,
  (
    select jsonb_agg(
      jsonb_build_object(
        'profile_id',     pr.id,
        'full_name',      pr.full_name,
        'job_title',      pr.job_title,
        'member_role',    m.member_role,
        'title',          m.title,
        'assigned_hours', m.assigned_hours,
        'imputadas',      coalesce(h.horas, 0)
      ) order by m.member_role, pr.full_name
    )
    from company_members m
    join profiles pr on pr.id = m.profile_id
    left join lateral (
      select sum(ch.hours) as horas
      from contribution_hours ch
      where ch.company_id = m.company_id and ch.profile_id = m.profile_id
    ) h on true
    where m.company_id = c.id
  ) as equipo
from companies c
left join phases f on f.id = c.phase_id
left join cohorts co on co.id = c.cohort_id;

alter view admin_companias set (security_invoker = true);
grant select on admin_companias to authenticated;
