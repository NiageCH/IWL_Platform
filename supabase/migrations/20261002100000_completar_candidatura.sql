-- =============================================================================
-- La candidata completa su propia ficha
--
-- Faltaba el camino de la invitación, y es el que más se usa en una
-- incubadora boutique: IWL conoce a alguien en un evento, la da de alta a
-- mano con el nombre y un correo, y le manda su enlace.
--
-- Hasta ahora ese enlace le daba las gracias por el material que había
-- mandado. Pero no había mandado nada: la ficha la había escrito IWL con
-- dos campos. La candidata no tenía dónde contar quién es.
--
-- Esto le deja completar lo suyo desde el enlace: lo mismo que habría
-- rellenado en el formulario público, ni más ni menos. No puede tocar su
-- estado, ni el equity, ni nada que decida IWL.
-- =============================================================================

create or replace function app.completar_candidatura(
  p_token text,
  p_sector text default null,
  p_one_liner text default null,
  p_website text default null,
  p_pais text default null,
  p_contacto_cargo text default null,
  p_contacto_telefono text default null,
  p_estado_declarado estado_entrada default null,
  p_equipo_personas int default null,
  p_liderazgo_femenino_pct numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select c.id into v_id
  from candidaturas c
  where c.token = p_token
    and c.token_anulado_at is null
    and c.estado not in ('firmada', 'descartada');

  if v_id is null then
    raise exception 'Ese enlace ya no está activo.' using errcode = 'P0001';
  end if;

  /*
   * Se actualiza solo lo que venga con algo.
   *
   * Un formulario parcial no puede borrar lo que ya estaba: si IWL apuntó
   * el sector al darla de alta y ella deja ese campo vacío, el sector se
   * queda. Vaciar un campo a propósito es una conversación, no un descuido
   * de formulario.
   */
  update candidaturas set
    sector = coalesce(nullif(trim(coalesce(p_sector, '')), ''), sector),
    one_liner = coalesce(nullif(trim(coalesce(p_one_liner, '')), ''), one_liner),
    website = coalesce(nullif(trim(coalesce(p_website, '')), ''), website),
    pais = coalesce(nullif(trim(coalesce(p_pais, '')), ''), pais),
    contacto_cargo = coalesce(
      nullif(trim(coalesce(p_contacto_cargo, '')), ''), contacto_cargo
    ),
    contacto_telefono = coalesce(
      nullif(trim(coalesce(p_contacto_telefono, '')), ''), contacto_telefono
    ),
    estado_declarado = coalesce(p_estado_declarado, estado_declarado),
    equipo_personas = coalesce(p_equipo_personas, equipo_personas),
    liderazgo_femenino_pct = coalesce(
      p_liderazgo_femenino_pct, liderazgo_femenino_pct
    ),
    updated_at = now()
  where id = v_id;
end;
$$;

revoke all on function app.completar_candidatura from public;
grant execute on function app.completar_candidatura to anon, authenticated;

comment on function app.completar_candidatura is
  'Deja a una candidata rellenar su propia ficha desde el enlace privado. '
  'Solo los campos descriptivos; el estado y el acuerdo son de IWL.';

-- -----------------------------------------------------------------------------
-- Y que el enlace sepa qué le falta por contar
--
-- `ver_candidatura` devolvía lo justo para enseñar el estado. Ahora tiene
-- que devolver también lo que ella misma escribió, para que el formulario
-- salga relleno y para que la pantalla sepa si la ficha está a medias.
--
-- Se recrea entera: cambiar la forma de lo que devuelve una función que ya
-- devuelve una tabla exige soltarla antes.
-- -----------------------------------------------------------------------------

drop function if exists public.ver_candidatura(text);
drop function if exists app.ver_candidatura(text);

create function app.ver_candidatura(p_token text)
returns table (
  id uuid,
  nombre text,
  momento text,
  presentada_on date,
  convocatoria text,
  puede_subir boolean,
  enlaces jsonb,
  -- Lo suyo, para que pueda completarlo
  sector text,
  one_liner text,
  website text,
  pais text,
  contacto_cargo text,
  contacto_telefono text,
  estado_declarado estado_entrada,
  equipo_personas int,
  liderazgo_femenino_pct numeric,
  /*
   * Si todavía le toca a ella.
   *
   * Es lo que decide si la pantalla le da las gracias o le pide que se
   * presente, y no se puede adivinar por los campos: una candidatura dada
   * de alta a mano por IWL puede tener sector y descripción —escritos por
   * IWL— y aun así ella no haber mandado nada.
   *
   * Lo que lo distingue es quién la creó. `created_by` va relleno cuando la
   * da de alta alguien de IWL, y vacío cuando entra por el formulario
   * público, donde lo escribió ella misma.
   */
  le_toca_a_ella boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.nombre,
    app.momento_candidata(c.estado),
    c.created_at::date,
    co.name,
    c.estado not in ('firmada', 'descartada'),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('titulo', e.titulo, 'url', e.url)
          order by e.created_at
        )
        from candidatura_enlaces e
        where e.candidatura_id = c.id
      ),
      '[]'::jsonb
    ),
    c.sector,
    c.one_liner,
    c.website,
    c.pais,
    c.contacto_cargo,
    c.contacto_telefono,
    c.estado_declarado,
    c.equipo_personas,
    c.liderazgo_femenino_pct,
    (
      -- La dio de alta IWL y ella todavía no ha aportado nada
      (
        c.created_by is not null
        and not exists (
          select 1 from candidatura_enlaces e where e.candidatura_id = c.id
        )
      )
      -- O falta lo básico, venga de donde venga
      or c.one_liner is null
      or c.estado_declarado is null
    )
  from candidaturas c
  join cohorts co on co.id = c.cohort_id
  where c.token = p_token
    and c.token_anulado_at is null
$$;

revoke all on function app.ver_candidatura from public;
grant execute on function app.ver_candidatura to anon, authenticated;

create function public.ver_candidatura(p_token text)
returns table (
  id uuid, nombre text, momento text, presentada_on date,
  convocatoria text, puede_subir boolean, enlaces jsonb,
  sector text, one_liner text, website text, pais text,
  contacto_cargo text, contacto_telefono text,
  estado_declarado estado_entrada, equipo_personas int,
  liderazgo_femenino_pct numeric, le_toca_a_ella boolean
)
language sql stable security definer set search_path = public
as $$ select * from app.ver_candidatura(p_token) $$;

revoke all on function public.ver_candidatura from public;
grant execute on function public.ver_candidatura to anon, authenticated;

create or replace function public.completar_candidatura(
  p_token text,
  p_sector text default null,
  p_one_liner text default null,
  p_website text default null,
  p_pais text default null,
  p_contacto_cargo text default null,
  p_contacto_telefono text default null,
  p_estado_declarado estado_entrada default null,
  p_equipo_personas int default null,
  p_liderazgo_femenino_pct numeric default null
)
returns void language sql security definer set search_path = public
as $$
  select app.completar_candidatura(
    p_token, p_sector, p_one_liner, p_website, p_pais,
    p_contacto_cargo, p_contacto_telefono, p_estado_declarado,
    p_equipo_personas, p_liderazgo_femenino_pct
  )
$$;

revoke all on function public.completar_candidatura from public;
grant execute on function public.completar_candidatura to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Su enlace, al terminar de presentarse
--
-- Quien rellena el formulario público se quedaba sin forma de volver: la
-- pantalla le decía «te escribimos al correo» y no hay envío de correo
-- montado. Su candidatura desaparecía de su vista al cerrar la pestaña.
--
-- Devuelve el testigo de **una sola** candidatura, por su identificador, y
-- solo mientras esté recién presentada. No es una consulta: no se puede
-- recorrer ni pedir el de otra, porque el identificador que hace falta solo
-- lo tiene quien la acaba de crear.
-- -----------------------------------------------------------------------------

create or replace function app.testigo_de_candidatura(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.token
  from candidaturas c
  where c.id = p_id
    and c.estado = 'presentada'
    and c.token_anulado_at is null
$$;

revoke all on function app.testigo_de_candidatura from public;
grant execute on function app.testigo_de_candidatura to anon, authenticated;

create or replace function public.testigo_de_candidatura(p_id uuid)
returns text language sql stable security definer set search_path = public
as $$ select app.testigo_de_candidatura(p_id) $$;

revoke all on function public.testigo_de_candidatura from public;
grant execute on function public.testigo_de_candidatura to anon, authenticated;
