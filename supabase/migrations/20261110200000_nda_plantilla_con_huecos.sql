/*
 * «Sin plantilla» y «plantilla con huecos» son dos cosas.
 *
 * `estado_nda` devolvía `sin_plantilla` en los dos casos, y la ficha decía
 * «Todavía no hay texto del NDA» con una plantilla pegada: quien la había
 * pegado no sabía qué fallaba. Ahora, si hay plantilla pero no se puede
 * enviar —corchetes, marcadores desconocidos—, es `plantilla_con_huecos`.
 * Para ella no cambia nada: en los dos casos ve que está en preparación.
 *
 * Redefinición de `20261110170000_nda_personalizado.sql`.
 */
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
$$;
