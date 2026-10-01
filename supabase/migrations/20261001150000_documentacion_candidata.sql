-- =============================================================================
-- Cómo entrega una candidata la documentación del due diligence
--
-- Faltaba la mitad. La candidata podía subir ficheros a su sala de datos,
-- pero IWL no los veía en ninguna parte y nadie le decía qué mandar: era una
-- subida sin el otro lado, que es tanto como no tenerla.
--
-- Dos piezas:
--
--   · **Lo que se le pide**, instanciado del mismo checklist de due diligence
--     que se le pediría siendo compañía. No se inventa una lista nueva: si
--     la información que hace falta para decidir es la misma, la lista tiene
--     que ser la misma, o acabarían siendo dos que se desincronizan.
--
--   · **Lo que entrega**, con su fichero y, si responde a un punto concreto,
--     apuntando a cuál. Así «qué falta» es una consulta y no una revisión a
--     ojo de una carpeta.
--
-- Se pide al firmar el NDA, que es cuando se puede pedir: antes no hay
-- confidencialidad que cubra nada de esto.
-- =============================================================================

create table candidatura_peticiones (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,

  /*
   * De qué punto del checklist sale. Nulo cuando IWL pide algo que no está
   * en la plantilla, que pasa: cada proyecto tiene su particularidad.
   */
  item_template_id uuid references dd_item_templates(id) on delete set null,

  area text,
  titulo text not null,
  detalle text,
  obligatoria boolean not null default true,
  orden int not null default 0,

  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index on candidatura_peticiones (candidatura_id, orden);

create table candidatura_documentos (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,

  -- A qué petición responde. Nulo si lo manda por su cuenta
  peticion_id uuid references candidatura_peticiones(id) on delete set null,

  nombre text not null,
  storage_path text not null unique,
  mime text,
  bytes bigint,

  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index on candidatura_documentos (candidatura_id);
create index on candidatura_documentos (peticion_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table candidatura_peticiones enable row level security;
alter table candidatura_documentos enable row level security;

/*
 * IWL lo ve y lo escribe todo. La candidata ve lo suyo y entrega, pero no
 * se pide a sí misma: lo que hay que entregar lo decide quien evalúa.
 */
create policy peticiones_iwl on candidatura_peticiones
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy peticiones_candidata on candidatura_peticiones
  for select to authenticated using (
    candidatura_id = app.mi_candidatura_id()
  );

create policy documentos_iwl on candidatura_documentos
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy documentos_candidata_lee on candidatura_documentos
  for select to authenticated using (
    candidatura_id = app.mi_candidatura_id()
  );

create policy documentos_candidata_entrega on candidatura_documentos
  for insert to authenticated with check (
    candidatura_id = app.mi_candidatura_id()
  );

/*
 * Borrar, solo IWL.
 *
 * Lo que una candidata entrega queda entregado. Si se equivoca de fichero
 * sube el bueno y lo dice; dejar que retire lo ya entregado convierte el
 * expediente en algo que no se puede citar.
 */

-- =============================================================================
-- Pedirle la documentación, al firmar el NDA
-- =============================================================================

create or replace function app.pedir_due_diligence(p_candidatura uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuantas int;
begin
  -- Si ya se le pidió, no se duplica
  select count(*) into v_cuantas
  from candidatura_peticiones where candidatura_id = p_candidatura;

  if v_cuantas > 0 then
    return 0;
  end if;

  insert into candidatura_peticiones (
    candidatura_id, item_template_id, area, titulo, detalle, obligatoria, orden
  )
  select
    p_candidatura,
    t.id,
    a.name,
    t.title,
    t.description,
    coalesce(t.is_required, false),
    a.order_index * 100 + t.order_index
  from dd_item_templates t
  join dd_areas a on a.id = t.area_id
  where coalesce(t.is_active, true)
  order by a.order_index, t.order_index;

  get diagnostics v_cuantas = row_count;
  return v_cuantas;
end;
$$;

comment on function app.pedir_due_diligence is
  'Instancia el checklist de due diligence para una candidatura, del mismo '
  'catálogo que usan las compañías.';

/*
 * Se pide solo al entrar en NDA.
 *
 * Automático y no un botón que haya que acordarse de pulsar: el NDA es
 * exactamente el momento en que se puede pedir, y una lista que llega tarde
 * es una semana de correos preguntando qué hace falta.
 */
create or replace function app.pedir_dd_al_firmar_nda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'nda' and old.estado is distinct from 'nda' then
    perform app.pedir_due_diligence(new.id);
  end if;
  return new;
end;
$$;

create trigger candidatura_pedir_dd
  after update on candidaturas
  for each row execute function app.pedir_dd_al_firmar_nda();

-- =============================================================================
-- Qué falta
-- =============================================================================

create view candidatura_entregas as
select
  p.id,
  p.candidatura_id,
  p.area,
  p.titulo,
  p.detalle,
  p.obligatoria,
  p.orden,
  (
    select count(*) from candidatura_documentos d where d.peticion_id = p.id
  ) as documentos
from candidatura_peticiones p;

alter view candidatura_entregas set (security_invoker = true);
grant select on candidatura_entregas to authenticated;

-- -----------------------------------------------------------------------------
-- Lo que ve la candidata de su propio expediente
-- -----------------------------------------------------------------------------

create or replace function app.mis_peticiones()
returns table (
  id uuid,
  area text,
  titulo text,
  detalle text,
  obligatoria boolean,
  entregados int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.area, p.titulo, p.detalle, p.obligatoria,
    (select count(*)::int from candidatura_documentos d where d.peticion_id = p.id)
  from candidatura_peticiones p
  where p.candidatura_id = app.mi_candidatura_id()
  order by p.orden
$$;

revoke all on function app.mis_peticiones from public;
grant execute on function app.mis_peticiones to authenticated;

create or replace function public.mis_peticiones()
returns table (
  id uuid, area text, titulo text, detalle text,
  obligatoria boolean, entregados int
)
language sql stable security invoker set search_path = public
as $$ select * from app.mis_peticiones() $$;

create or replace function public.pedir_due_diligence(p_candidatura uuid)
returns int language sql security invoker set search_path = public
as $$ select app.pedir_due_diligence(p_candidatura) $$;
