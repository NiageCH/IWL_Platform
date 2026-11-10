-- =============================================================================
-- Ningún Anexo se firma sin que ella lo haya aceptado, y ella tiene cuenta
--
-- Respuestas de Rodrigo del 10 nov:
--
--   1. La fundadora tiene cuenta siempre antes del Acuerdo. «Proponer» se
--      bloquea mientras no la tenga; no hay aceptaciones registradas por IWL
--      en su nombre. El NDA firmado fuera se admite porque es anterior a la
--      relación; el Acuerdo ya no lo es.
--   2. Propuesta y aceptación también al renovar el Anexo en incubación. Se
--      quita la firma directa del borrador.
-- =============================================================================

/*
 * Redefinición de `20261110141000_anexo_propuesta_y_acuerdo.sql`.
 *
 * · Proponer pide, en cualquier tramo, una fundadora con cuenta en la
 *   compañía y quién firma. La incorporación en «sí», solo en entrada.
 * · Firmar, solo desde aceptado. Es integridad: vale también sin sesión.
 */
create or replace function app.guard_estado_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tramo tramo_compania;
begin
  if new.status is not distinct from old.status then return new; end if;
  select tramo into v_tramo from companies where id = new.company_id;

  if new.status = 'propuesto' and old.status = 'borrador' then
    if v_tramo = 'entrada' and not exists (
      select 1 from decisiones_incorporacion where company_id = new.company_id and decision = 'si'
    ) then
      raise exception 'Antes de proponer el Acuerdo, dirección tiene que decidir la incorporación.' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from company_members where company_id = new.company_id and member_role = 'fundadora'
    ) then
      raise exception 'Para proponérselo, ella tiene que tener cuenta en la plataforma: es donde lo lee y lo acepta. Dale acceso primero.'
        using errcode = 'P0001';
    end if;
    if new.duration_months is null or new.committed_hours is null then
      raise exception 'Antes de proponerlo, pon al menos la duración y las horas comprometidas.' using errcode = 'P0001';
    end if;
    if jsonb_array_length(new.firmantes) = 0 then
      raise exception 'Falta decir quién firma el Acuerdo.' using errcode = 'P0001';
    end if;
    new.propuesto_at := now();
    new.propuesto_por := coalesce(auth.uid(), new.propuesto_por);
    new.aceptado_at := null;
    new.aceptado_por := null;
    return new;
  end if;

  if new.status = 'comentado' and old.status in ('propuesto', 'comentado') then
    return new;
  end if;

  if new.status = 'aceptado' and old.status in ('propuesto', 'comentado') then
    if auth.uid() is not null and not exists (
      select 1 from company_members
      where company_id = new.company_id and profile_id = auth.uid() and member_role = 'fundadora'
    ) then
      raise exception 'La propuesta la acepta la fundadora.' using errcode = '42501';
    end if;
    new.aceptado_at := now();
    new.aceptado_por := coalesce(auth.uid(), new.aceptado_por);
    return new;
  end if;

  if new.status = 'borrador' and old.status in ('propuesto', 'comentado', 'aceptado') then
    new.propuesto_at := null;
    new.propuesto_por := null;
    new.aceptado_at := null;
    new.aceptado_por := null;
    return new;
  end if;

  if new.status = 'firmado' and old.status = 'aceptado' then
    return new;
  end if;

  if new.status = 'cerrado' and old.status = 'firmado' then
    return new;
  end if;

  if new.status = 'firmado' then
    raise exception 'Un Anexo se firma cuando ella lo ha aceptado: propónselo primero.' using errcode = 'P0001';
  end if;
  raise exception 'Un Anexo no pasa de «%» a «%».', old.status, new.status using errcode = 'P0001';
end;
$$;

/*
 * Redefinición: un Anexo nace en borrador en cualquier tramo. Insertarlo ya
 * firmado o aceptado sería la firma directa por otra puerta. Sin sesión no
 * se comprueba: es la semilla registrando Anexos que ya existían.
 */
create or replace function app.guard_anexo_nace_borrador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.status <> 'borrador' then
    raise exception 'Un Anexo nace en borrador: se propone, ella lo acepta y se firma.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

/*
 * Darle cuenta de fundadora en una compañía que ya existe: la que entró con
 * el NDA firmado fuera. La cuenta la crea el servidor con la clave de
 * servicio; esto la hace fundadora de esa compañía, que es de IWL decidir.
 */
create or replace function app.dar_acceso_fundadora(p_company uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_iwl() then
    raise exception 'Dar acceso es del equipo de IWL.' using errcode = '42501';
  end if;

  update profiles set role = 'fundadora'
  where id = p_profile and role in ('candidata', 'fundadora');
  if not found then
    raise exception 'Esa cuenta es de otro tipo: no se convierte en fundadora.' using errcode = 'P0001';
  end if;

  insert into company_members (company_id, profile_id, member_role)
  values (p_company, p_profile, 'fundadora')
  on conflict do nothing;

  update candidaturas
  set profile_id = p_profile, token_anulado_at = coalesce(token_anulado_at, now())
  where company_id = p_company and profile_id is null;
end;
$$;

create or replace function public.dar_acceso_fundadora(p_company uuid, p_profile uuid)
returns void
language sql
set search_path = public
as $$ select app.dar_acceso_fundadora(p_company, p_profile) $$;

revoke all on function public.dar_acceso_fundadora(uuid, uuid) from public, anon;
grant execute on function public.dar_acceso_fundadora(uuid, uuid) to authenticated;
