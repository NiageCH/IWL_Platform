-- =============================================================================
-- Una compañía puede ser de demostración
--
-- Hace falta una compañía completa para enseñar la plataforma, formar a quien
-- entra y comprobar que cada estado se ve como debe. Las ficticias del seed
-- versionado existen justo para eso.
--
-- El problema es que hasta ahora no se distinguían de las reales en ninguna
-- parte, así que **contaban**: entraban en las medias de la cohorte, en el
-- embudo hacia invertible, en el panel de compromiso y en el runway. Una
-- demostración diseñada para recorrer todos los estados tiene, por
-- construcción, hallazgos críticos, hitos vencidos y un update sin entregar:
-- exactamente los datos que peor deforman una media. El número que IWL mira
-- para decidir acababa contaminado por un proyecto que no existe.
--
-- La alternativa era archivarla, pero entonces desaparece de la cartera y
-- deja de servir para lo que está: enseñarse. Por eso una marca propia y no
-- `archived_at`.
--
-- Se marca en la base y no en una lista de slugs en el código: quién es la
-- demostración cambia según la instalación —en local es Marea Clínica, en la
-- nube puede no haber ninguna— y un dato de instalación no se versiona.
-- =============================================================================

alter table companies
  add column if not exists is_demo boolean not null default false;

comment on column companies.is_demo is
  'Compañía de demostración: se ve en la cartera con su distintivo, pero no '
  'entra en ningún agregado de cohorte (comparativa, embudo, compromiso, '
  'runway, alertas). No confundir con archived_at, que la saca de la vista.';

/*
 * Quién puede marcarla.
 *
 * Es de la dirección: convertir una compañía en demostración la saca de los
 * números con los que se decide, y eso no es una preferencia de pantalla.
 */
create or replace function app.guard_marca_demo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;

  if new.is_demo is distinct from old.is_demo and not app.is_admin() then
    raise exception 'Marcar una compañía como demostración es de la dirección de IWL'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists companies_guard_demo on companies;
create trigger companies_guard_demo
  before update on companies
  for each row execute function app.guard_marca_demo();
