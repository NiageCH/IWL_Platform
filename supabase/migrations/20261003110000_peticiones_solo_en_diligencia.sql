-- =============================================================================
-- Las peticiones de documentos, solo mientras el proceso está en ese punto
--
-- «Si por algún casual ese candidato baja a un paso anterior, sigue
-- apareciendo la lista de documentos a entregar.»
--
-- Las peticiones las crea un disparador al llegar al NDA, y ahí se quedan.
-- Si IWL devuelve la candidatura a comité —porque hay que volver a hablarlo,
-- o porque se movió por error— la candidata sigue viendo una lista de
-- deberes que ya no toca.
--
-- No se borran: lo que ya entregó no se tira a la basura por un paso atrás,
-- y si vuelve a diligencia tiene que estar todo donde estaba. Lo que se hace
-- es dejar de enseñarlas mientras el proceso no esté en ese punto.
-- =============================================================================

create or replace function app.mis_peticiones()
returns table (
  id uuid,
  area text,
  titulo text,
  detalle text,
  obligatoria boolean,
  entregados int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.area, p.titulo, p.detalle, p.obligatoria,
    (select count(*)::int from candidatura_documentos d where d.peticion_id = p.id)
  from candidatura_peticiones p
  join candidaturas c on c.id = p.candidatura_id
  where p.candidatura_id = app.mi_candidatura_id()
    -- Solo desde el NDA y hasta que se firma o se descarta
    and c.estado in ('nda', 'diligencia', 'acuerdo')
  order by p.orden
$$;
