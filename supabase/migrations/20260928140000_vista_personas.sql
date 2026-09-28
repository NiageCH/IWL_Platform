-- =============================================================================
-- 018 · La vista de administración de personas, con las condiciones de cada una
--
-- Antes devolvía «a qué proyectos está asignada». Ahora hace falta saber
-- además con qué papel en cada uno, cuántas horas tiene acordadas y cuántas
-- lleva puestas: es lo que se mira para decidir si alguien puede coger otro
-- proyecto o está desbordada.
-- =============================================================================

/*
 * Se borra y se crea en vez de reemplazarse: `create or replace view` no deja
 * insertar una columna en medio de las que ya había.
 */
drop view if exists admin_personas;

create view admin_personas as
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.archived_at,
  p.created_at,
  o.name as organization_name,
  -- Si ha dejado rastro. Decide si se le puede borrar o solo archivar
  app.persona_tiene_actividad(p.id) as tiene_actividad,
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

/**
 * Las compañías con lo que hace falta para administrarlas.
 *
 * Incluye si tiene actividad, para no ofrecer un borrado que la base va a
 * rechazar, y el recuento de quién la lleva.
 */
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
  f.name as phase_name,
  co.name as cohort_name,
  app.compania_tiene_actividad(c.id) as tiene_actividad,
  (select count(*) from roadmap_stages s where s.company_id = c.id) as etapas,
  (
    select jsonb_agg(
      jsonb_build_object(
        'profile_id', pr.id,
        'full_name',  pr.full_name,
        'member_role', m.member_role
      ) order by m.member_role, pr.full_name
    )
    from company_members m
    join profiles pr on pr.id = m.profile_id
    where m.company_id = c.id
  ) as equipo
from companies c
left join phases f on f.id = c.phase_id
left join cohorts co on co.id = c.cohort_id;

alter view admin_companias set (security_invoker = true);
grant select on admin_companias to authenticated;
