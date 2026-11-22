-- =============================================================================
-- El NDA al principio, la candidatura nueva y su filtro (REVISION, 22 nov ·
-- bloques 2 y 3)
--
-- · Antes de contar nada, ella da sus datos y acepta el NDA con una casilla.
--   Nace la candidatura en borrador, con la aceptación registrada: quién,
--   cuándo, desde dónde, qué versión y el hash del texto aceptado. Sin
--   contrafirma de IWL y sin esperar a nadie.
-- · Después presenta el proyecto desde su enlace privado: sector, estadio,
--   socios con su parte del capital y si son mujeres, la prueba del estadio
--   (salvo en idea) y, en idea, quién de IWL la recomienda.
-- · Al enviarla, la base aplica el filtro: pasa, no pasa (con su motivo),
--   revisión manual o en espera de que confirme quien la recomienda.
-- · Desaparece el NDA después de la preselección: preseleccionar ya crea la
--   compañía en entrada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lo nuevo de la candidatura
-- -----------------------------------------------------------------------------

alter table candidaturas
  add column if not exists socios jsonb not null default '[]'::jsonb,
  add column if not exists sector_otro text,
  add column if not exists prueba_documento_id uuid references candidatura_documentos (id) on delete set null,
  add column if not exists recomendada_por uuid references profiles (id) on delete set null,
  add column if not exists recomendacion text check (recomendacion in ('pendiente', 'confirmada', 'rechazada')),
  add column if not exists recomendacion_at timestamptz,
  add column if not exists filtro text check (filtro in ('pasa', 'no_pasa', 'revision_manual', 'espera_recomendacion')),
  add column if not exists filtro_motivo text,
  add column if not exists filtro_at timestamptz,
  add column if not exists filtro_decidido_por uuid references profiles (id) on delete set null,
  add column if not exists filtro_decision_motivo text,
  add column if not exists enviada_at timestamptz;

comment on column candidaturas.socios is
  'Los socios con su parte del capital: [{nombre, pct, mujer}]. La suma es 100. De aquí sale si está liderada por mujeres.';
comment on column candidaturas.filtro is
  'El filtro automático al enviarla: pasa, no_pasa, revision_manual o espera_recomendacion. Nulo en las de antes del 22 nov.';

alter table nda_firmas
  add column if not exists modo text not null default 'firma' check (modo in ('firma', 'casilla'));
comment on column nda_firmas.modo is
  'Firma: el NDA de antes, firmado y contrafirmado. Casilla: aceptado por ella al empezar, sin contrafirma (REVISION, 22 nov).';

-- Un porcentaje como se lee: «50», «33,33». Sin depender de la configuración regional
create or replace function app.cifra_pct(v numeric)
returns text language sql immutable as $$
  select trim(trailing ',' from trim(trailing '0' from replace(round(coalesce(v, 0), 2)::text, '.', ',')))
$$;

-- Las que entran en el filtro: el sector de la tesis o «Otro», que va a mano
create or replace function app.sectores_tesis()
returns text[] language sql immutable as $$
  select array['HealthTech', 'AgroTech', 'RetailTech', 'EdTech']
$$;

-- -----------------------------------------------------------------------------
-- El filtro, en un solo sitio
--
-- Puro: recibe lo que se presentó y devuelve el resultado y su motivo, en
-- la voz de IWL, que es lo que le llega a ella si no pasa. Las reglas, en
-- este orden:
--   1. Más del 50 % del capital en manos de mujeres; si no, no pasa.
--   2. Sector de la tesis; «Otro», a revisión manual.
--   3. Estadio con prueba; en idea, la recomendación de alguien de IWL,
--      que la deja en espera hasta que la confirme.
-- -----------------------------------------------------------------------------

create or replace function app.filtro_candidatura(
  p_sector text,
  p_estadio estado_entrada,
  p_socios jsonb,
  p_prueba uuid,
  p_recomendada uuid,
  out filtro text,
  out motivo text
)
language plpgsql immutable as $$
declare
  v_mujeres numeric := coalesce((
    select sum((s ->> 'pct')::numeric) from jsonb_array_elements(coalesce(p_socios, '[]'::jsonb)) s
    where coalesce((s ->> 'mujer')::boolean, false)
  ), 0);
begin
  if v_mujeres <= 50 then
    filtro := 'no_pasa';
    motivo := format(
      'El programa es para proyectos liderados por mujeres: más del 50 %% del capital en manos de mujeres. En vuestra candidatura es el %s %%.',
      app.cifra_pct(v_mujeres)
    );
    return;
  end if;
  if p_sector is null or not (p_sector = any (app.sectores_tesis())) then
    filtro := 'revision_manual';
    motivo := 'El sector no es uno de los de la convocatoria: lo revisa el equipo de IWL.';
    return;
  end if;
  if p_estadio = 'idea' then
    if p_recomendada is null then
      filtro := 'no_pasa';
      motivo := 'Un proyecto en idea entra con la recomendación de alguien del equipo de IWL, y la candidatura no la tiene.';
    else
      filtro := 'espera_recomendacion';
      motivo := 'Falta que la persona de IWL que la recomienda lo confirme.';
    end if;
    return;
  end if;
  if p_prueba is null then
    filtro := 'no_pasa';
    motivo := 'Falta la prueba del estadio: un documento que muestre el MVP, el piloto o la facturación.';
    return;
  end if;
  filtro := 'pasa';
  motivo := null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Aceptar el NDA: nace la candidatura, en borrador
--
-- Solo con la clave de servicio, como firmar: la IP y el navegador los
-- conoce el servidor, y si se pudiera llamar desde el navegador cada cual
-- se escribiría los suyos. El texto lo completa el servidor con el mismo
-- código que la vista previa que ella acaba de leer; aquí se comprueba que
-- la plantilla es la vigente y que no le queda ningún hueco, y se calcula
-- el hash sobre lo que llega.
-- -----------------------------------------------------------------------------

create or replace function app.aceptar_nda(
  p_startup text,
  p_nombre text,
  p_apellidos text,
  p_correo text,
  p_plantilla uuid,
  p_texto text,
  p_datos jsonb,
  p_ip text,
  p_ua text,
  out candidatura_id uuid,
  out token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohorte uuid;
  v_vigente uuid;
  v_hueco text;
  v_sociedad boolean := coalesce((p_datos ->> 'es_sociedad')::boolean, false);
begin
  select id into v_cohorte
  from cohorts
  where convocatoria_abierta
    and (convocatoria_cierra is null or convocatoria_cierra >= current_date)
  order by start_date desc
  limit 1;
  if v_cohorte is null then
    raise exception 'No hay ninguna convocatoria abierta ahora mismo.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_startup), '') = '' then
    raise exception 'Hace falta el nombre de la startup.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_apellidos), '') = '' then
    raise exception 'Hacen falta tu nombre y tus apellidos, como en tu documento.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_correo), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no parece un correo.' using errcode = 'P0001';
  end if;

  select np.id into v_vigente from nda_plantillas np where np.candidatura_id is null order by np.version desc limit 1;
  if v_vigente is null or app.problema_plantilla_nda((select texto from nda_plantillas where id = v_vigente)) is not null then
    raise exception 'El NDA todavía no está preparado. Vuelve en unos días.' using errcode = 'P0001';
  end if;
  if p_plantilla is distinct from v_vigente then
    raise exception 'El NDA ha cambiado mientras lo leías. Vuelve a cargar la página y lee la versión nueva.'
      using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_texto, ''))) = 0 then
    raise exception 'Falta el texto del NDA.' using errcode = 'P0001';
  end if;
  v_hueco := app.huecos_nda(p_texto);
  if v_hueco is not null then
    raise exception 'Al NDA le falta un dato: %. Rellénalo antes de aceptarlo.', v_hueco using errcode = 'P0001';
  end if;

  insert into candidaturas (
    cohort_id, nombre, contacto_nombre, contacto_apellidos, contacto_email, estado,
    situacion_societaria, denominacion_social, cif
  ) values (
    v_cohorte, trim(p_startup), trim(p_nombre), trim(p_apellidos), lower(trim(p_correo)), 'borrador',
    case when v_sociedad then 'constituida'::situacion_societaria end,
    case when v_sociedad then nullif(trim(coalesce(p_datos ->> 'denominacion', '')), '') end,
    case when v_sociedad then nullif(upper(trim(coalesce(p_datos ->> 'nif', ''))), '') end
  )
  returning id, candidaturas.token into candidatura_id, token;

  insert into nda_firmas (
    candidatura_id, plantilla_id, texto_version, texto_hash, texto_firmado, datos, modo,
    firmante_nombre, firmante_correo, firmado_at, firmado_ip, firmado_ua
  )
  select aceptar_nda.candidatura_id, p_plantilla, np.version::text,
         encode(sha256(convert_to(p_texto, 'UTF8')), 'hex'), p_texto, p_datos, 'casilla',
         trim(p_nombre) || ' ' || trim(p_apellidos), lower(trim(p_correo)), now(), p_ip, p_ua
  from nda_plantillas np where np.id = p_plantilla;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle)
  values (aceptar_nda.candidatura_id, 'nota', 'NDA aceptado',
          'Lo aceptó con la casilla antes de presentar el proyecto, como ' ||
          case when v_sociedad then 'sociedad.' else 'persona física.' end);
end;
$$;

revoke all on function app.aceptar_nda(text, text, text, text, uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function app.aceptar_nda(text, text, text, text, uuid, text, jsonb, text, text) to service_role;

-- El aviso de una candidatura nueva, a IWL: cuando llega y ha pasado el filtro, o va a revisión manual
create or replace function app.avisar_candidatura_nueva(p_candidatura uuid)
returns void language sql security definer set search_path = public as $$
  insert into avisos (tipo, candidatura_id, para_iwl)
  select 'candidatura_nueva', p_candidatura, true
  where not exists (
    select 1 from avisos where candidatura_id = p_candidatura and tipo = 'candidatura_nueva' and cerrado_at is null
  )
$$;

-- -----------------------------------------------------------------------------
-- Enviar la candidatura desde su enlace, con el filtro
--
-- También solo con la clave de servicio: la prueba del estadio la registra
-- el servidor antes, desde lo subido, y aquí se comprueba que es de esta
-- candidatura. Lo que decide si vale es el testigo, como en todo lo de su
-- enlace.
-- -----------------------------------------------------------------------------

create or replace function app.enviar_candidatura(
  p_token text,
  p_sector text,
  p_sector_otro text,
  p_one_liner text,
  p_website text,
  p_estadio estado_entrada,
  p_socios jsonb,
  p_prueba uuid,
  p_recomendada uuid,
  out filtro text,
  out motivo text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_socio jsonb;
  v_suma numeric := 0;
  v_mujeres numeric := 0;
begin
  select * into c from candidaturas where token = p_token and token_anulado_at is null for update;
  if not found then
    raise exception 'Ese enlace ya no vale. Escríbenos y te mandamos uno nuevo.' using errcode = '42501';
  end if;
  if c.estado <> 'borrador' then
    raise exception 'Esta candidatura ya está enviada.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from nda_firmas f where f.candidatura_id = c.id) then
    raise exception 'Antes de contarnos nada, acepta el NDA.' using errcode = 'P0001';
  end if;

  if p_estadio is null then
    raise exception 'Dinos en qué estadio estáis.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_sector), '') = '' then
    raise exception 'Dinos el sector.' using errcode = 'P0001';
  end if;
  if p_sector = 'Otro' and coalesce(trim(p_sector_otro), '') = '' then
    raise exception 'Dinos cuál es el sector.' using errcode = 'P0001';
  end if;

  -- Los socios: al menos uno, cada uno con nombre y su parte, y entre todos el 100 %
  if jsonb_typeof(p_socios) is distinct from 'array' or jsonb_array_length(p_socios) = 0 then
    raise exception 'Dinos quién tiene el capital: al menos un socio.' using errcode = 'P0001';
  end if;
  for v_socio in select * from jsonb_array_elements(p_socios) loop
    if coalesce(trim(v_socio ->> 'nombre'), '') = '' then
      raise exception 'Cada socio con su nombre.' using errcode = 'P0001';
    end if;
    if (v_socio ->> 'pct') is null or (v_socio ->> 'pct')::numeric <= 0 or (v_socio ->> 'pct')::numeric > 100 then
      raise exception 'La parte de cada socio, entre 0 y 100.' using errcode = 'P0001';
    end if;
    v_suma := v_suma + (v_socio ->> 'pct')::numeric;
    if coalesce((v_socio ->> 'mujer')::boolean, false) then
      v_mujeres := v_mujeres + (v_socio ->> 'pct')::numeric;
    end if;
  end loop;
  if abs(v_suma - 100) > 0.01 then
    raise exception 'Las partes de los socios tienen que sumar el 100 %%. Ahora suman el %.', app.cifra_pct(v_suma) || ' %'
      using errcode = 'P0001';
  end if;

  if p_estadio <> 'idea' then
    if p_prueba is null or not exists (
      select 1 from candidatura_documentos d where d.id = p_prueba and d.candidatura_id = c.id
    ) then
      raise exception 'Adjunta la prueba del estadio: un documento que muestre el MVP, el piloto o la facturación.'
        using errcode = 'P0001';
    end if;
  end if;
  if p_recomendada is not null and not exists (
    select 1 from profiles where id = p_recomendada and is_active and role in ('admin_iwl', 'equipo_iwl')
  ) then
    raise exception 'Esa persona no es del equipo de IWL.' using errcode = 'P0001';
  end if;
  if p_estadio = 'idea' and p_recomendada is null then
    raise exception 'En idea, dinos quién del equipo de IWL os recomienda.' using errcode = 'P0001';
  end if;

  select f.filtro, f.motivo into filtro, motivo
  from app.filtro_candidatura(p_sector, p_estadio, p_socios, p_prueba, case when p_estadio = 'idea' then p_recomendada end) f;

  update candidaturas set
    sector = trim(p_sector),
    sector_otro = case when p_sector = 'Otro' then trim(p_sector_otro) end,
    one_liner = nullif(trim(coalesce(p_one_liner, '')), ''),
    website = nullif(trim(coalesce(p_website, '')), ''),
    estado_declarado = p_estadio,
    socios = p_socios,
    liderazgo_femenino_pct = round(v_mujeres, 2),
    prueba_documento_id = case when p_estadio <> 'idea' then p_prueba end,
    recomendada_por = case when p_estadio = 'idea' then p_recomendada end,
    recomendacion = case when p_estadio = 'idea' then 'pendiente' end,
    filtro = enviar_candidatura.filtro,
    filtro_motivo = enviar_candidatura.motivo,
    filtro_at = now(),
    enviada_at = now(),
    estado = 'presentada'
  where id = c.id;

  if filtro in ('pasa', 'revision_manual') then
    perform app.avisar_candidatura_nueva(c.id);
  elsif filtro = 'espera_recomendacion' then
    insert into avisos (tipo, candidatura_id, para) values ('recomendacion_pendiente', c.id, p_recomendada);
  end if;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle)
  values (c.id, 'nota', 'Filtro: ' || case filtro
            when 'pasa' then 'pasa'
            when 'no_pasa' then 'no pasa'
            when 'revision_manual' then 'revisión manual'
            else 'en espera de la recomendación' end,
          motivo);
end;
$$;

revoke all on function app.enviar_candidatura(text, text, text, text, text, estado_entrada, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function app.enviar_candidatura(text, text, text, text, text, estado_entrada, jsonb, uuid, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Confirmar o rechazar la recomendación: solo quien recomienda
-- -----------------------------------------------------------------------------

create or replace function public.responder_recomendacion(p_candidatura uuid, p_confirma boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.recomendada_por is distinct from auth.uid() then
    raise exception 'Esta recomendación no es tuya.' using errcode = '42501';
  end if;
  if c.filtro is distinct from 'espera_recomendacion' then
    raise exception 'Esta recomendación ya está respondida.' using errcode = 'P0001';
  end if;

  update candidaturas set
    recomendacion = case when p_confirma then 'confirmada' else 'rechazada' end,
    recomendacion_at = now(),
    filtro = case when p_confirma then 'pasa' else 'no_pasa' end,
    filtro_motivo = case when p_confirma then null
      else 'La persona del equipo de IWL que indicasteis no ha confirmado la recomendación, y un proyecto en idea entra con ella.' end,
    filtro_at = now()
  where id = p_candidatura;

  update avisos set cerrado_at = now(), cerrado_por = auth.uid()
  where candidatura_id = p_candidatura and tipo = 'recomendacion_pendiente' and cerrado_at is null;

  if p_confirma then
    perform app.avisar_candidatura_nueva(p_candidatura);
  end if;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, created_by)
  values (p_candidatura, 'nota',
          case when p_confirma then 'Recomendación confirmada: pasa el filtro' else 'Recomendación rechazada: no pasa el filtro' end,
          auth.uid());

  return case when p_confirma then 'pasa' else 'no_pasa' end;
end;
$$;

revoke all on function public.responder_recomendacion(uuid, boolean) from public, anon;
grant execute on function public.responder_recomendacion(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Decidir a mano: la revisión manual la resuelve IWL; sacar una del «no
-- pasa», solo dirección. Las dos con motivo, que queda en la candidatura
-- y en su historia.
-- -----------------------------------------------------------------------------

create or replace function public.decidir_filtro(p_candidatura uuid, p_pasa boolean, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
begin
  if not app.is_iwl() then
    raise exception 'El filtro lo decide el equipo de IWL.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escribe el motivo: queda registrado en la candidatura.' using errcode = 'P0001';
  end if;
  select * into c from candidaturas where id = p_candidatura for update;
  if not found then
    raise exception 'Esa candidatura no existe.' using errcode = 'P0001';
  end if;
  if c.filtro = 'no_pasa' then
    if not p_pasa then
      raise exception 'Ya no pasa.' using errcode = 'P0001';
    end if;
    if not app.is_admin() then
      raise exception 'Sacar una candidatura del «no pasa» es de dirección.' using errcode = '42501';
    end if;
  elsif c.filtro is distinct from 'revision_manual' then
    raise exception 'Esta candidatura no está pendiente de revisión manual.' using errcode = 'P0001';
  end if;

  update candidaturas set
    filtro = case when p_pasa then 'pasa' else 'no_pasa' end,
    filtro_motivo = case when p_pasa then filtro_motivo else trim(p_motivo) end,
    filtro_decidido_por = auth.uid(),
    filtro_decision_motivo = trim(p_motivo),
    filtro_at = now()
  where id = p_candidatura;

  if p_pasa then
    perform app.avisar_candidatura_nueva(p_candidatura);
  else
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where candidatura_id = p_candidatura and tipo = 'candidatura_nueva' and cerrado_at is null;
  end if;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle, created_by)
  values (p_candidatura, 'nota',
          case when p_pasa then (case when c.filtro = 'no_pasa' then 'Sacada del «no pasa»' else 'Revisión manual: pasa' end)
               else 'Revisión manual: no pasa' end,
          trim(p_motivo), auth.uid());

  insert into activity_log (actor_id, entity, entity_id, action, detail)
  values (auth.uid(), 'candidaturas', p_candidatura, 'decision_filtro',
          jsonb_build_object('de', c.filtro, 'pasa', p_pasa, 'motivo', trim(p_motivo)));
end;
$$;

revoke all on function public.decidir_filtro(uuid, boolean, text) from public, anon;
grant execute on function public.decidir_filtro(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Integridad: lo que no pasó el filtro no avanza; el borrador solo se envía
-- -----------------------------------------------------------------------------

create or replace function app.guard_filtro_candidatura()
returns trigger
language plpgsql
as $$
begin
  if new.estado is not distinct from old.estado then return new; end if;
  if old.estado = 'borrador' and new.estado not in ('presentada', 'descartada') then
    raise exception 'Una candidatura en borrador solo se envía o se descarta.' using errcode = 'P0001';
  end if;
  if new.estado not in ('borrador', 'presentada', 'descartada')
     and coalesce(new.filtro, 'pasa') <> 'pasa' then
    raise exception 'Esta candidatura no ha pasado el filtro: %', coalesce(new.filtro_motivo, 'está pendiente de revisión.')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists candidaturas_guard_filtro on candidaturas;
create trigger candidaturas_guard_filtro
  before update of estado on candidaturas
  for each row execute function app.guard_filtro_candidatura();

-- -----------------------------------------------------------------------------
-- Las personas de IWL que pueden recomendar, para el formulario público:
-- solo su id y su nombre
-- -----------------------------------------------------------------------------

create or replace function public.personas_que_recomiendan()
returns table (id uuid, nombre text)
language sql stable security definer set search_path = public as $$
  select p.id, app.nombre_completo(p.full_name, p.last_name)
  from profiles p
  where p.is_active and p.role in ('admin_iwl', 'equipo_iwl') and coalesce(trim(p.full_name), '') <> ''
  order by 2
$$;

revoke all on function public.personas_que_recomiendan() from public;
grant execute on function public.personas_que_recomiendan() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- El aviso de la recomendación
-- -----------------------------------------------------------------------------

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check check (tipo = any (array[
  'primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha', 'anexo_comentario', 'cambio_estadio',
  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar', 'hito_entregado',
  'hito_sin_revisar', 'candidatura_nueva', 'acta_por_firmar', 'anexo_aceptado', 'documento_entregado',
  'correos_sin_enviar', 'sesion_por_confirmar', 'sesion_no_cuadra', 'sesion_en_direccion',
  'recomendacion_pendiente'
]));

-- -----------------------------------------------------------------------------
-- El NDA aceptado con la casilla está hecho: no espera a IWL
-- -----------------------------------------------------------------------------

create or replace function app.estado_nda(p_candidatura uuid)
 returns text
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  c candidaturas%rowtype;
  f nda_firmas%rowtype;
  v_plantilla uuid;
begin
  select * into c from candidaturas where id = p_candidatura;
  if not found then return null; end if;

  -- Solo IWL y la propia candidata
  if auth.uid() is not null and not app.is_iwl() and c.profile_id is distinct from auth.uid() then
    return null;
  end if;

  select * into f from nda_firmas where candidatura_id = p_candidatura;
  if found then
    -- Aceptado con la casilla: sin contrafirma (REVISION, 22 nov)
    if f.modo = 'casilla' then return 'firmado'; end if;
    return case when f.contrafirmado_at is not null then 'firmado' else 'esperando_iwl' end;
  end if;

  if c.estado in ('firmada', 'descartada') or c.nda_firmado_on is not null then
    return 'no_aplica';
  end if;

  v_plantilla := app.plantilla_nda_de(p_candidatura);
  if v_plantilla is null then
    return 'sin_plantilla';
  end if;
  if app.problema_plantilla_nda((select texto from nda_plantillas where id = v_plantilla)) is not null then
    return 'plantilla_con_huecos';
  end if;
  return 'por_firmar';
end;
$function$;

-- -----------------------------------------------------------------------------
-- Preseleccionar ya crea la compañía: sin NDA después
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.firmar_acta(p_acta uuid, p_profile uuid, p_ip text, p_ua text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a comite_actas%rowtype;
begin
  update comite_firmas
  set firmado_at = now(), firmado_ip = p_ip, firmado_ua = p_ua
  where acta_id = p_acta and profile_id = p_profile and firmado_at is null;
  if not found then
    raise exception 'No estás en este comité, o ya has firmado el acta.' using errcode = '42501';
  end if;

  -- ¿Falta alguien?
  if exists (select 1 from comite_firmas where acta_id = p_acta and firmado_at is null) then
    return false;
  end if;

  update comite_actas set cerrada_at = now() where id = p_acta returning * into a;

  -- La decisión, aplicada
  if a.decision = 'preseleccionada' then
    update candidaturas
    set estado = 'preseleccionada'
    where id = a.candidatura_id
      and estado in ('presentada', 'en_revision', 'reunion', 'comite');
    -- El estadio que confirma o cambia el comité
    update candidaturas set estado_verificado = coalesce(a.estadio, estado_verificado) where id = a.candidatura_id;
    /*
     * Con el NDA aceptado al principio, la preselección ya abre la entrada:
     * nace la compañía, sin NDA después (REVISION, 22 nov). Una candidatura
     * dada de alta a mano, sin NDA, se queda en preseleccionada hasta que
     * dirección registre el NDA firmado fuera, que es lo que la crea.
     */
    if exists (select 1 from nda_firmas where candidatura_id = a.candidatura_id) then
      perform app.crear_compania_en_entrada(a.candidatura_id, p_profile);
    end if;
  elsif a.decision = 'descartada' then
    update candidaturas
    set estado = 'descartada', descartada_desde = estado,
        descartada_at = now(), descartada_motivo = a.motivo
    where id = a.candidatura_id and estado not in ('firmada', 'descartada');
  else
    -- Aplazada: se queda en Comité, con su fecha de revisión
    update candidaturas set estado = 'comite'
    where id = a.candidatura_id and estado in ('presentada', 'en_revision', 'reunion');
  end if;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle, created_by)
  values (a.candidatura_id, 'comite', 'Acta de comité firmada · ' || a.decision, a.resumen, p_profile);

  return true;
end;
$function$;

-- -----------------------------------------------------------------------------
-- Las puertas de PostgREST, que solo expone `public`. Aceptar y enviar, solo
-- con la clave de servicio; ver en qué punto está su envío, con el testigo
-- -----------------------------------------------------------------------------

create or replace function public.aceptar_nda(
  p_startup text, p_nombre text, p_apellidos text, p_correo text,
  p_plantilla uuid, p_texto text, p_datos jsonb, p_ip text, p_ua text
)
returns table (candidatura_id uuid, token text)
language sql security invoker set search_path = public
as $$ select * from app.aceptar_nda(p_startup, p_nombre, p_apellidos, p_correo, p_plantilla, p_texto, p_datos, p_ip, p_ua) $$;

create or replace function public.enviar_candidatura(
  p_token text, p_sector text, p_sector_otro text, p_one_liner text, p_website text,
  p_estadio estado_entrada, p_socios jsonb, p_prueba uuid, p_recomendada uuid
)
returns table (filtro text, motivo text)
language sql security invoker set search_path = public
as $$ select * from app.enviar_candidatura(p_token, p_sector, p_sector_otro, p_one_liner, p_website, p_estadio, p_socios, p_prueba, p_recomendada) $$;

revoke all on function public.aceptar_nda(text, text, text, text, uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.enviar_candidatura(text, text, text, text, text, estado_entrada, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.aceptar_nda(text, text, text, text, uuid, text, jsonb, text, text) to service_role;
grant execute on function public.enviar_candidatura(text, text, text, text, text, estado_entrada, jsonb, uuid, uuid) to service_role;

create or replace function public.envio_de_candidatura(p_token text)
returns table (id uuid, nombre text, estado estado_candidatura, filtro text, filtro_motivo text, recomendacion text, contacto_nombre text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.nombre, c.estado, c.filtro, c.filtro_motivo, c.recomendacion, c.contacto_nombre
  from candidaturas c
  where c.token = p_token and c.token_anulado_at is null
$$;

revoke all on function public.envio_de_candidatura(text) from public;
grant execute on function public.envio_de_candidatura(text) to anon, authenticated;

-- Los dos correos nuevos: el NDA aceptado, con su PDF, y el motivo si no pasa el filtro
alter table correos drop constraint if exists correos_evento_check;
alter table correos add constraint correos_evento_check check (evento in (
  'enlace_candidatura', 'reunion_propuesta', 'reunion_confirmada', 'reunion_cambiada',
  'reunion_cancelada', 'reunion_contrapropuesta', 'nda_enviado', 'acceso_dado',
  'respuesta_comentario', 'acuerdo_propuesto', 'descarte', 'recordatorio', 'resumen_avisos',
  'sesion_registrada', 'sesion_de_vuelta', 'sesion_decidida', 'recuperar_contrasena',
  'nda_aceptado', 'filtro_no_pasa'
));

-- -----------------------------------------------------------------------------
-- Fuera la puerta vieja: presentarse sin NDA. Con la clave pública, que va
-- en el navegador, cualquiera podía seguir dándose de alta sin aceptarlo y
-- sin pasar por el filtro.
-- -----------------------------------------------------------------------------

drop function if exists public.presentar_candidatura(text, text, text, text, text, text, text, text, text, text, estado_entrada, integer, numeric, text, jsonb);
drop function if exists app.presentar_candidatura(text, text, text, text, text, text, text, text, text, text, estado_entrada, integer, numeric, text, jsonb);
