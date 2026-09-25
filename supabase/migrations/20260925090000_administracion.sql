-- =============================================================================
-- 010 · Administración
--
-- Lo que hasta ahora se hacía por SQL o por script: dar de alta una compañía,
-- asignar a su gente y mover la configuración que gobierna los cálculos.
--
-- Y los umbrales del estado invertible, que vivían en una constante de
-- TypeScript. Ahí no los puede tocar IWL, y son suyos: el documento define
-- «invertible» en prosa y deja los números abiertos.
-- =============================================================================

insert into platform_settings (key, value, description) values
  ('umbrales_invertible',
   '{
      "score_tecnico_minimo": 80,
      "score_preparacion_minimo": 80,
      "runway_minimo_meses": 6
    }'::jsonb,
   'Umbrales del estado invertible (§3). Los hallazgos críticos abiertos y los hitos del Anexo que condicionan el estado bloquean siempre, con independencia de estos números.')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Alta de una compañía
--
-- Crear la fila es lo de menos: una compañía sin checklist, sin secciones de
-- business plan y sin KPI activados es una ficha vacía en la que no se puede
-- trabajar. Las tres instanciaciones van juntas y en la misma transacción,
-- para que no pueda quedar a medias.
-- -----------------------------------------------------------------------------

create or replace function app.crear_compania(
  p_name text,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text,
  p_sector text default null,
  p_one_liner text default null,
  p_cohort_id uuid default null,
  p_female_leadership_pct numeric default null,
  p_founded_on date default null,
  p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nueva_id uuid;
  org_id uuid;
  fase_id uuid;
begin
  if not app.is_iwl() then
    raise exception 'Dar de alta una compañía es del equipo de IWL'
      using errcode = '42501';
  end if;

  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'El identificador de la compañía se escribe en minúsculas y con guiones, como «marea-clinica»'
      using errcode = '22023';
  end if;

  select id into org_id from organizations where slug = 'iwl';
  if org_id is null then
    raise exception 'No existe la organización de IWL' using errcode = '23503';
  end if;

  select id into fase_id from phases where code = p_phase_code;

  insert into companies (
    organization_id, cohort_id, name, slug, sector, one_liner,
    phase_id, stage, tech_profile, female_leadership_pct, founded_on, website,
    created_by
  ) values (
    org_id, p_cohort_id, p_name, p_slug, p_sector, p_one_liner,
    fase_id, p_stage, p_tech_profile, p_female_leadership_pct, p_founded_on,
    p_website, auth.uid()
  )
  returning id into nueva_id;

  -- Sin esto, la compañía nace sin nada en lo que trabajar
  perform app.instanciar_checklist_dd(nueva_id);
  perform app.instanciar_business_plan(nueva_id);
  perform app.instanciar_kpis(nueva_id);

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    nueva_id, auth.uid(), 'companies', nueva_id, 'alta',
    jsonb_build_object('nombre', p_name, 'etapa', p_stage)
  );

  return nueva_id;
end;
$$;

grant execute on function app.crear_compania(
  text, text, company_stage, company_tech_profile, text, text, text, uuid,
  numeric, date, text
) to authenticated;

/*
 * La aplicación llama a la función por PostgREST, que solo expone el esquema
 * `public`. `app` se queda para lo interno; aquí va la puerta, que no hace
 * nada más que delegar.
 */
create or replace function public.crear_compania(
  p_name text,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text,
  p_sector text default null,
  p_one_liner text default null,
  p_cohort_id uuid default null,
  p_female_leadership_pct numeric default null,
  p_founded_on date default null,
  p_website text default null
)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select app.crear_compania(
    p_name, p_slug, p_stage, p_tech_profile, p_phase_code,
    p_sector, p_one_liner, p_cohort_id, p_female_leadership_pct,
    p_founded_on, p_website
  )
$$;

revoke all on function public.crear_compania(
  text, text, company_stage, company_tech_profile, text, text, text, uuid,
  numeric, date, text
) from public, anon;

grant execute on function public.crear_compania(
  text, text, company_stage, company_tech_profile, text, text, text, uuid,
  numeric, date, text
) to authenticated;

-- -----------------------------------------------------------------------------
-- Activar los KPI de un perfil cuando cambia
--
-- Una compañía que empieza a facturar necesita los KPI de ingresos, y una que
-- pasa de software a hardware necesita los suyos. `instanciar_kpis` es
-- idempotente, así que se puede volver a llamar sin duplicar nada.
-- -----------------------------------------------------------------------------

create or replace function app.activar_kpis_de_sector(
  target_company uuid,
  codigos text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creados integer;
begin
  if not app.is_iwl() then
    raise exception 'Activar KPI es del equipo de IWL' using errcode = '42501';
  end if;

  insert into company_kpis (company_id, kpi_id, order_index)
  select target_company, k.id, k.order_index
  from kpi_definitions k
  where k.code = any(codigos) and k.is_active and not k.is_derived
  on conflict do nothing;

  get diagnostics creados = row_count;
  return creados;
end;
$$;

grant execute on function app.activar_kpis_de_sector(uuid, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Vista de administración de personas
--
-- Junta el perfil con sus asignaciones, que es como se mira: «quién es esta
-- persona y a qué proyectos está asignada».
-- -----------------------------------------------------------------------------

create or replace view admin_personas as
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.created_at,
  o.name as organization_name,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'company_id', c.id,
          'company_name', c.name,
          'company_slug', c.slug,
          'member_role', m.member_role
        )
        order by c.name
      )
      from company_members m
      join companies c on c.id = m.company_id
      where m.profile_id = p.id
    ),
    '[]'::jsonb
  ) as asignaciones
from profiles p
left join organizations o on o.id = p.organization_id;

alter view admin_personas set (security_invoker = true);
grant select on admin_personas to authenticated;

-- -----------------------------------------------------------------------------
-- Cohortes: escritura desde la administración
-- -----------------------------------------------------------------------------

comment on table cohorts is
  'Cohortes del programa. El objetivo interno de compañías invertibles al cierre se fija aquí y se enseña en el dashboard.';
