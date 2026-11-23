-- =============================================================================
-- Invertible, decidido (REVISION, 23 nov)
--
-- Un proyecto es invertible cuando tiene validados los hitos de su hoja de
-- ruta que condicionan invertible (por defecto, los cuatro fundamentales del
-- tramo 4) y la dirección lo confirma al graduarlo. Así que «Graduada» solo
-- se puede elegir con todos esos hitos cumplidos.
--
-- Lo impone la base, no solo la pantalla: es integridad, vale también con la
-- clave de servicio.
-- =============================================================================

-- Cuántos hitos de la compañía condicionan invertible y cuántos faltan. Para
-- la pantalla del cierre y para el guardián, la misma cuenta.
create or replace function app.hitos_invertible(p_company uuid, out marcados integer, out pendientes integer)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer,
         count(*) filter (where status <> 'cumplido')::integer
  from milestones
  where company_id = p_company and gates_investable
$$;

create or replace function public.hitos_para_graduar(p_company uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Lo lee quien puede cerrarla: dirección. A cualquier otro, nada
  select case when app.is_admin() then (
    select jsonb_build_object('marcados', h.marcados, 'pendientes', h.pendientes)
    from app.hitos_invertible(p_company) h
  ) end
$$;

revoke all on function public.hitos_para_graduar(uuid) from public, anon;
grant execute on function public.hitos_para_graduar(uuid) to authenticated;

create or replace function app.guard_graduada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h record;
begin
  if new.cierre is distinct from 'graduada'
     or (tg_op = 'UPDATE' and old.cierre is not distinct from 'graduada') then
    return new;
  end if;
  select * into h from app.hitos_invertible(new.id);
  if h.marcados = 0 then
    raise exception 'Su hoja de ruta no tiene hitos que condicionen invertible: no se puede graduar. Ciérrala como finalizada.'
      using errcode = 'P0001';
  end if;
  if h.pendientes > 0 then
    raise exception 'Faltan % % para poder graduarla.', h.pendientes,
      case when h.pendientes = 1 then 'hito' else 'hitos' end
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_guard_graduada on companies;
create trigger companies_guard_graduada
  before insert or update of cierre on companies
  for each row execute function app.guard_graduada();

-- -----------------------------------------------------------------------------
-- La marca la pone y la quita dirección. En la plantilla ya era así (su
-- política de escritura es de dirección); en la hoja de cada compañía, quien
-- coordina puede crear un hito que condicione, pero no quitarle la marca a
-- uno que ya la tiene: sería la forma de graduar con un hito sin cumplir.
-- Es autorización: sin sesión no aplica.
-- -----------------------------------------------------------------------------

create or replace function app.guard_marca_invertible()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.gates_investable is distinct from old.gates_investable
     and not app.is_admin() then
    raise exception 'Que un hito condicione invertible lo decide dirección.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists milestones_guard_marca_invertible on milestones;
create trigger milestones_guard_marca_invertible
  before update of gates_investable on milestones
  for each row execute function app.guard_marca_invertible();
