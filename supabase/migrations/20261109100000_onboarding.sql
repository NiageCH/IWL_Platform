-- =============================================================================
-- El alta de una persona, paso a paso, y los avisos a dirección
--
-- Rodrigo dio de alta a Agustina en producción y no había forma de saber si
-- había entrado, si había cambiado la contraseña o dónde se había quedado.
-- `auth.users` guarda el último acceso, no el primero, y nada guardaba
-- cuándo se cambió la contraseña temporal.
--
-- Aquí se guarda eso, lo escribe la base y nadie más, y deja un aviso a
-- dirección cuando alguien entra por primera vez. La línea de pasos se
-- calcula en `lib/onboarding.ts` a partir de estas fechas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Las fechas del alta, en el perfil
-- -----------------------------------------------------------------------------

alter table profiles
  add column if not exists primer_acceso_at timestamptz,
  add column if not exists contrasena_cambiada_at timestamptz;

comment on column profiles.primer_acceso_at is
  'Primera vez que entró. Lo escribe un disparador sobre auth.users; nadie lo edita.';
comment on column profiles.contrasena_cambiada_at is
  'Cuándo cambió la contraseña temporal que le puso otra persona. Lo escribe la base.';

/*
 * Las cuentas que ya habían entrado: su primer acceso no se sabe, y el
 * último es la mejor aproximación que hay. Mejor una fecha algo tardía que
 * un «no ha entrado nunca» falso.
 */
update profiles p
set primer_acceso_at = u.last_sign_in_at
from auth.users u
where u.id = p.id and p.primer_acceso_at is null and u.last_sign_in_at is not null;

/*
 * Nadie las edita con sesión, tampoco la dirección: un primer acceso
 * escrito a mano deja de decir cuándo entró. Es integridad del dato, pero
 * se exime sin sesión porque quien las escribe —los disparadores sobre
 * `auth.users`— va sin sesión.
 */
create or replace function app.guard_fechas_alta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;

  if new.primer_acceso_at is distinct from old.primer_acceso_at
     or new.contrasena_cambiada_at is distinct from old.contrasena_cambiada_at then
    raise exception 'Las fechas de acceso las escribe la plataforma, no se editan'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_fechas_alta on profiles;
create trigger profiles_guard_fechas_alta
  before update on profiles
  for each row execute function app.guard_fechas_alta();

-- -----------------------------------------------------------------------------
-- Los avisos
--
-- Los que son un hecho puntual —entró por primera vez, firmó el NDA— se
-- guardan, para poder darlos por vistos. Los que son una situación —un paso
-- parado más de la cuenta— no se guardan: se calculan, y desaparecen solos
-- cuando el paso se mueve.
-- -----------------------------------------------------------------------------

create table if not exists avisos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('primer_acceso', 'nda_firmado')),
  profile_id uuid references profiles(id) on delete cascade,
  candidatura_id uuid references candidaturas(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  cerrado_at timestamptz,
  cerrado_por uuid references profiles(id) on delete set null
);

create index if not exists avisos_abiertos on avisos (created_at desc) where cerrado_at is null;

comment on table avisos is
  'Avisos a dirección por hechos puntuales. Los pasos detenidos no van aquí: se calculan.';

alter table avisos enable row level security;

-- De dirección: es quien los atiende y quien firma el NDA por IWL
drop policy if exists avisos_direccion on avisos;
create policy avisos_direccion on avisos
  for select using (app.is_admin());

drop policy if exists avisos_cerrar on avisos;
create policy avisos_cerrar on avisos
  for update using (app.is_admin()) with check (app.is_admin());

-- -----------------------------------------------------------------------------
-- El primer acceso
--
-- Sobre `auth.users`, porque es lo único que sabe cuándo entra alguien. De
-- nulo a una fecha es la primera vez; lo demás no interesa aquí.
-- -----------------------------------------------------------------------------

create or replace function app.registrar_primer_acceso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.last_sign_in_at is null and new.last_sign_in_at is not null then
    update public.profiles
      set primer_acceso_at = new.last_sign_in_at
      where id = new.id and primer_acceso_at is null;

    insert into public.avisos (tipo, profile_id, candidatura_id)
    select 'primer_acceso', new.id,
           (select c.id from public.candidaturas c where c.profile_id = new.id)
    where exists (select 1 from public.profiles p where p.id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists registrar_primer_acceso on auth.users;
create trigger registrar_primer_acceso
  after update of last_sign_in_at on auth.users
  for each row execute function app.registrar_primer_acceso();

-- -----------------------------------------------------------------------------
-- El cambio de la contraseña temporal
--
-- La misma función de `20261105120000_contrasena_temporal.sql`, que ya
-- sabe cuándo se va la marca: ahora además apunta la fecha en el perfil.
-- -----------------------------------------------------------------------------

create or replace function app.olvidar_contrasena_temporal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and new.raw_app_meta_data ? 'debe_cambiar_password' then
    new.raw_app_meta_data := new.raw_app_meta_data - 'debe_cambiar_password';

    update public.profiles
      set contrasena_cambiada_at = now()
      where id = new.id;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- La firma del NDA
--
-- La tabla va aquí porque la línea de pasos ya la lee; el flujo de firma
-- llega en la siguiente migración. Una fila por candidatura, con las dos
-- firmas y su rastro.
-- -----------------------------------------------------------------------------

create table if not exists nda_firmas (
  candidatura_id uuid primary key references candidaturas(id) on delete cascade,
  firmante_id uuid references profiles(id) on delete set null,
  firmante_nombre text,
  firmado_at timestamptz,
  firmado_ip text,
  contrafirmante_id uuid references profiles(id) on delete set null,
  contrafirmante_nombre text,
  contrafirmado_at timestamptz,
  documento_id uuid references candidatura_documentos(id) on delete set null,
  texto_version text,
  created_at timestamptz not null default now()
);

alter table nda_firmas enable row level security;

drop policy if exists nda_firmas_iwl on nda_firmas;
create policy nda_firmas_iwl on nda_firmas
  for select using (app.is_iwl());

drop policy if exists nda_firmas_propia on nda_firmas;
create policy nda_firmas_propia on nda_firmas
  for select using (candidatura_id = app.mi_candidatura_id());

-- -----------------------------------------------------------------------------
-- Cuándo un paso parado pide atención
-- -----------------------------------------------------------------------------

insert into platform_settings (key, value, description)
values (
  'onboarding_umbrales',
  '{"atencion_dias": 5, "vencido_dias": 10}',
  'Días que una persona puede llevar en un paso del alta antes de que se avise: atención y vencido.'
)
on conflict (key) do nothing;
