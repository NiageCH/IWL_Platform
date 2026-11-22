-- =============================================================================
-- El filtro: «Otro» no se salta las demás reglas (REVISION, 22 nov)
--
-- Salía en revisión manual en cuanto el sector era «Otro», antes de mirar el
-- estadio: una idea sin recomendación, o un MVP sin prueba, quedaban en
-- revisión manual cuando tenían que no pasar. Ahora, en este orden:
--   1. Más del 50 % del capital en manos de mujeres.
--   2. El estadio con su prueba; en idea, la recomendación (espera a que
--      la confirme).
--   3. Solo si todo eso está bien, un sector de fuera va a revisión manual.
-- Y una idea de «Otro» que se confirma pasa a revisión manual, no a «pasa».
-- =============================================================================

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
  if p_estadio = 'idea' then
    if p_recomendada is null then
      filtro := 'no_pasa';
      motivo := 'Un proyecto en idea entra con la recomendación de alguien del equipo de IWL, y la candidatura no la tiene.';
    else
      -- Lo que venga después, sector incluido, se mira al confirmarla
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
  if p_sector is null or not (p_sector = any (app.sectores_tesis())) then
    filtro := 'revision_manual';
    motivo := 'El sector no es uno de los de la convocatoria: lo revisa el equipo de IWL.';
    return;
  end if;
  filtro := 'pasa';
  motivo := null;
end;
$$;

CREATE OR REPLACE FUNCTION public.responder_recomendacion(p_candidatura uuid, p_confirma boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c candidaturas%rowtype;
  -- Confirmada, la idea sigue con el resto del filtro: un sector de fuera va a revisión manual
  v_tras text;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.recomendada_por is distinct from auth.uid() then
    raise exception 'Esta recomendación no es tuya.' using errcode = '42501';
  end if;
  if c.filtro is distinct from 'espera_recomendacion' then
    raise exception 'Esta recomendación ya está respondida.' using errcode = 'P0001';
  end if;

  v_tras := case
    when not p_confirma then 'no_pasa'
    when c.sector = any (app.sectores_tesis()) then 'pasa'
    else 'revision_manual'
  end;

  update candidaturas set
    recomendacion = case when p_confirma then 'confirmada' else 'rechazada' end,
    recomendacion_at = now(),
    filtro = v_tras,
    filtro_motivo = case
      when v_tras = 'pasa' then null
      when v_tras = 'revision_manual' then 'El sector no es uno de los de la convocatoria: lo revisa el equipo de IWL.'
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
          case v_tras
            when 'pasa' then 'Recomendación confirmada: pasa el filtro'
            when 'revision_manual' then 'Recomendación confirmada: a revisión manual por el sector'
            else 'Recomendación rechazada: no pasa el filtro' end,
          auth.uid());

  return v_tras;
end;
$function$;
