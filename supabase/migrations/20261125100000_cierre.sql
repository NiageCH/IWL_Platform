-- =============================================================================
-- Bloque 8 · Cierre: Graduada o Finalizada (REVISION, 22 nov)
--
-- · Lo cierra dirección, con motivo y fecha: graduada (invertible), salida
--   (acabó el plazo sin serlo) o baja (fracasa o IWL la da de baja).
-- · Cerrada, desaparece para todos: solo dirección la lee, en
--   Administración → Histórico. Nadie la edita, tampoco dirección.
-- · Sus avisos abiertos se cierran.
-- · La fundadora pierde el acceso; conserva sus documentos firmados.
--
-- Cerrar también la archiva: así sale de cada listado que ya filtraba las
-- archivadas, sin repetir el filtro en cada uno.
-- =============================================================================

alter table companies
  add column if not exists cierre text check (cierre in ('graduada', 'salida', 'baja')),
  add column if not exists cerrada_on date,
  add column if not exists cierre_motivo text,
  add column if not exists cerrada_por uuid references profiles (id) on delete set null,
  add column if not exists cerrada_at timestamptz;

alter table companies drop constraint if exists companies_cierre_completo;
alter table companies add constraint companies_cierre_completo check (
  (cierre is null and cerrada_on is null and cerrada_at is null)
  or (cierre is not null and cerrada_on is not null and cerrada_at is not null
      and length(trim(coalesce(cierre_motivo, ''))) >= 10)
);

comment on column companies.cierre is
  'Cómo terminó: graduada (invertible), salida (acabó el plazo sin serlo) o baja. Cerrada, solo la lee dirección y nadie la edita.';

create or replace function app.compania_cerrada(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from companies where id = p_company and cierre is not null)
$$;

-- -----------------------------------------------------------------------------
-- Quién la ve y quién la toca. Desde su última definición (20260928130000 y
-- 20260928110000), con el cierre delante.
-- -----------------------------------------------------------------------------

create or replace function app.can_read_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- Cerrada: solo dirección, y en el Histórico
    when app.compania_cerrada(target_company) then app.is_admin()
    else app.is_iwl() or (
      exists (
        select 1 from company_members
        where company_id = target_company and profile_id = auth.uid()
      )
      and not exists (
        select 1 from companies
        where id = target_company and archived_at is not null
      )
    )
  end
$$;

create or replace function app.coordina_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not app.compania_cerrada(target_company) and (
    app.is_iwl() or exists (
      select 1 from company_members
      where company_id = target_company
        and profile_id = auth.uid()
        and member_role = 'mentor_principal'
    )
  )
$$;

create or replace function app.can_write_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not app.compania_cerrada(target_company) and (
    app.coordina_company(target_company) or exists (
      select 1 from company_members
      where company_id = target_company
        and profile_id = auth.uid()
        and member_role = 'fundadora'
    )
  )
$$;

-- -----------------------------------------------------------------------------
-- Lo cerrado no se edita. Es integridad, no autorización: vale también con
-- la clave de servicio. Al borrar la compañía entera, sus filas se van con
-- ella: en la cascada la compañía ya no existe y el guardián las deja ir.
-- -----------------------------------------------------------------------------

create or replace function app.guard_compania_cerrada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := case when tg_op = 'DELETE' then old.company_id else new.company_id end;
begin
  if app.compania_cerrada(v_company)
     or (tg_op = 'UPDATE' and app.compania_cerrada(old.company_id)) then
    raise exception 'La compañía está cerrada: solo se lee.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'milestones', 'roadmap_stages', 'annexes', 'contribution_hours', 'contribution_items',
    'documents', 'dd_items', 'kpi_values', 'monthly_updates', 'progress_entries',
    'entry_checks', 'company_members', 'cash_disbursements', 'company_pillars'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on %I', t || '_guard_cerrada', t);
      execute format(
        'create trigger %I before insert or update or delete on %I for each row execute function app.guard_compania_cerrada()',
        t || '_guard_cerrada', t);
    end if;
  end loop;
end;
$$;

-- La propia compañía: cerrada, no se cambia nada de ella
create or replace function app.guard_compania_cerrada_fila()
returns trigger
language plpgsql
as $$
begin
  if old.cierre is not null then
    raise exception 'La compañía está cerrada: solo se lee.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_guard_cerrada on companies;
create trigger companies_guard_cerrada
  before update on companies
  for each row execute function app.guard_compania_cerrada_fila();

-- -----------------------------------------------------------------------------
-- Cerrar
-- -----------------------------------------------------------------------------

create or replace function public.cerrar_compania(
  p_company uuid,
  p_cierre text,
  p_fecha date,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  co companies%rowtype;
begin
  if not app.is_admin() then
    raise exception 'Cerrar una compañía es de dirección.' using errcode = '42501';
  end if;
  select * into co from companies where id = p_company;
  if not found then
    raise exception 'Esa compañía ya no está.' using errcode = 'P0001';
  end if;
  if co.cierre is not null then
    raise exception 'Ya está cerrada.' using errcode = 'P0001';
  end if;
  if co.tramo = 'entrada' then
    raise exception 'Todavía está en entrada: si no sigue, es «no se incorpora», en su decisión.' using errcode = 'P0001';
  end if;
  if p_cierre not in ('graduada', 'salida', 'baja') then
    raise exception 'Di cómo termina: graduada, salida o baja.' using errcode = 'P0001';
  end if;
  if p_fecha is null or p_fecha > current_date then
    raise exception 'La fecha del cierre es hoy o antes.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escribe por qué se cierra: queda en el Histórico.' using errcode = 'P0001';
  end if;

  update companies
  set cierre = p_cierre,
      cerrada_on = p_fecha,
      cierre_motivo = trim(p_motivo),
      cerrada_por = auth.uid(),
      cerrada_at = now(),
      archived_at = coalesce(archived_at, now()),
      archived_by = coalesce(archived_by, auth.uid()),
      archive_reason = coalesce(archive_reason, trim(p_motivo))
  where id = p_company;

  -- Sus avisos abiertos se cierran: no queda nada que hacer con ella
  update avisos set cerrado_at = now(), cerrado_por = auth.uid()
  where company_id = p_company and cerrado_at is null;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'companies', p_company, 'compania_cerrada',
          jsonb_build_object('cierre', p_cierre, 'fecha', p_fecha, 'motivo', trim(p_motivo)));
end;
$$;

revoke all on function public.cerrar_compania(uuid, text, date, text) from public, anon;
grant execute on function public.cerrar_compania(uuid, text, date, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Lo que conserva la fundadora: sus documentos firmados. Ya no lee la
-- compañía, así que una función le dice cuáles son, de sus compañías
-- cerradas y de nada más.
-- -----------------------------------------------------------------------------

create or replace function public.documentos_tras_cierre()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'compania', c.name,
    'cierre', c.cierre,
    'cerrada_on', c.cerrada_on,
    'nda', (
      select d.storage_path from candidaturas k
      join nda_firmas f on f.candidatura_id = k.id
      join candidatura_documentos d on d.id = f.documento_id
      where k.company_id = c.id
      limit 1
    ),
    'anexos', (
      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'version', a.version, 'firmado_on', a.signed_on)
                                order by a.version), '[]'::jsonb)
      from annexes a where a.company_id = c.id and a.status in ('firmado', 'cerrado')
    )
  ) order by c.cerrada_on desc), '[]'::jsonb)
  from companies c
  join company_members m on m.company_id = c.id
  where m.profile_id = auth.uid() and m.member_role = 'fundadora' and c.cierre is not null
$$;

revoke all on function public.documentos_tras_cierre() from public, anon;
grant execute on function public.documentos_tras_cierre() to authenticated;

-- El Anexo firmado, tal como se firmó, para la fundadora de una compañía cerrada
create or replace function public.anexo_firmado_tras_cierre(p_annex uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('compania', c.name, 'version', a.version, 'contenido', v.contenido)
  from annexes a
  join companies c on c.id = a.company_id and c.cierre is not null
  join company_members m on m.company_id = c.id and m.profile_id = auth.uid() and m.member_role = 'fundadora'
  join lateral (
    select contenido from anexo_versiones
    where annex_id = a.id and momento = 'firmado'
    order by created_at desc limit 1
  ) v on true
  where a.id = p_annex
$$;

revoke all on function public.anexo_firmado_tras_cierre(uuid) from public, anon;
grant execute on function public.anexo_firmado_tras_cierre(uuid) to authenticated;

-- Su NDA está en el almacén de candidaturas. Lo lee como candidata si la
-- cuenta es la de la candidatura; si la entrada se hizo con otra cuenta,
-- esta política se lo deja leer igual, solo ese fichero
create or replace function app.es_mi_nda_tras_cierre(p_ruta text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from companies c
    join company_members m on m.company_id = c.id and m.profile_id = auth.uid() and m.member_role = 'fundadora'
    join candidaturas k on k.company_id = c.id
    join nda_firmas f on f.candidatura_id = k.id
    join candidatura_documentos d on d.id = f.documento_id
    where c.cierre is not null and d.storage_path = p_ruta
  )
$$;

drop policy if exists candidaturas_nda_tras_cierre on storage.objects;
create policy candidaturas_nda_tras_cierre on storage.objects
  for select to authenticated
  using (bucket_id = 'candidaturas' and app.es_mi_nda_tras_cierre(name));
