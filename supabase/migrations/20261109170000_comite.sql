-- =============================================================================
-- Acta de comité, firmada por cada miembro
--
-- Punto 4 del flujo de entrada (modelo v2, apartado 7). El comité decide
-- —preseleccionada, descartada o aplazada— y, si sigue, por qué vía entra.
-- Cada miembro firma con su cuenta; cuando firman todos, se aplica la
-- decisión y queda el PDF en el expediente.
-- =============================================================================

create table if not exists comite_actas (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,
  fecha date not null default current_date,
  resumen text not null check (length(trim(resumen)) > 0),
  decision text not null check (decision in ('preseleccionada', 'descartada', 'aplazada')),
  via via_entrada,
  via_propuesta via_entrada,
  via_motivo text,
  motivo text,
  revision_on date,
  puede_volver boolean,
  mensaje text,
  cerrada_at timestamptz,
  documento_id uuid references candidatura_documentos(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,

  constraint preseleccionada_con_via check (decision <> 'preseleccionada' or via is not null),
  constraint via_cambiada_con_motivo check (
    via is null or via_propuesta is null or via = via_propuesta or length(trim(coalesce(via_motivo, ''))) > 0
  ),
  constraint aplazada_con_revision check (decision <> 'aplazada' or revision_on is not null),
  constraint descartada_con_motivo check (decision <> 'descartada' or length(trim(coalesce(motivo, ''))) > 0)
);

create index if not exists comite_actas_candidatura on comite_actas (candidatura_id, created_at desc);

create table if not exists comite_firmas (
  acta_id uuid not null references comite_actas(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete restrict,
  firmado_at timestamptz,
  firmado_ip text,
  firmado_ua text,
  primary key (acta_id, profile_id)
);

comment on table comite_firmas is
  'Quién forma el comité de cada acta y, cuando firma, su rastro. Las filas son los miembros.';

-- La vía que fija el comité, en la candidatura: la compañía la toma al nacer
alter table candidaturas add column if not exists via via_entrada;

-- La lista por defecto del comité: ids de personas de IWL, editable en Programa
insert into platform_settings (key, value, description)
values ('comite_miembros', '[]', 'Quién forma el comité por defecto. Se marca al redactar cada acta y se puede cambiar en ella.')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Lo firmado no se edita
--
-- Con la primera firma, el contenido del acta y la lista de quién la firma
-- quedan como estaban. Es integridad: vale escriba quien escriba, también
-- la clave de servicio. Lo único que cambia después es el cierre y su PDF.
-- -----------------------------------------------------------------------------

create or replace function app.guard_acta_firmada()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from comite_firmas where acta_id = old.id and firmado_at is not null) then
    if tg_op = 'DELETE' then
      raise exception 'Un acta que alguien ha firmado no se borra.' using errcode = '42501';
    end if;
    if (new.fecha, new.resumen, new.decision, new.via, new.via_propuesta, new.via_motivo,
        new.motivo, new.revision_on, new.puede_volver, new.mensaje)
       is distinct from
       (old.fecha, old.resumen, old.decision, old.via, old.via_propuesta, old.via_motivo,
        old.motivo, old.revision_on, old.puede_volver, old.mensaje) then
      raise exception 'Un acta que alguien ha firmado no se edita. Redacta otra.' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists comite_actas_firmada on comite_actas;
create trigger comite_actas_firmada
  before update or delete on comite_actas
  for each row execute function app.guard_acta_firmada();

create or replace function app.guard_miembros_acta()
returns trigger
language plpgsql
as $$
declare
  v_acta uuid := coalesce(new.acta_id, old.acta_id);
begin
  -- Firmar no cambia quién forma el comité: eso sí se deja
  if tg_op = 'UPDATE' and new.profile_id = old.profile_id and new.acta_id = old.acta_id then
    if old.firmado_at is not null then
      raise exception 'Una firma no se cambia.' using errcode = '42501';
    end if;
    return new;
  end if;
  if exists (select 1 from comite_firmas where acta_id = v_acta and firmado_at is not null) then
    raise exception 'Con el acta ya firmada por alguien, el comité no cambia.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists comite_firmas_miembros on comite_firmas;
create trigger comite_firmas_miembros
  before insert or update or delete on comite_firmas
  for each row execute function app.guard_miembros_acta();

-- -----------------------------------------------------------------------------
-- Quién la ve y quién la redacta: IWL. Firmar va por función, con la clave
-- de servicio: la IP la pone el servidor, como en el NDA.
-- -----------------------------------------------------------------------------

alter table comite_actas enable row level security;
alter table comite_firmas enable row level security;

drop policy if exists comite_actas_iwl on comite_actas;
create policy comite_actas_iwl on comite_actas
  for all using (app.is_iwl()) with check (app.is_iwl());

drop policy if exists comite_firmas_leer on comite_firmas;
create policy comite_firmas_leer on comite_firmas
  for select using (app.is_iwl());

-- Elegir quién forma el comité sí con la sesión; firmar, no
drop policy if exists comite_firmas_miembros on comite_firmas;
create policy comite_firmas_miembros on comite_firmas
  for insert with check (app.is_iwl() and firmado_at is null);

drop policy if exists comite_firmas_quitar on comite_firmas;
create policy comite_firmas_quitar on comite_firmas
  for delete using (app.is_iwl());

create or replace function app.firmar_acta(
  p_acta uuid,
  p_profile uuid,
  p_ip text,
  p_ua text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  a comite_actas%rowtype;
begin
  update comite_firmas
  set firmado_at = now(), firmado_ip = p_ip, firmado_ua = p_ua
  where acta_id = p_acta and profile_id = p_profile and firmado_at is null;
  if not found then
    raise exception 'No estás en este comité, o ya has firmado el acta.' using errcode = '42501';
  end if;

  -- ¿Falta alguien?
  if exists (select 1 from comite_firmas where acta_id = p_acta and firmado_at is null) then
    return false;
  end if;

  update comite_actas set cerrada_at = now() where id = p_acta returning * into a;

  -- La decisión, aplicada
  if a.decision = 'preseleccionada' then
    update candidaturas
    set estado = 'preseleccionada', via = a.via
    where id = a.candidatura_id
      and estado in ('presentada', 'en_revision', 'reunion', 'comite');
    update candidaturas set via = a.via where id = a.candidatura_id;
  elsif a.decision = 'descartada' then
    update candidaturas
    set estado = 'descartada', descartada_desde = estado,
        descartada_at = now(), descartada_motivo = a.motivo
    where id = a.candidatura_id and estado not in ('firmada', 'descartada');
  else
    -- Aplazada: se queda en Comité, con su fecha de revisión
    update candidaturas set estado = 'comite'
    where id = a.candidatura_id and estado in ('presentada', 'en_revision', 'reunion');
  end if;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle, created_by)
  values (a.candidatura_id, 'comite', 'Acta de comité firmada · ' || a.decision, a.resumen, p_profile);

  return true;
end;
$$;

revoke all on function app.firmar_acta(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.firmar_acta(p_acta uuid, p_profile uuid, p_ip text, p_ua text)
returns boolean language sql security definer set search_path = public
as $$ select app.firmar_acta(p_acta, p_profile, p_ip, p_ua) $$;

revoke all on function public.firmar_acta(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.firmar_acta(uuid, uuid, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- La vista del embudo, desde su última definición
-- (`20261109160000_reuniones.sql`), para que lleve la vía.
-- -----------------------------------------------------------------------------

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
