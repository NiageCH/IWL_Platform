-- =============================================================================
-- Borrar una candidatura entera se lleva sus actas, firmadas o no
--
-- Los guardianes del acta firmada (`20261109170000_comite.sql`) impedían
-- también el borrado en cascada: al borrar una candidatura con un acta
-- firmada, la base se negaba, y `nube:vaciar` no podía vaciar.
--
-- La regla es que lo firmado no se altera: ni se edita, ni se borra suelto,
-- ni cambia su comité. Borrar el expediente entero, con todo lo que tiene
-- dentro, es otra operación. La cascada se reconoce porque llega desde el
-- disparador de la clave foránea: un nivel de disparadores más hondo.
-- =============================================================================

create or replace function app.guard_acta_firmada()
returns trigger
language plpgsql
as $$
begin
  -- Se borra la candidatura entera: el acta se va con ella
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;

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

create or replace function app.guard_miembros_acta()
returns trigger
language plpgsql
as $$
declare
  v_acta uuid := coalesce(new.acta_id, old.acta_id);
begin
  -- Se borra el acta, por cascada de su candidatura: sus firmas, con ella
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;

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
