-- =============================================================================
-- Una candidatura firmada no se edita, y a quien ya pasó por una reunión no
-- se le pide que se presente
--
-- Dos cosas que salieron probando:
--
--   «Una firmada no se edita → Si deja cambiarlo.»
--   «La candidata ve momentos, no jerga → Aparece todo el formulario de
--    cuéntanos quiénes sois.» (estando en comité)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lo firmado, congelado
--
-- `guardarAcuerdo` no miraba el estado, así que se podía cambiar el equity
-- de una candidatura ya firmada. Y el equity firmado es el documento sobre
-- el que se sostiene todo lo demás.
--
-- Va en un disparador y no en la acción: es la regla «lo congelado no se
-- edita», y quien la impone es la base. Mismo patrón que `annexes`.
-- -----------------------------------------------------------------------------

create or replace function app.guard_candidatura_firmada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
   * Sin sesión no hay a quién restringir: la clave de servicio ya se salta
   * el RLS entero por diseño, y la semilla se declara una sesión cuando
   * quiere que esto se aplique.
   */
  if auth.uid() is null then
    return new;
  end if;

  if old.estado = 'firmada' and (
       new.equity_pct          is distinct from old.equity_pct
    or new.acuerdo_propuesto_on is distinct from old.acuerdo_propuesto_on
    or new.aportacion_propuesta is distinct from old.aportacion_propuesta
    or new.acuerdo_firmado_on  is distinct from old.acuerdo_firmado_on
    or new.nombre              is distinct from old.nombre
    or new.estado              is distinct from old.estado
  ) then
    raise exception
      'Esa candidatura ya está firmada. Lo acordado no se reescribe.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists candidaturas_guard_firmada on candidaturas;
create trigger candidaturas_guard_firmada
  before update on candidaturas
  for each row execute function app.guard_candidatura_firmada();

-- -----------------------------------------------------------------------------
-- «Cuéntanos quiénes sois» solo mientras tenga sentido preguntarlo
--
-- La pantalla pedía a la candidata que se presentara siempre que faltara la
-- descripción o el punto en que están, **en cualquier paso**. A una que ya
-- ha pasado por una reunión y está en comité eso le dice que no hemos
-- mirado su candidatura.
--
-- A partir de la reunión ya la conocemos: si falta un dato, se le pregunta
-- en persona, no con un formulario.
-- -----------------------------------------------------------------------------

drop function if exists public.ver_candidatura(text);
drop function if exists app.ver_candidatura(text);

create function app.ver_candidatura(p_token text)
returns table (
  id uuid, nombre text, momento text, presentada_on date,
  convocatoria text, puede_subir boolean, enlaces jsonb,
  sector text, one_liner text, website text, pais text,
  contacto_cargo text, contacto_telefono text,
  estado_declarado estado_entrada, equipo_personas int,
  liderazgo_femenino_pct numeric, le_toca_a_ella boolean,
  -- Para que la pantalla sepa si ya se le han pedido documentos
  en_diligencia boolean
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
      /*
       * Solo mientras la candidatura está recién llegada. Después de una
       * reunión, pedirle que se presente es decirle que no la hemos mirado.
       */
      c.estado in ('presentada', 'en_revision')
      and (
        (
          c.created_by is not null
          and not exists (
            select 1 from candidatura_enlaces e where e.candidatura_id = c.id
          )
        )
        or c.one_liner is null
        or c.estado_declarado is null
      )
    ),
    c.estado in ('nda', 'diligencia', 'acuerdo')
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
  liderazgo_femenino_pct numeric, le_toca_a_ella boolean,
  en_diligencia boolean
)
language sql stable security definer set search_path = public
as $$ select * from app.ver_candidatura(p_token) $$;

revoke all on function public.ver_candidatura from public;
grant execute on function public.ver_candidatura to anon, authenticated;
