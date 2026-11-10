-- =============================================================================
-- Ya no se piden documentos a la candidatura
--
-- Desde que la compañía nace al contrafirmar el NDA, el due diligence es el
-- checklist de la compañía. Generar además la lista de la candidatura al
-- enviar el NDA creaba duplicados que alguien acabaría rellenando en el
-- sitio equivocado. Decisión de Rodrigo, 10 nov 2026.
--
-- Las candidaturas de antes conservan sus peticiones y sus documentos, sin
-- tocarlos: siguen visibles para IWL y, firmadas, para su compañía.
-- =============================================================================

drop trigger if exists candidatura_pedir_dd on candidaturas;
drop function if exists app.pedir_dd_al_firmar_nda();
drop function if exists public.pedir_due_diligence(uuid);
drop function if exists app.pedir_due_diligence(uuid);

/*
 * Redefinición de `20261109120000_situacion_societaria.sql`, cambiando
 * solo el comentario: lo que decía —que la lista la crearía
 * `pedir_due_diligence` al llegar al NDA— ya no pasa. Sigue ajustando lo
 * societario de las candidaturas que ya tenían lista.
 */
create or replace function app.ajustar_peticiones_societarias(p_candidatura uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_situacion situacion_societaria;
begin
  select situacion_societaria into v_situacion from candidaturas where id = p_candidatura;
  if v_situacion is null then return; end if;

  -- Sin lista no hay nada que ajustar: las de ahora no la tienen
  if not exists (select 1 from candidatura_peticiones where candidatura_id = p_candidatura) then
    return;
  end if;

  delete from candidatura_peticiones p
  using dd_item_templates t
  where p.item_template_id = t.id and p.candidatura_id = p_candidatura
    and (case when v_situacion = 'constituida' then t.solo_sin_sociedad else t.requiere_sociedad end)
    and not exists (select 1 from candidatura_documentos d where d.peticion_id = p.id);

  insert into candidatura_peticiones (candidatura_id, item_template_id, area, titulo, detalle, obligatoria, orden)
  select p_candidatura, t.id, a.name, t.title, t.description, coalesce(t.is_required, false),
         a.order_index * 100 + t.order_index
  from dd_item_templates t
  join dd_areas a on a.id = t.area_id
  where coalesce(t.is_active, true)
    and (case when v_situacion = 'constituida' then t.requiere_sociedad else t.solo_sin_sociedad end)
    and not exists (
      select 1 from candidatura_peticiones p
      where p.candidatura_id = p_candidatura and p.item_template_id = t.id
    );
end;
$$;
