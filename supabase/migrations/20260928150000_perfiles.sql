-- =============================================================================
-- 019 · Quién es cada persona
--
-- Para decidir a quién se pone en un proyecto hace falta saber en qué es
-- fuerte. Hasta ahora la administración solo tenía nombre, correo y rol, así
-- que asignar mentoría era elegir un nombre de una lista y acordarse de qué
-- hace esa persona.
-- =============================================================================

alter table profiles
  -- Su cargo en la organización, que no es su rol en la plataforma
  add column job_title text,
  /*
   * Áreas en las que entra.
   *
   * Un array y no un texto libre: así se puede filtrar «quién sabe de
   * fondeo» sin buscar por subcadena, que es la pregunta que se hace al
   * montar el equipo de un proyecto.
   */
  add column expertise text[] not null default '{}',
  add column bio text;

comment on column profiles.job_title is
  'Cargo en su organización. No es el rol en la plataforma: una CEO puede ser mentora principal de un proyecto y nada en otro.';
comment on column profiles.expertise is
  'En qué entra. Se usa al montar el equipo de un proyecto y al buscar quién puede cubrir un reto concreto.';

create index profiles_expertise_idx on profiles using gin (expertise);

/*
 * El correo se puede corregir mientras esa persona no haya entrado nunca.
 *
 * Es la identidad en `auth.users`, así que cambiarlo después de que alguien
 * lo use la dejaría fuera. Pero al dar de alta a un equipo entero se teclean
 * correos, y un error de escritura no puede obligar a borrar la cuenta y
 * crearla otra vez: hasta el primer acceso no hay nada que romper.
 */
create or replace function app.puede_cambiar_correo(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1 from auth.users
    where id = target_profile and last_sign_in_at is null
  )
$$;

grant execute on function app.puede_cambiar_correo(uuid) to authenticated;

create or replace function public.puede_cambiar_correo(target_profile uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select app.puede_cambiar_correo(target_profile) $$;

do $$
begin
  execute 'revoke all on function public.puede_cambiar_correo(uuid) from public, anon';
  execute 'grant execute on function public.puede_cambiar_correo(uuid) to authenticated';
end;
$$;

-- La vista de administración, con lo que hace falta para decidir asignaciones
drop view if exists admin_personas;

create view admin_personas as
select
  p.id,
  p.email,
  p.full_name,
  p.job_title,
  p.expertise,
  p.bio,
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

/**
 * Quién hay disponible para asignar a un proyecto.
 *
 * Con su cargo y sus áreas, que es lo que se mira al montar un equipo, y
 * cuántos proyectos lleva ya: poner a alguien en el quinto proyecto es una
 * decisión distinta de ponerla en el primero.
 */
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
  ) as horas_comprometidas
from profiles p
left join organizations o on o.id = p.organization_id
where p.is_active;

alter view personas_asignables set (security_invoker = true);
grant select on personas_asignables to authenticated;

/*
 * El equipo de cada compañía, con lo que hace falta para gestionarlo desde
 * la ficha del proyecto: quién es cada uno, con qué papel entra, cuántas
 * horas tiene acordadas y cuántas lleva.
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
