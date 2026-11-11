-- =============================================================================
-- Los apellidos, donde se identifica a la persona
--
-- (REVISION, 11 nov) Las fichas y listas de IWL enseñan nombre y apellidos.
-- `admin_personas` se recrea desde su **última** definición
-- (`20261002170000_vista_personas_cv.sql`); la única diferencia es
-- `last_name`.
-- =============================================================================

drop view if exists admin_personas;

create view admin_personas as
select
  p.id,
  p.email,
  p.full_name,
  p.last_name,
  p.job_title,
  p.expertise,
  p.bio,
  p.cv_path,
  p.role,
  p.is_active,
  p.archived_at,
  p.created_at,
  o.name as organization_name,
  app.persona_tiene_actividad(p.id) as tiene_actividad,
  app.puede_cambiar_correo(p.id)    as correo_editable,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'company_id',   c.id,
          'company_name', c.name,
          'company_slug', c.slug,
          'archivada',    c.archived_at is not null,
          'member_role',  m.member_role,
          'title',        m.title,
          'assigned_hours', m.assigned_hours,
          'rate_profile', m.rate_profile,
          'starts_on',    m.starts_on,
          'ends_on',      m.ends_on,
          'imputadas',    coalesce(h.horas, 0),
          'tareas_abiertas', coalesce(t.abiertas, 0)
        )
        order by c.name
      )
      from company_members m
      join companies c on c.id = m.company_id
      left join lateral (
        select sum(ch.hours) as horas
        from contribution_hours ch
        where ch.company_id = m.company_id and ch.profile_id = m.profile_id
      ) h on true
      left join lateral (
        select count(*) as abiertas
        from tasks tk
        where tk.company_id = m.company_id
          and tk.owner_id = m.profile_id
          and tk.status in ('pendiente', 'en_curso', 'bloqueada')
      ) t on true
      where m.profile_id = p.id
    ),
    '[]'::jsonb
  ) as asignaciones
from profiles p
left join organizations o on o.id = p.organization_id;

alter view admin_personas set (security_invoker = true);
grant select on admin_personas to authenticated;

-- `admin_companias`, desde su última definición
-- (`20261109120000_situacion_societaria.sql`): el equipo de cada compañía
-- lleva también los apellidos. Mismas columnas; cambia el contenido de
-- `equipo`.
create or replace view admin_companias as
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
        'last_name',      pr.last_name,
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

-- `personas_asignables`, desde su única definición
-- (`20260928150000_perfiles.sql`), con `last_name` al final: `create or
-- replace` solo deja añadir columnas detrás.
create or replace view personas_asignables as
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.job_title,
  p.expertise,
  o.name as organization_name,
  (
    select count(*) from company_members m
    join companies c on c.id = m.company_id
    where m.profile_id = p.id and c.archived_at is null
  ) as proyectos,
  (
    select coalesce(sum(m.assigned_hours), 0) from company_members m
    join companies c on c.id = m.company_id
    where m.profile_id = p.id and c.archived_at is null
  ) as horas_comprometidas,
  p.last_name
from profiles p
left join organizations o on o.id = p.organization_id
where p.is_active;

alter view personas_asignables set (security_invoker = true);
grant select on personas_asignables to authenticated;
