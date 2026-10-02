-- =============================================================================
-- `admin_personas` con el CV
--
-- La ficha de cada persona enseña su CV adjunto, así que la vista tiene que
-- traer la ruta.
--
-- Se recrea a partir de su **última** definición, la de
-- `20260928150000_perfiles.sql`, y no de una anterior: ya pasó una vez que
-- una vista se rehízo desde una versión vieja y se perdieron por el camino
-- las horas asignadas y las imputadas. La única diferencia con aquella es
-- la columna nueva.
-- =============================================================================

drop view if exists admin_personas;

create view admin_personas as
select
  p.id,
  p.email,
  p.full_name,
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
