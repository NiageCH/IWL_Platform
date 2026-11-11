-- =============================================================================
-- El historial de versiones del Anexo
--
-- REVISION, 11 nov: «una copia de solo lectura cada vez que se propone y
-- cuando se firma». Un Anexo propuesto se puede devolver a borrador,
-- cambiar y volver a proponer, y hasta ahora de lo que se propuso la
-- primera vez solo quedaba una línea en el registro con el equity y las
-- horas. Si ella comentó sobre unas cifras, hay que poder ver cuáles eran.
--
-- La copia la hace la base, no la acción: así sale también cuando el
-- estado cambia desde una función (firmar_acuerdo) o desde la semilla.
-- =============================================================================

create table if not exists anexo_versiones (
  id          uuid primary key default gen_random_uuid(),
  annex_id    uuid not null references annexes (id) on delete cascade,
  company_id  uuid not null references companies (id) on delete cascade,
  momento     text not null check (momento in ('propuesto', 'firmado')),
  -- Lo que decía el Anexo en ese momento, campo a campo
  contenido   jsonb not null,
  -- El nombre se copia: la copia no cambia si la persona cambia el suyo,
  -- y una fundadora no lee los perfiles de IWL
  autor_id    uuid references profiles (id) on delete set null,
  autor_nombre text,
  created_at  timestamptz not null default now()
);

create index if not exists anexo_versiones_anexo on anexo_versiones (annex_id, created_at);

comment on table anexo_versiones is
  'Copia de solo lectura del Anexo cada vez que se propone y cuando se firma. La hace un disparador de annexes.';

alter table anexo_versiones enable row level security;

-- Las ve quien ve la compañía: son de lo propuesto o firmado, que ella ya ve.
-- No hay política de escritura: nadie con sesión las crea ni las toca
drop policy if exists anexo_versiones_leer on anexo_versiones;
create policy anexo_versiones_leer on anexo_versiones
  for select to authenticated using (app.can_read_company(company_id));

/*
 * Una copia no se edita ni se borra suelta, tampoco con la clave de
 * servicio: es integridad, no autorización. Se va solo con su Anexo o con
 * su compañía. En el borrado en cascada la fila de arriba ya no existe
 * cuando llega aquí; las dos cascadas no tienen un orden fijo, así que
 * basta con que falte una.
 */
create or replace function app.guard_anexo_version()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Una versión del Anexo es una copia: no se edita.' using errcode = '42501';
  end if;
  if exists (select 1 from annexes where id = old.annex_id)
     and exists (select 1 from companies where id = old.company_id) then
    raise exception 'Una versión del Anexo no se borra: se va con su Anexo.' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists anexo_versiones_guard on anexo_versiones;
create trigger anexo_versiones_guard
  before update or delete on anexo_versiones
  for each row execute function app.guard_anexo_version();

-- Lo que se copia: lo que las dos partes leen y acuerdan, no las marcas internas
create or replace function app.contenido_anexo(a annexes)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'version', a.version,
    'equity_pct', a.equity_pct,
    'committed_hours', a.committed_hours,
    'committed_hours_value', a.committed_hours_value,
    'committed_hours_value_motivo', a.committed_hours_value_motivo,
    'committed_cash', a.committed_cash,
    'duration_months', a.duration_months,
    'starts_on', a.starts_on,
    'ends_on', a.ends_on,
    'other_commitments', a.other_commitments,
    'firmantes', a.firmantes,
    'signed_on', a.signed_on
  );
$$;

create or replace function app.copiar_version_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_momento text;
  v_autor   uuid := auth.uid();
begin
  if new.status = 'propuesto' and (tg_op = 'INSERT' or old.status is distinct from 'propuesto') then
    v_momento := 'propuesto';
  elsif new.status = 'firmado' and (tg_op = 'INSERT' or old.status is distinct from 'firmado') then
    v_momento := 'firmado';
  else
    return new;
  end if;

  insert into anexo_versiones (annex_id, company_id, momento, contenido, autor_id, autor_nombre)
  values (
    new.id,
    new.company_id,
    v_momento,
    app.contenido_anexo(new),
    v_autor,
    (select nullif(trim(concat_ws(' ', full_name, last_name)), '') from profiles where id = v_autor)
  );
  return new;
end;
$$;

drop trigger if exists annexes_copiar_version on annexes;
create trigger annexes_copiar_version
  after insert or update of status on annexes
  for each row execute function app.copiar_version_anexo();

-- Los Anexos que ya estaban propuestos o firmados empiezan su historial
-- con lo que dicen hoy: lo de antes no se guardó y no se inventa
insert into anexo_versiones (annex_id, company_id, momento, contenido, created_at)
select
  a.id,
  a.company_id,
  case when a.status in ('firmado', 'cerrado') then 'firmado' else 'propuesto' end,
  app.contenido_anexo(a),
  coalesce(a.propuesto_at, a.updated_at)
from annexes a
where a.status <> 'borrador'
  and not exists (select 1 from anexo_versiones v where v.annex_id = a.id);
