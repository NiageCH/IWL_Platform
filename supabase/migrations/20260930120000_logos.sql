-- =============================================================================
-- El logo de cada compañía
--
-- En la cartera, en los siguientes pasos y en los scorecards cada compañía
-- salía con sus iniciales en un cuadro de color. Identifica, pero un logo
-- identifica mejor y es lo que la fundadora reconoce como suyo.
--
-- Se guarda la ruta en Storage, no la dirección: el bucket es privado y las
-- direcciones se firman al leer, igual que en el data room. Un logo no es
-- secreto, pero la lista de compañías de la cohorte sí: un bucket público
-- con rutas predecibles deja enumerar quién está dentro.
-- =============================================================================

alter table companies add column if not exists logo_path text;

comment on column companies.logo_path is
  'Ruta del logo dentro del bucket `logos`. La dirección se firma al leer.';

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  false,
  -- Un logo que pase de 2 MB es una foto, no un logo
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

/*
 * La primera carpeta de la ruta es el id de la compañía, como en el data
 * room: `<company_id>/<fichero>`. Así vale el mismo aislamiento.
 *
 * Quién puede verlo: cualquiera que pueda ver la compañía. Quién puede
 * ponerlo o quitarlo: solo IWL. Una fundadora no cambia su propio logo en la
 * plataforma de seguimiento; si quiere otro, se lo pide a quien coordina.
 * Es un dato de ficha, y las fichas las lleva IWL.
 */
create policy logos_select on storage.objects
  for select to authenticated using (
    bucket_id = 'logos'
    and app.can_read_company((storage.foldername(name))[1]::uuid)
  );

create policy logos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'logos' and app.is_iwl()
  );

create policy logos_update on storage.objects
  for update to authenticated using (
    bucket_id = 'logos' and app.is_iwl()
  );

create policy logos_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'logos' and app.is_iwl()
  );

-- -----------------------------------------------------------------------------
-- La vista de administración enseña también el logo
--
-- Se recrea entera porque `create or replace view` no deja meter una columna
-- en medio de la lista.
--
-- Ojo con esto: la primera versión de esta migración copió la definición de
-- `20260928140000_vista_personas.sql`, que es donde nació la vista, sin ver
-- que `20260928150000_perfiles.sql` la había ampliado después con el cargo,
-- las horas asignadas y las imputadas. Recrearla desde la copia vieja las
-- borró, y la pantalla de equipo empezó a enseñar «0,0 de — h» para todo el
-- mundo. Lo cogió una prueba.
--
-- Al recrear una vista hay que partir de su ÚLTIMA definición, no de la
-- primera que aparece al buscar su nombre.
-- -----------------------------------------------------------------------------

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
