-- =============================================================================
-- Borrar una compañía que sí tiene cosas dentro
--
-- «No está la opción de eliminar compañías.»
--
-- Sí está, pero solo aparece en las que no tienen nada registrado, y eso lo
-- decidió así Rodrigo en su día: archivar conserva, borrar es para lo vacío.
-- La regla sigue siendo buena —un extracto de aportación justifica una
-- participación y esa prueba tiene que sobrevivir al programa—.
--
-- Lo que no es bueno es el callejón: probando se crean compañías que en
-- cuanto tienen una hoja de ruta o un Anexo ya no se pueden quitar, y la
-- pantalla se limitaba a decir que no.
--
-- Así que la regla se queda como está por defecto y se añade una salida
-- deliberada: la dirección —solo la dirección— puede borrar una con
-- contenido, viendo antes exactamente qué se destruye.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Qué hay dentro, para poder enseñarlo antes de destruirlo
-- -----------------------------------------------------------------------------

create or replace function app.contenido_compania(target_company uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'horas', nullif((select count(*) from contribution_hours where company_id = target_company), 0),
    'documentos', nullif((select count(*) from documents where company_id = target_company), 0),
    'hitos', nullif((select count(*) from milestones where company_id = target_company), 0),
    'puntuaciones', nullif((select count(*) from tech_scores s
                            join tech_assessments a on a.id = s.assessment_id
                            where a.company_id = target_company), 0),
    'hallazgos', nullif((select count(*) from tech_findings where company_id = target_company), 0),
    'kpi', nullif((select count(*) from kpi_values where company_id = target_company), 0),
    'lineas_base', nullif((select count(*) from baselines where company_id = target_company), 0),
    'avances', nullif((select count(*) from progress_entries where company_id = target_company), 0),
    'anexos', nullif((select count(*) from annexes where company_id = target_company), 0),
    'desembolsos', nullif((select count(*) from cash_disbursements where company_id = target_company), 0)
  ))
$$;

grant execute on function app.contenido_compania(uuid) to authenticated;

create or replace function public.contenido_compania(target_company uuid)
returns jsonb language sql stable security definer set search_path = public
as $$ select app.contenido_compania(target_company) $$;

do $$
begin
  execute 'revoke all on function public.contenido_compania(uuid) from public, anon';
  execute 'grant execute on function public.contenido_compania(uuid) to authenticated';
end;
$$;

-- -----------------------------------------------------------------------------
-- El borrado con todo dentro
--
-- Separado de `borrar_compania` a propósito. Esa sigue negándose si hay algo
-- registrado, que es lo correcto para el camino normal; esta es la que hay
-- que pedir expresamente.
--
-- Solo la dirección, nunca el equipo. Y queda en el registro de actividad
-- qué se borró y cuánto llevaba dentro: de un borrado irreversible, al
-- menos, tiene que quedar la cuenta.
-- -----------------------------------------------------------------------------

create or replace function app.borrar_compania_con_todo(target_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nombre text;
  dentro jsonb;
begin
  if not app.is_admin() then
    raise exception 'Borrar una compañía con su histórico es de la dirección de IWL'
      using errcode = '42501';
  end if;

  select name into nombre from companies where id = target_company;
  if nombre is null then
    raise exception 'Esa compañía no existe' using errcode = '23503';
  end if;

  dentro := app.contenido_compania(target_company);

  delete from companies where id = target_company;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    null, auth.uid(), 'companies', target_company, 'borrar_con_todo',
    jsonb_build_object('nombre', nombre, 'contenido', dentro)
  );
end;
$$;

do $$
begin
  execute 'revoke all on function app.borrar_compania_con_todo(uuid) from public, anon';
  execute 'grant execute on function app.borrar_compania_con_todo(uuid) to authenticated';
end;
$$;

create or replace function public.borrar_compania_con_todo(target_company uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin perform app.borrar_compania_con_todo(target_company); end; $$;

do $$
begin
  execute 'revoke all on function public.borrar_compania_con_todo(uuid) from public, anon';
  execute 'grant execute on function public.borrar_compania_con_todo(uuid) to authenticated';
end;
$$;
