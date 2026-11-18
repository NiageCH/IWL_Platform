-- =============================================================================
-- La limpieza no toca nada de una candidatura o compañía que exista
--
-- (REVISION, 17 nov) La limpieza diaria es para subidas a medias, no para
-- decidir qué se conserva. Cuánto se guarda lo de una candidatura descartada
-- está pendiente de protección de datos, y hasta que se decida no se borra
-- nada suyo. Cuando haya plazo de conservación irá en un proceso aparte, con
-- su constancia, no aquí.
--
-- Antes se protegía solo lo de las compañías archivadas. Ahora queda fuera
-- todo fichero cuya carpeta —el primer tramo de la ruta— es el id de una
-- candidatura o de una compañía que exista, **sea cual sea su estado**:
-- presentada, descartada, firmada, activa o archivada. Es la forma de las
-- rutas de `prepararSubida`: `<compañía>/…` en data room y logos,
-- `<candidatura>/…` en el expediente de candidaturas.
--
-- Consecuencia buscada: en esos tres buckets solo se limpia lo que cuelga de
-- algo que ya no existe. En CV y fotos la carpeta es la persona, así que ahí
-- sigue valiendo «sin fila que lo apunte».
-- =============================================================================

create or replace function app.ficheros_sueltos(p_antes timestamptz)
returns table (bucket text, ruta text, bytes bigint, creado timestamptz)
language sql
stable
security definer
set search_path = public, storage
as $$
  select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0), o.created_at
  from storage.objects o
  where o.bucket_id in ('data-room', 'candidaturas', 'personas', 'fotos', 'logos')
    and o.created_at < p_antes
    and not (
      o.bucket_id = 'data-room'
      and exists (select 1 from document_versions v where v.storage_path = o.name)
    )
    and not (
      o.bucket_id = 'candidaturas'
      and exists (select 1 from candidatura_documentos d where d.storage_path = o.name)
    )
    and not (
      o.bucket_id = 'personas'
      and exists (select 1 from profiles p where p.cv_path = o.name)
    )
    and not (
      o.bucket_id = 'fotos'
      and exists (select 1 from profiles p where p.photo_path = o.name)
    )
    and not (
      o.bucket_id = 'logos'
      and exists (select 1 from companies c where c.logo_path = o.name)
    )
    -- Bajo la carpeta de una candidatura o compañía que existe: no se toca
    and not exists (select 1 from candidaturas k where k.id::text = split_part(o.name, '/', 1))
    and not exists (select 1 from companies c where c.id::text = split_part(o.name, '/', 1))
    -- Por si un firmado deja un día de estar apuntado: antes que borrarlo, que ocupe sitio
    and o.name !~* '(nda|acta|anexo|acuerdo|firmad)'
  order by o.bucket_id, o.name
$$;

comment on function app.ficheros_sueltos(timestamptz) is
  'Ficheros subidos antes de p_antes que ninguna fila apunta y que no cuelgan de ninguna candidatura ni compañía existente. Solo los lista: borra el cron por la API de Storage.';

revoke all on function app.ficheros_sueltos(timestamptz) from public, anon, authenticated;
