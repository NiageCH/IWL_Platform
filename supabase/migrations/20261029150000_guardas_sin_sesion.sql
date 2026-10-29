-- =============================================================================
-- Los guardianes de «quién puede» no se aplican sin sesión
--
-- Cuatro veces ha pasado lo mismo: una prueba intenta dejar la semilla como
-- la encontró, usa la clave de servicio —que es como se restaura, por fuera
-- del camino que se prueba— y un disparador la rechaza diciendo que «eso es
-- de IWL». Sin sesión no hay un «quién» a quien restringir.
--
-- Y no protege nada: la clave de servicio ya se salta el Row Level Security
-- entero por diseño. Quien la tiene puede leer y escribir cualquier cosa.
-- Un disparador que la bloquea solo impide lo legítimo —semillas,
-- migraciones, scripts de mantenimiento, restaurar una prueba— mientras
-- deja intacto lo que de verdad importa.
--
-- La regla queda así, y conviene no mezclarla:
--
--   · **Guardián de autorización** —«esto es de IWL», «esto es de quien
--     coordina»— se exime sin sesión. Es lo que se arregla aquí.
--   · **Guardián de integridad** —«un Anexo firmado no se edita», «una
--     línea base no se edita», «no hay tarifa vigente»— **no** se exime:
--     esas reglas valen las escriba quien las escriba. La semilla, cuando
--     necesita saltárselas, desactiva el disparador a mano y se ve.
--
-- Y cuando la semilla quiere que un guardián de autorización sí se aplique,
-- ya sabe cómo: se declara una sesión con `set_config('request.jwt.claims',
-- …)`, que es lo que hace `seed/03_actividad.sql`.
-- =============================================================================

create or replace function app.guard_asignacion_tarea()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;

  if new.owner_id is not null
     and new.owner_id <> auth.uid()
     and not app.coordina_company(new.company_id) then
    raise exception 'Asignar una tarea a otra persona es de IWL o de quien coordina el proyecto. Para pedirle algo al programa, usa el apartado de peticiones del update mensual.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.guard_company_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or app.is_iwl() then
    return new;
  end if;

  if new.stage is distinct from old.stage
     or new.phase_id is distinct from old.phase_id
     or new.cohort_id is distinct from old.cohort_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'La etapa, la fase y la cohorte las fija el equipo de IWL'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.guard_hito_cumplido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cumplido'
     and (tg_op = 'INSERT' or old.status is distinct from 'cumplido')
     and auth.uid() is not null
     and not app.coordina_company(new.company_id) then
    raise exception 'Confirmar un hito como cumplido es de IWL o de quien coordina el proyecto'
      using errcode = '42501';
  end if;

  if new.status = 'cumplido' and new.confirmed_at is null then
    new.confirmed_by := auth.uid();
    new.confirmed_at := now();
    new.completed_on := coalesce(new.completed_on, current_date);
  end if;

  if new.status <> 'cumplido' then
    new.confirmed_by := null;
    new.confirmed_at := null;
    new.completed_on := null;
  end if;

  return new;
end;
$$;

create or replace function app.guard_revision_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'revisado'
     and (tg_op = 'INSERT' or old.status is distinct from 'revisado')
     and auth.uid() is not null
     and not app.coordina_company(new.company_id) then
    raise exception 'Revisar el update mensual es de IWL o de quien coordina el proyecto'
      using errcode = '42501';
  end if;

  if new.status = 'entregado' and new.submitted_at is null then
    new.submitted_at := now();
    new.submitted_by := auth.uid();
  end if;

  if new.status = 'revisado' and new.reviewed_at is null then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;

  return new;
end;
$$;

create or replace function app.guard_validacion_bp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'validada'
     and (tg_op = 'INSERT' or old.status is distinct from 'validada')
     and auth.uid() is not null
     and not app.can_validate_company(new.company_id) then
    raise exception 'Validar una sección del business plan es del equipo de IWL'
      using errcode = '42501';
  end if;

  if new.status = 'validada' and new.validated_at is null then
    new.validated_by := auth.uid();
    new.validated_at := now();
  elsif new.status <> 'validada' then
    new.validated_by := null;
    new.validated_at := null;
  end if;

  return new;
end;
$$;

/*
 * `guard_validacion_dd` ya eximía el caso que se añadió al sacar un punto
 * de revisión, pero no los dos de antes —validar y marcar bloqueante—. Se
 * completa para que la tabla entera siga la misma regla.
 */
create or replace function app.guard_validacion_dd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;

  if new.status = 'validado'
     and (tg_op = 'INSERT' or old.status is distinct from 'validado')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Validar un punto de due diligence es del equipo de IWL'
      using errcode = '42501';
  end if;

  if new.status = 'bloqueante'
     and (tg_op = 'INSERT' or old.status is distinct from 'bloqueante')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Marcar un punto como bloqueante es del equipo de IWL'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE'
     and old.status in ('en_revision', 'validado', 'bloqueante')
     and new.status is distinct from old.status
     and not app.can_validate_company(new.company_id) then
    raise exception
      'Ese punto ya está en manos de IWL. Para moverlo, habla con quien lo revisa'
      using errcode = '42501';
  end if;

  if new.status = 'validado' and new.validated_at is null then
    new.validated_by := auth.uid();
    new.validated_at := now();
  end if;

  if new.status <> 'validado' then
    new.validated_by := null;
    new.validated_at := null;
  end if;

  return new;
end;
$$;
