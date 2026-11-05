-- =============================================================================
-- Una candidatura también puede ser de demostración
--
-- La nube se vacía de pruebas y se queda, del embudo, con una candidatura de
-- muestra por cada desenlace —abierta, firmada y descartada— para que se vea
-- cómo es cada una. Igual que Marea Clínica en la cartera: están para
-- enseñarse, así que se ven, con su distintivo, pero no cuentan. Una
-- muestra firmada en un embudo de tres candidaturas reales cambia la tasa
-- de conversión entera.
--
-- Se marca en la base y no por nombre: hasta ahora la candidatura de
-- revisión se reconocía solo porque se llamaba «Revisión · Candidatura».
-- =============================================================================

alter table candidaturas
  add column if not exists is_demo boolean not null default false;

comment on column candidaturas.is_demo is
  'Candidatura de demostración: se ve en el embudo con su distintivo, pero '
  'no entra en ningún recuento (por paso, abiertas, firmadas, descartadas, '
  'conversión). Mismo criterio que companies.is_demo.';

/*
 * Quién puede marcarla: la dirección, como en las compañías. Sacar una
 * candidatura de los números del embudo no es una preferencia de pantalla.
 *
 * Es un guardián de autorización, así que sin sesión no se aplica: los
 * scripts que preparan las muestras van con la clave de servicio.
 */
create or replace function app.guard_candidatura_demo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;

  if new.is_demo is distinct from old.is_demo and not app.is_admin() then
    raise exception 'Marcar una candidatura como demostración es de la dirección de IWL'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists candidaturas_guard_demo on candidaturas;
create trigger candidaturas_guard_demo
  before update on candidaturas
  for each row execute function app.guard_candidatura_demo();

-- -----------------------------------------------------------------------------
-- La vista del embudo, por tercera vez
--
-- Se creó con `c.*`, y una vista congela sus columnas al crearse: sin
-- recrearla, `is_demo` no llegaría a la pantalla y las muestras contarían.
-- Se recrea desde la última definición, la de
-- `20261001130000_acceso_candidata.sql`, sin quitarle nada.
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
