-- =============================================================================
-- El NDA: comentarlo y tener uno propio
--
-- Punto 5 del flujo de entrada (modelo v2, apartado 8). La candidata puede
-- comentar el NDA antes de que esté firmado por las dos partes; el
-- comentario llega como aviso a dirección, que le responde. Si el
-- comentario cambia el texto, dirección guarda una versión propia de esa
-- candidatura, con las mismas reglas que la genérica: no se edita y lleva
-- su hash.
--
-- Una versión propia anula la firma de ella si IWL todavía no ha firmado,
-- y se la vuelve a pedir: lo que firmó ya no es lo que se va a firmar. Con
-- las dos firmas, un cambio ya es un NDA nuevo, no una versión, y la base
-- lo impide.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- La versión propia
-- -----------------------------------------------------------------------------

alter table nda_plantillas
  add column if not exists candidatura_id uuid references candidaturas(id) on delete cascade;

create index if not exists nda_plantillas_candidatura on nda_plantillas (candidatura_id, version desc);

comment on column nda_plantillas.candidatura_id is
  'Nulo es la plantilla genérica. Con valor, la versión propia de esa candidatura, que manda sobre la genérica.';

/*
 * La firma apuntaba a su versión con `restrict`, que se comprueba en el
 * acto: al borrar una candidatura entera, la versión propia se iba antes
 * que la firma que la nombra, y la base se negaba. `no action` espera al
 * final de la sentencia, cuando la firma ya se ha ido también. Borrar una
 * versión suelta con firmas sigue sin poderse.
 */
alter table nda_firmas drop constraint if exists nda_firmas_plantilla_id_fkey;
alter table nda_firmas
  add constraint nda_firmas_plantilla_id_fkey
  foreign key (plantilla_id) references nda_plantillas(id) on delete no action;

-- Ninguna versión se edita ni se borra, salvo con su candidatura entera
create or replace function app.guard_plantilla_nda()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 and old.candidatura_id is not null then
    return old;
  end if;
  raise exception 'Una versión del NDA no se edita ni se borra. Guarda una nueva.'
    using errcode = '42501';
end;
$$;

/*
 * Qué versión le toca a una candidatura: la propia más reciente, y si no
 * tiene, la genérica más reciente. Una sola respuesta para la puerta, la
 * firma y las dos pantallas.
 */
create or replace function app.plantilla_nda_de(p_candidatura uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from nda_plantillas
  where candidatura_id = p_candidatura or candidatura_id is null
  order by (candidatura_id is not null) desc, version desc
  limit 1
$$;

create or replace function public.plantilla_nda_de(p_candidatura uuid)
returns uuid language sql stable security definer set search_path = public
as $$
  select case
    when app.is_iwl() or p_candidatura = app.mi_candidatura_id() then app.plantilla_nda_de(p_candidatura)
  end
$$;

revoke all on function app.plantilla_nda_de(uuid) from public, anon, authenticated;
revoke all on function public.plantilla_nda_de(uuid) from public, anon;
grant execute on function public.plantilla_nda_de(uuid) to authenticated;

/*
 * Una versión propia puede llevar condiciones de esa startup: la ve IWL y
 * su candidata, nadie más. La genérica la sigue viendo cualquiera con
 * cuenta, como antes.
 */
drop policy if exists nda_plantillas_leer on nda_plantillas;
create policy nda_plantillas_leer on nda_plantillas
  for select to authenticated using (
    candidatura_id is null
    or app.is_iwl()
    or candidatura_id = app.mi_candidatura_id()
  );

/*
 * Al guardar una versión propia: con las dos firmas no se puede; con la de
 * ella sola, se anula y queda dicho en el historial con lo que firmó.
 * Uno firmado fuera de la plataforma ya lleva la de IWL, así que cae en el
 * primer caso.
 */
create or replace function app.al_guardar_nda_propio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f nda_firmas%rowtype;
begin
  if new.candidatura_id is null then return new; end if;

  select * into f from nda_firmas where candidatura_id = new.candidatura_id;
  if not found then return new; end if;

  if f.contrafirmado_at is not null then
    raise exception 'Este NDA ya está firmado por las dos partes. Un cambio es un NDA nuevo, no otra versión.'
      using errcode = 'P0001';
  end if;

  delete from nda_firmas where candidatura_id = new.candidatura_id;

  update avisos set cerrado_at = now(), cerrado_por = auth.uid()
  where candidatura_id = new.candidatura_id and tipo = 'nda_firmado' and cerrado_at is null;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle, created_by)
  values (
    new.candidatura_id, 'nota', 'Firma del NDA anulada: hay una versión nueva',
    format('Firmó %s el %s la versión %s (hash %s). Tiene que firmar la versión %s.',
           f.firmante_nombre, to_char(f.firmado_at at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI'),
           f.texto_version, f.texto_hash, new.version),
    auth.uid()
  );
  return new;
end;
$$;

-- Los disparadores del mismo momento van por orden alfabético: «numerar»
-- va antes que «propia», así que aquí `new.version` ya está puesto.
drop trigger if exists nda_plantillas_propia on nda_plantillas;
create trigger nda_plantillas_propia
  before insert on nda_plantillas
  for each row execute function app.al_guardar_nda_propio();

-- -----------------------------------------------------------------------------
-- La firma, contra la versión que le toca
--
-- Desde su última definición (`20261109130000_nda.sql`), con una
-- comprobación más: antes valía cualquier versión que mandara el
-- formulario, y con versiones propias eso dejaría firmar la genérica a
-- quien tiene la suya.
-- -----------------------------------------------------------------------------

create or replace function app.firmar_nda(
  p_candidatura uuid,
  p_profile uuid,
  p_nombre text,
  p_plantilla uuid,
  p_ip text,
  p_ua text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_hash text;
  v_correo text;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.profile_id is distinct from p_profile then
    raise exception 'Ese NDA no es tuyo.' using errcode = '42501';
  end if;
  if exists (select 1 from nda_firmas where candidatura_id = p_candidatura) then
    raise exception 'Este NDA ya está firmado.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 then
    raise exception 'Escribe tu nombre completo para firmar.' using errcode = 'P0001';
  end if;
  if p_plantilla is distinct from app.plantilla_nda_de(p_candidatura) then
    raise exception 'El NDA ha cambiado mientras lo leías. Vuelve a cargar la página y lee la versión nueva.'
      using errcode = 'P0001';
  end if;

  select hash into v_hash from nda_plantillas where id = p_plantilla;
  if v_hash is null then
    raise exception 'El NDA todavía no está preparado.' using errcode = 'P0001';
  end if;

  select email into v_correo from profiles where id = p_profile;

  insert into nda_firmas (
    candidatura_id, plantilla_id, texto_version, texto_hash,
    firmante_id, firmante_nombre, firmante_correo, firmado_at, firmado_ip, firmado_ua
  )
  select p_candidatura, p_plantilla, version::text, v_hash,
         p_profile, trim(p_nombre), v_correo, now(), p_ip, p_ua
  from nda_plantillas where id = p_plantilla;

  insert into avisos (tipo, profile_id, candidatura_id)
  values ('nda_firmado', p_profile, p_candidatura);
end;
$$;

-- -----------------------------------------------------------------------------
-- La puerta, desde su última definición (`20261109140000_estado_nda.sql`):
-- «sin plantilla» es que no hay ni genérica ni propia.
-- -----------------------------------------------------------------------------

create or replace function app.estado_nda(p_candidatura uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  f nda_firmas%rowtype;
begin
  select * into c from candidaturas where id = p_candidatura;
  if not found then return null; end if;

  -- Solo IWL y la propia candidata
  if auth.uid() is not null and not app.is_iwl() and c.profile_id is distinct from auth.uid() then
    return null;
  end if;

  select * into f from nda_firmas where candidatura_id = p_candidatura;
  if found then
    return case when f.contrafirmado_at is not null then 'firmado' else 'esperando_iwl' end;
  end if;

  if c.estado in ('firmada', 'descartada') or c.nda_firmado_on is not null then
    return 'no_aplica';
  end if;

  if app.plantilla_nda_de(p_candidatura) is null then
    return 'sin_plantilla';
  end if;
  return 'por_firmar';
end;
$$;

-- -----------------------------------------------------------------------------
-- Los comentarios
-- -----------------------------------------------------------------------------

create table if not exists nda_comentarios (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,
  plantilla_id uuid references nda_plantillas(id) on delete no action,
  profile_id uuid references profiles(id) on delete set null,
  texto text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now(),
  respuesta text,
  respondido_at timestamptz,
  respondido_por uuid references profiles(id) on delete set null
);

create index if not exists nda_comentarios_candidatura on nda_comentarios (candidatura_id, created_at);

comment on table nda_comentarios is
  'Lo que la candidata dice del NDA antes de firmarlo, y la respuesta de IWL.';

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario'));

/*
 * Lo que pone la base, no quien escribe: de quién es, sobre qué versión, y
 * que el NDA todavía se puede comentar. Una vez firmado por las dos partes,
 * un comentario ya no cambia nada.
 */
create or replace function app.al_comentar_nda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if app.estado_nda(new.candidatura_id) not in ('por_firmar', 'esperando_iwl') then
    raise exception 'El NDA ya no se puede comentar: o está firmado por las dos partes o todavía no hay texto.'
      using errcode = 'P0001';
  end if;
  new.profile_id := auth.uid();
  new.plantilla_id := app.plantilla_nda_de(new.candidatura_id);
  new.created_at := now();
  new.respuesta := null;
  new.respondido_at := null;
  new.respondido_por := null;

  insert into avisos (tipo, profile_id, candidatura_id)
  values ('nda_comentario', auth.uid(), new.candidatura_id);
  return new;
end;
$$;

drop trigger if exists nda_comentarios_nuevo on nda_comentarios;
create trigger nda_comentarios_nuevo
  before insert on nda_comentarios
  for each row execute function app.al_comentar_nda();

/*
 * Responder: lo único que cambia es la respuesta. Responder cierra el
 * aviso de ese comentario, si no queda ninguno más sin responder.
 */
create or replace function app.al_responder_nda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.candidatura_id, new.plantilla_id, new.profile_id, new.texto, new.created_at)
     is distinct from
     (old.candidatura_id, old.plantilla_id, old.profile_id, old.texto, old.created_at) then
    raise exception 'Un comentario no se edita: se responde.' using errcode = '42501';
  end if;
  if length(trim(coalesce(new.respuesta, ''))) = 0 then
    raise exception 'Escribe la respuesta.' using errcode = 'P0001';
  end if;
  new.respondido_at := now();
  new.respondido_por := auth.uid();

  if not exists (
    select 1 from nda_comentarios
    where candidatura_id = new.candidatura_id and id <> new.id and respuesta is null
  ) then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where candidatura_id = new.candidatura_id and tipo = 'nda_comentario' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists nda_comentarios_responder on nda_comentarios;
create trigger nda_comentarios_responder
  before update on nda_comentarios
  for each row execute function app.al_responder_nda();

alter table nda_comentarios enable row level security;

drop policy if exists nda_comentarios_leer on nda_comentarios;
create policy nda_comentarios_leer on nda_comentarios
  for select using (app.is_iwl() or candidatura_id = app.mi_candidatura_id());

-- Comenta la candidata, sobre la suya
drop policy if exists nda_comentarios_nuevo on nda_comentarios;
create policy nda_comentarios_nuevo on nda_comentarios
  for insert with check (candidatura_id = app.mi_candidatura_id());

-- Responde IWL
drop policy if exists nda_comentarios_responder on nda_comentarios;
create policy nda_comentarios_responder on nda_comentarios
  for update using (app.is_iwl()) with check (app.is_iwl());
