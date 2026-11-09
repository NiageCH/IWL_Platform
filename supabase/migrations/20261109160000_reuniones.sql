-- =============================================================================
-- Reuniones, y si abrió el enlace
--
-- Punto 3 del nuevo flujo de entrada (modelo v2, apartado 6). Al pasar a
-- Reunión, IWL propone dos o tres franjas; después la anota con fecha,
-- asistentes, notas, conclusión y adjuntos. Y dirección ve si la candidata
-- ha abierto su enlace privado y cuándo.
-- =============================================================================

create table if not exists candidatura_reuniones (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,
  propuesta_at timestamptz,
  propuesta_por uuid references profiles(id) on delete set null,
  franjas jsonb not null default '[]',
  celebrada_on date,
  asistentes jsonb not null default '[]',
  notas text,
  conclusion text check (conclusion in ('seguir', 'no_seguir', 'pendiente')),
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create index if not exists candidatura_reuniones_candidatura
  on candidatura_reuniones (candidatura_id, created_at desc);

comment on table candidatura_reuniones is
  'Reuniones con una candidatura: propuesta (franjas) y, celebrada, su acta breve.';

alter table candidatura_reuniones enable row level security;

drop policy if exists candidatura_reuniones_iwl on candidatura_reuniones;
create policy candidatura_reuniones_iwl on candidatura_reuniones
  for all using (app.is_iwl()) with check (app.is_iwl());

-- Los adjuntos de una reunión son documentos del expediente, como el resto
alter table candidatura_documentos
  add column if not exists reunion_id uuid references candidatura_reuniones(id) on delete set null;

-- -----------------------------------------------------------------------------
-- Si abrió su enlace
-- -----------------------------------------------------------------------------

alter table candidaturas
  add column if not exists enlace_abierto_at timestamptz,
  add column if not exists enlace_visto_at timestamptz;

comment on column candidaturas.enlace_abierto_at is 'Primera vez que abrió su enlace privado.';
comment on column candidaturas.enlace_visto_at is 'Última vez que lo abrió.';

/*
 * La apunta la propia página del enlace, que no tiene sesión. Aparte de
 * `ver_candidatura`, que solo lee: una lectura que escribe no se puede
 * marcar como estable, y se pide en más sitios que la página.
 */
create or replace function app.registrar_apertura_enlace(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update candidaturas
  set enlace_abierto_at = coalesce(enlace_abierto_at, now()),
      enlace_visto_at = now()
  where token = p_token and token_anulado_at is null;
$$;

create or replace function public.registrar_apertura_enlace(p_token text)
returns void language sql security definer set search_path = public
as $$ select app.registrar_apertura_enlace(p_token) $$;

revoke all on function public.registrar_apertura_enlace(text) from public;
grant execute on function public.registrar_apertura_enlace(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- «Reunión propuesta», en lo que ve ella
--
-- El momento salía solo del estado. Ahora, en Reunión, depende de si hay
-- una propuesta sin celebrar. Las dos funciones que lo enseñan se recrean
-- desde su definición vigente, cambiando solo esa llamada.
-- -----------------------------------------------------------------------------

create or replace function app.momento_de(p_candidatura uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.estado = 'reunion' and exists (
      select 1 from candidatura_reuniones r
      where r.candidatura_id = c.id and r.propuesta_at is not null and r.celebrada_on is null
    ) then 'reunion_propuesta'
    else app.momento_candidata(c.estado)
  end
  from candidaturas c where c.id = p_candidatura
$$;

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname in ('ver_candidatura', 'mi_candidatura')
      and p.prosrc like '%app.momento_candidata(c.estado)%'
  loop
    execute replace(pg_get_functiondef(f), 'app.momento_candidata(c.estado)', 'app.momento_de(c.id)');
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- La vista del embudo, desde su última definición
-- (`20261109120000_situacion_societaria.sql`), para que lleve las columnas
-- nuevas: se creó con `c.*` y congela su lista al crearse.
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
