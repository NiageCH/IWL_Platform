-- =============================================================================
-- El Anexo, más corto: lo que IWL compromete en horas y en dinero
--
-- (REVISION, 10 nov) «Perfiles sénior» sale del Anexo. La columna
-- `committed_seniors` se queda, sin uso: hay Anexos firmados que la llevan y
-- lo firmado no se toca.
--
-- «Valoradas en» se calcula con una tarifa del programa, la de este ajuste.
-- Vacío, se escribe a mano como hasta ahora. Si se escribe otro valor que el
-- calculado, se dice por qué, y el motivo va con la propuesta.
-- =============================================================================

insert into platform_settings (key, value, description) values
  ('anexo_tarifa_hora', '{"euros_hora": null}'::jsonb,
   'Euros por hora con que se valoran las horas comprometidas en el Anexo, {"euros_hora": x}. Vacío, el valor se escribe a mano')
on conflict (key) do nothing;

alter table annexes
  add column if not exists committed_hours_value_motivo text;

comment on column annexes.committed_hours_value_motivo is
  'Por qué el valor de las horas no es horas × tarifa del programa. Vacío si es el calculado';

comment on column annexes.committed_seniors is
  'Sin uso desde el 11 nov 2026: «Perfiles sénior» salió del Anexo. Se conserva por los Anexos ya guardados';

-- El motivo forma parte de lo propuesto: tampoco se cambia sin volver a
-- borrador. Recreada desde su última definición (20261110180000).
create or replace function app.guard_anexo_propuesto()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('propuesto', 'comentado', 'aceptado')
     and new.status in ('propuesto', 'comentado', 'aceptado')
     and (
          new.duration_months is distinct from old.duration_months
       or new.starts_on is distinct from old.starts_on
       or new.ends_on is distinct from old.ends_on
       or new.committed_hours is distinct from old.committed_hours
       or new.committed_hours_value is distinct from old.committed_hours_value
       or new.committed_hours_value_motivo is distinct from old.committed_hours_value_motivo
       or new.committed_cash is distinct from old.committed_cash
       or new.committed_seniors is distinct from old.committed_seniors
       or new.equity_pct is distinct from old.equity_pct
       or new.other_commitments is distinct from old.other_commitments
       or new.firmantes is distinct from old.firmantes
       or new.equity_fuera_motivo is distinct from old.equity_fuera_motivo
     ) then
    raise exception 'Un Anexo propuesto no se edita. Devuélvelo a borrador para cambiarlo y propónselo otra vez.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
