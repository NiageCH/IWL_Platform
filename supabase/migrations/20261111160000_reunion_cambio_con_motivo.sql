-- =============================================================================
-- Cambiar una reunión confirmada lleva su motivo
--
-- (REVISION, 11 nov) Como cancelarla: cambiarla mueve algo que ella ya tenía
-- en el calendario, y el porqué va en el aviso que le llega. Se guarda en la
-- reunión, no solo en el correo, para que la base lo pueda exigir.
-- =============================================================================

alter table candidatura_reuniones
  add column if not exists cambiada_motivo text;

comment on column candidatura_reuniones.cambiada_motivo is
  'Por qué se cambió la última vez que estaba confirmada. Vacío si no se ha cambiado';

-- Recreada desde su última definición (20261111130000)
create or replace function app.guard_reunion()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'confirmada' then
    if new.elegida is null then
      raise exception 'Una reunión confirmada tiene su franja elegida.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from jsonb_array_elements(new.franjas) f where f ->> 'inicio' = new.elegida ->> 'inicio') then
      raise exception 'La franja elegida no es una de las propuestas.' using errcode = 'P0001';
    end if;
  end if;
  if new.estado = 'cancelada' and length(trim(coalesce(new.cancelada_motivo, ''))) = 0 then
    raise exception 'Cancelar una reunión lleva su motivo.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.estado = 'confirmada' and new.estado = 'propuesta'
     and length(trim(coalesce(new.cambiada_motivo, ''))) = 0 then
    raise exception 'Cambiar una reunión confirmada lleva su motivo.' using errcode = 'P0001';
  end if;
  if new.formato = 'videollamada' and length(trim(coalesce(new.enlace, ''))) = 0 then
    raise exception 'Una videollamada lleva su enlace.' using errcode = 'P0001';
  end if;
  if new.formato = 'presencial' and length(trim(coalesce(new.direccion, ''))) = 0 then
    raise exception 'Una reunión presencial lleva su dirección.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
