-- =============================================================================
-- Mi cuenta: la foto y el LinkedIn de cada persona
--
-- (REVISION, 13 nov) Para todos los roles. La foto sustituye a las
-- iniciales donde sale la persona; el LinkedIn se enseña como icono junto al
-- nombre. Ninguno de los dos entra en PDF ni en correos.
--
-- La foto se guarda como ruta, no como dirección, igual que los logos: el
-- bucket es privado y la dirección se firma al leer. Una foto con dirección
-- fija se puede reenviar a cualquiera; firmada, caduca en una hora.
-- =============================================================================

alter table profiles add column if not exists photo_path text;
alter table profiles add column if not exists linkedin_url text;

comment on column profiles.photo_path is
  'Ruta de la foto dentro del bucket `fotos`, siempre bajo la carpeta de la propia persona. La dirección se firma al leer.';
comment on column profiles.linkedin_url is
  'Dirección de su perfil de LinkedIn, solo https://www.linkedin.com/in/…';

/*
 * La foto de una persona vive en su propia carpeta. Sin esto, cualquiera
 * que pueda editar un perfil —la dirección, con `profiles_admin_all`—
 * podría apuntar el suyo a la foto de otra. Es integridad del dato, así que
 * vale también con la clave de servicio.
 */
alter table profiles drop constraint if exists profiles_photo_path_propia;
alter table profiles add constraint profiles_photo_path_propia
  check (photo_path is null or photo_path like id::text || '/%');

/*
 * Solo perfiles de LinkedIn, en su forma canónica: https, www y sin nada
 * detrás del identificador. `lib/linkedin.ts` lleva a esa forma lo que se
 * pega —`es.linkedin.com/in/…`, con barra final o con `?utm_…`— y da el
 * mensaje; esta comprobación es la que manda.
 */
alter table profiles drop constraint if exists profiles_linkedin_url_valida;
alter table profiles add constraint profiles_linkedin_url_valida
  check (
    linkedin_url is null
    or linkedin_url ~ '^https://www\.linkedin\.com/in/[A-Za-z0-9%_-]+$'
  );

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos',
  'fotos',
  false,
  -- Lo que se guarda es la foto ya reducida a 256 × 256: pesa decenas de KB.
  -- El tope de 5 MB es el del fichero que se elige, y se mira antes.
  1048576,
  array['image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

/*
 * `<profile_id>/<fichero>`.
 *
 * Quién la ve: quien ya puede ver a esa persona. La subconsulta sobre
 * `profiles` pasa a propósito por las políticas de `profiles` —IWL ve a
 * todo el mundo, y cada cual a sí misma y a quienes comparten compañía con
 * ella—: es exactamente la pregunta que se quiere hacer, así que aquí no
 * hace falta una función `security definer`.
 *
 * Quién la pone, la cambia o la quita: solo su dueña. Tampoco la dirección.
 */
drop policy if exists fotos_select on storage.objects;
create policy fotos_select on storage.objects
  for select to authenticated using (
    bucket_id = 'fotos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects
  for update to authenticated using (
    bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- Las vistas de administración, con la foto y el LinkedIn
-- -----------------------------------------------------------------------------

-- `admin_personas`, desde su última definición
-- (`20261111170000_apellidos_en_personas.sql`), con las dos columnas al
-- final: `create or replace` solo deja añadir detrás.
create or replace view admin_personas as
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
  ) as asignaciones,
  p.photo_path,
  p.linkedin_url
from profiles p
left join organizations o on o.id = p.organization_id;

alter view admin_personas set (security_invoker = true);
grant select on admin_personas to authenticated;

-- `admin_companias`, desde su última definición
-- (`20261111170000_apellidos_en_personas.sql`). Mismas columnas; el equipo
-- lleva además la foto y el LinkedIn de cada cual.
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
        'imputadas',      coalesce(h.horas, 0),
        'photo_path',     pr.photo_path,
        'linkedin_url',   pr.linkedin_url
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
