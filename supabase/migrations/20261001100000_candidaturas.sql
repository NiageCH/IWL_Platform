-- =============================================================================
-- El embudo de selección: todo lo que pasa antes de ser compañía
--
-- Hasta ahora la plataforma empezaba cuando una startup ya estaba dentro del
-- programa. Pero el trabajo empieza mucho antes: se abre una convocatoria,
-- se presentan, se revisa lo que mandan, hay una reunión, hay un comité que
-- escribe un informe y decide, se firma un NDA, se hace el due diligence, se
-- propone un acuerdo con su equity, y solo entonces —si se firma— hay
-- compañía.
--
-- Todo eso vivía en una carpeta de Drive y en la cabeza de quien lo llevaba.
--
-- Por qué una tabla aparte y no una compañía desde el día cero:
--
--   · La mayoría de las candidaturas no llegan a compañía. Meterlas en
--     `companies` llenaría la cartera de proyectos que no existen, y la
--     cartera es la lista de lo que IWL acompaña.
--   · Una candidata no tiene equipo con cuenta en la plataforma. Todo el
--     aislamiento por compañía se apoya en `company_members`, y ahí no habría
--     nadie a quien dar acceso.
--   · Lo que se quiere saber de una candidata —por qué se descartó, en qué
--     paso, cuánto tardó— no tiene sitio en la ficha de una compañía.
--
-- Al firmar el acuerdo, la candidatura crea su compañía y se queda apuntando
-- a ella. Así el histórico no se pierde: de cualquier compañía se puede
-- llegar a cómo entró.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Los pasos del embudo
--
-- Son estados y no etiquetas sueltas porque la pregunta que hay que poder
-- responder es «¿cuántas esperan comité?», y eso necesita que cada candidata
-- esté en uno y solo un sitio.
-- -----------------------------------------------------------------------------

create type estado_candidatura as enum (
  'presentada',      -- rellenó el formulario
  'en_revision',     -- IWL está mirando lo que mandó
  'reunion',         -- toca reunión, o ya la hubo
  'comite',          -- va a comité
  'preseleccionada', -- el comité dijo que sí
  'nda',             -- NDA firmado, se le pide la información del DD
  'diligencia',      -- due diligence en marcha
  'acuerdo',         -- hay documento de acuerdo sobre la mesa
  'firmada',         -- acuerdo firmado: ya es compañía
  'descartada'
);

-- -----------------------------------------------------------------------------
-- La convocatoria
--
-- Una cohorte ya existía, pero no sabía si estaba admitiendo candidaturas.
-- El formulario público necesita saberlo: sin esto no hay forma de cerrar la
-- puerta cuando acaba el plazo.
-- -----------------------------------------------------------------------------

alter table cohorts
  add column if not exists convocatoria_abierta boolean not null default false,
  add column if not exists convocatoria_cierra date,
  add column if not exists convocatoria_texto text;

comment on column cohorts.convocatoria_abierta is
  'Si el formulario público admite candidaturas para esta cohorte.';
comment on column cohorts.convocatoria_texto is
  'Lo que lee quien se presenta: a quién va dirigida y qué se le pide.';

-- -----------------------------------------------------------------------------
-- Las candidaturas
-- -----------------------------------------------------------------------------

create table candidaturas (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete restrict,

  -- Lo que cuenta de sí misma
  nombre text not null,
  sector text,
  one_liner text,
  website text,
  pais text,

  -- Con quién se habla
  contacto_nombre text not null,
  contacto_email text not null,
  contacto_telefono text,
  contacto_cargo text,

  /*
   * Dónde dice estar.
   *
   * Lo rellena quien se presenta y es una declaración, no un dato: el estado
   * de verdad sale del due diligence. Se guardan los dos para poder mirar
   * después cuánto se parecían, que dice bastante de una convocatoria.
   */
  estado_declarado estado_entrada,
  estado_verificado estado_entrada,

  equipo_personas int check (equipo_personas is null or equipo_personas >= 0),
  liderazgo_femenino_pct numeric(5,2)
    check (liderazgo_femenino_pct is null
           or (liderazgo_femenino_pct >= 0 and liderazgo_femenino_pct <= 100)),

  -- Por dónde va
  estado estado_candidatura not null default 'presentada',

  /*
   * El descarte guarda desde dónde se cayó.
   *
   * Sin esto, «descartada» solo dice que no entró. Con esto se puede ver que
   * la mitad se caen antes del comité, que es el tipo de cosa por la que se
   * cambia un proceso.
   */
  descartada_desde estado_candidatura,
  descartada_motivo text,
  descartada_at timestamptz,
  descartada_por uuid references profiles(id),

  -- Hitos del proceso, con su fecha
  nda_firmado_on date,
  acuerdo_propuesto_on date,
  acuerdo_firmado_on date,

  -- Lo que se propone
  equity_pct numeric(5,2)
    check (equity_pct is null or (equity_pct >= 0 and equity_pct <= 100)),
  aportacion_propuesta text,

  -- A dónde fue a parar
  company_id uuid unique references companies(id) on delete set null,

  notas text,
  origen text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),

  /*
   * Coherencia de los dos finales posibles.
   *
   * Una candidatura descartada tiene motivo y fecha; una firmada tiene su
   * compañía. Se comprueba en la base y no en el formulario porque un estado
   * final a medias es exactamente lo que nadie vuelve a arreglar.
   */
  constraint descarte_completo check (
    (estado <> 'descartada')
    or (descartada_at is not null and descartada_motivo is not null)
  ),
  constraint firmada_tiene_compania check (
    (estado <> 'firmada') or company_id is not null
  )
);

create index on candidaturas (cohort_id, estado);
create index on candidaturas (estado);
create unique index on candidaturas (cohort_id, lower(contacto_email));

comment on table candidaturas is
  'El embudo de selección, desde que una startup se presenta hasta que firma '
  'o se descarta. Al firmar crea su compañía y se queda apuntando a ella.';

-- -----------------------------------------------------------------------------
-- Lo que manda: enlaces a Drive
--
-- Mientras es candidata la documentación se queda donde ya está. Subirla a
-- la plataforma obligaría a mover ficheros que todavía no se sabe si van a
-- servir de algo. Al firmar el NDA, cuando la información pasa a ser
-- sensible, entra en la sala de datos, que es privada y con enlaces
-- firmados.
-- -----------------------------------------------------------------------------

create table candidatura_enlaces (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,
  titulo text not null,
  url text not null,
  tipo text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index on candidatura_enlaces (candidatura_id);

-- -----------------------------------------------------------------------------
-- Lo que ha ido pasando
--
-- La reunión, el comité con su informe, una nota, y cada cambio de estado.
-- Los cambios de estado los escribe un disparador, no la pantalla: así el
-- recorrido de una candidatura está completo aunque alguien la mueva desde
-- otro sitio.
-- -----------------------------------------------------------------------------

create type tipo_evento_candidatura as enum (
  'cambio_estado',
  'reunion',
  'comite',
  'nota'
);

create table candidatura_eventos (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references candidaturas(id) on delete cascade,
  tipo tipo_evento_candidatura not null,
  ocurrido_on date not null default current_date,
  titulo text,
  detalle text,
  desde estado_candidatura,
  hasta estado_candidatura,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index on candidatura_eventos (candidatura_id, ocurrido_on desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table candidaturas enable row level security;
alter table candidatura_enlaces enable row level security;
alter table candidatura_eventos enable row level security;

/*
 * El embudo es de IWL, y solo de IWL.
 *
 * No hay política para fundadoras ni para revisores de Niage: una candidata
 * no es una compañía y aquí hay nombres de startups que no entraron y
 * motivos de descarte. Eso no sale del equipo.
 */
create policy candidaturas_lectura on candidaturas
  for select to authenticated using (app.is_iwl());

create policy candidaturas_escritura on candidaturas
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy enlaces_todo on candidatura_enlaces
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy eventos_todo on candidatura_eventos
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- =============================================================================
-- El formulario público
--
-- Quien se presenta no tiene cuenta. Necesita poder escribir una candidatura
-- y nada más: ni leerla después, ni ver las de otras, ni tocar ninguna otra
-- tabla.
--
-- No se hace con una política de `insert` para `anon` sobre la tabla, porque
-- eso deja la tabla abierta a quien tenga la clave pública —que va en el
-- navegador— y permitiría inventarse el estado, el equity o la cohorte. Se
-- hace con una función que recibe solo lo que el formulario pide y pone el
-- resto ella.
-- =============================================================================

create or replace function app.presentar_candidatura(
  p_nombre text,
  p_contacto_nombre text,
  p_contacto_email text,
  p_sector text default null,
  p_one_liner text default null,
  p_website text default null,
  p_pais text default null,
  p_contacto_telefono text default null,
  p_contacto_cargo text default null,
  p_estado_declarado estado_entrada default null,
  p_equipo_personas int default null,
  p_liderazgo_femenino_pct numeric default null,
  p_origen text default null,
  p_enlaces jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohorte uuid;
  v_id uuid;
  v_enlace jsonb;
begin
  -- Solo se admite si hay convocatoria abierta. La elige la base, no quien
  -- rellena: si no, se podría presentar a una cohorte cerrada.
  select id into v_cohorte
  from cohorts
  where convocatoria_abierta
    and (convocatoria_cierra is null or convocatoria_cierra >= current_date)
  order by start_date desc
  limit 1;

  if v_cohorte is null then
    raise exception 'No hay ninguna convocatoria abierta ahora mismo.'
      using errcode = 'P0001';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Hace falta el nombre de la startup.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_contacto_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no parece un correo.' using errcode = 'P0001';
  end if;

  insert into candidaturas (
    cohort_id, nombre, sector, one_liner, website, pais,
    contacto_nombre, contacto_email, contacto_telefono, contacto_cargo,
    estado_declarado, equipo_personas, liderazgo_femenino_pct, origen
  ) values (
    v_cohorte,
    trim(p_nombre),
    nullif(trim(coalesce(p_sector, '')), ''),
    nullif(trim(coalesce(p_one_liner, '')), ''),
    nullif(trim(coalesce(p_website, '')), ''),
    nullif(trim(coalesce(p_pais, '')), ''),
    trim(p_contacto_nombre),
    lower(trim(p_contacto_email)),
    nullif(trim(coalesce(p_contacto_telefono, '')), ''),
    nullif(trim(coalesce(p_contacto_cargo, '')), ''),
    p_estado_declarado,
    p_equipo_personas,
    p_liderazgo_femenino_pct,
    nullif(trim(coalesce(p_origen, '')), '')
  )
  returning id into v_id;

  -- Los enlaces que haya dejado, hasta diez: más que eso no es una
  -- candidatura, es un volcado
  for v_enlace in
    select * from jsonb_array_elements(coalesce(p_enlaces, '[]'::jsonb)) limit 10
  loop
    if coalesce(trim(v_enlace ->> 'url'), '') <> '' then
      insert into candidatura_enlaces (candidatura_id, titulo, url, tipo)
      values (
        v_id,
        coalesce(nullif(trim(v_enlace ->> 'titulo'), ''), 'Documento'),
        trim(v_enlace ->> 'url'),
        nullif(trim(v_enlace ->> 'tipo'), '')
      );
    end if;
  end loop;

  return v_id;
end;
$$;

revoke all on function app.presentar_candidatura from public;
grant execute on function app.presentar_candidatura to anon, authenticated;

comment on function app.presentar_candidatura is
  'Alta de una candidatura desde el formulario público. Recibe solo lo que '
  'el formulario pide; la cohorte, el estado y las fechas las pone la base.';

/*
 * Qué convocatoria enseñar en el formulario.
 *
 * Devuelve lo justo para pintar la pantalla. Sin esto habría que abrir
 * `cohorts` a `anon`, y ahí está el objetivo de invertibles de la cohorte,
 * que no es asunto de quien se presenta.
 */
create or replace function app.convocatoria_abierta()
returns table (nombre text, cierra date, texto text)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, c.convocatoria_cierra, c.convocatoria_texto
  from cohorts c
  where c.convocatoria_abierta
    and (c.convocatoria_cierra is null or c.convocatoria_cierra >= current_date)
  order by c.start_date desc
  limit 1
$$;

revoke all on function app.convocatoria_abierta from public;
grant execute on function app.convocatoria_abierta to anon, authenticated;

-- =============================================================================
-- El recorrido se escribe solo
-- =============================================================================

create or replace function app.registrar_cambio_de_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    insert into candidatura_eventos (
      candidatura_id, tipo, desde, hasta, titulo, created_by
    ) values (
      new.id,
      'cambio_estado',
      old.estado,
      new.estado,
      case
        when new.estado = 'descartada'
          then coalesce(new.descartada_motivo, 'Descartada')
        else null
      end,
      auth.uid()
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger candidatura_cambio_de_estado
  before update on candidaturas
  for each row execute function app.registrar_cambio_de_estado();

-- =============================================================================
-- De candidatura a compañía
--
-- El final del embudo. Crea la compañía con `app.crear_compania`, que es la
-- misma puerta que usa el alta manual —así una compañía nacida de una
-- candidatura es idéntica a cualquier otra—, y deja la candidatura
-- apuntando a ella.
-- =============================================================================

create or replace function app.firmar_candidatura(
  p_candidatura uuid,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_firmado_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_company uuid;
begin
  if not app.is_iwl() then
    raise exception 'Firmar un acuerdo es del equipo de IWL.'
      using errcode = '42501';
  end if;

  select * into c from candidaturas where id = p_candidatura for update;

  if not found then
    raise exception 'Esa candidatura no existe.' using errcode = 'P0001';
  end if;

  if c.company_id is not null then
    raise exception 'Esa candidatura ya tiene compañía.' using errcode = 'P0001';
  end if;

  if c.estado = 'descartada' then
    raise exception 'Esa candidatura está descartada. Reábrela antes de firmar.'
      using errcode = 'P0001';
  end if;

  v_company := app.crear_compania(
    p_name              => c.nombre,
    p_slug              => p_slug,
    p_stage             => p_stage,
    p_tech_profile      => p_tech_profile,
    p_phase_code        => p_phase_code,
    -- El estado de entrada es el verificado en el due diligence, no el que
    -- declaró al presentarse
    p_entry_state       => coalesce(c.estado_verificado, c.estado_declarado),
    p_roadmap_template  => p_roadmap_template,
    p_roadmap_start     => p_roadmap_start,
    p_sector            => c.sector,
    p_one_liner         => c.one_liner,
    p_cohort_id         => c.cohort_id,
    p_female_leadership_pct => c.liderazgo_femenino_pct,
    p_founded_on        => null,
    p_website           => c.website
  );

  update candidaturas
  set company_id = v_company,
      estado = 'firmada',
      acuerdo_firmado_on = coalesce(p_firmado_on, current_date)
  where id = p_candidatura;

  return v_company;
end;
$$;

comment on function app.firmar_candidatura is
  'Cierra el embudo: crea la compañía por la misma puerta que el alta manual '
  'y deja la candidatura apuntando a ella.';

-- =============================================================================
-- La vista del embudo
-- =============================================================================

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

-- -----------------------------------------------------------------------------
-- Las puertas públicas
--
-- PostgREST solo expone `public`, así que lo de `app` necesita una envoltura
-- para poder llamarse desde la aplicación. Van en `security invoker`: la
-- autorización la sigue decidiendo la función de dentro, no la envoltura.
-- -----------------------------------------------------------------------------

create or replace function public.firmar_candidatura(
  p_candidatura uuid,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_firmado_on date default current_date
)
returns uuid language sql security invoker set search_path = public
as $$
  select app.firmar_candidatura(
    p_candidatura, p_slug, p_stage, p_tech_profile,
    p_phase_code, p_roadmap_template, p_roadmap_start, p_firmado_on
  )
$$;

/*
 * Estas dos van en `security definer`, al revés que el resto de envolturas.
 *
 * `anon` no tiene USAGE sobre el esquema `app`, y no conviene dárselo: eso
 * le abriría todas las funciones de ahí, no solo estas dos. Con `definer` la
 * envoltura entra ella, y lo que decide qué se puede hacer sigue siendo la
 * función de dentro, que es la que elige la cohorte y fuerza el estado
 * inicial.
 */
create or replace function public.presentar_candidatura(
  p_nombre text,
  p_contacto_nombre text,
  p_contacto_email text,
  p_sector text default null,
  p_one_liner text default null,
  p_website text default null,
  p_pais text default null,
  p_contacto_telefono text default null,
  p_contacto_cargo text default null,
  p_estado_declarado estado_entrada default null,
  p_equipo_personas int default null,
  p_liderazgo_femenino_pct numeric default null,
  p_origen text default null,
  p_enlaces jsonb default '[]'::jsonb
)
returns uuid language sql security definer set search_path = public
as $$
  select app.presentar_candidatura(
    p_nombre, p_contacto_nombre, p_contacto_email, p_sector, p_one_liner,
    p_website, p_pais, p_contacto_telefono, p_contacto_cargo,
    p_estado_declarado, p_equipo_personas, p_liderazgo_femenino_pct,
    p_origen, p_enlaces
  )
$$;

revoke all on function public.presentar_candidatura from public;
grant execute on function public.presentar_candidatura to anon, authenticated;

create or replace function public.convocatoria_abierta()
returns table (nombre text, cierra date, texto text)
language sql stable security definer set search_path = public
as $$ select * from app.convocatoria_abierta() $$;

revoke all on function public.convocatoria_abierta from public;
grant execute on function public.convocatoria_abierta to anon, authenticated;
