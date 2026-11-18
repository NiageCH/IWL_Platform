-- =============================================================================
-- Las subidas a medias sí se borran; se conserva lo descartado y lo archivado
--
-- (REVISION, 18 nov) La versión del 17 nov protegía todo lo que colgaba de
-- una candidatura o compañía existente, en cualquier estado, y con eso una
-- subida abandonada en una compañía activa no se limpiaba nunca. Ahora se
-- protege solo lo que de verdad hay que conservar: todo fichero cuya
-- carpeta —el primer tramo de la ruta— es el id de una **candidatura
-- descartada** o de una **compañía archivada**. Cuánto se guarda eso está
-- pendiente de protección de datos, y cuando haya plazo irá en un proceso
-- aparte, no aquí.
--
-- En las demás carpetas —una compañía activa, una candidatura en curso— un
-- fichero sin fila que lo apunte y con más de 24 horas es una subida
-- abandonada, y se borra.
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
    -- Lo de una candidatura descartada o una compañía archivada: no se toca
    and not exists (
      select 1 from candidaturas k
      where k.estado = 'descartada' and k.id::text = split_part(o.name, '/', 1)
    )
    and not exists (
      select 1 from companies c
      where c.archived_at is not null and c.id::text = split_part(o.name, '/', 1)
    )
    -- Por si un firmado deja un día de estar apuntado: antes que borrarlo, que ocupe sitio
    and o.name !~* '(nda|acta|anexo|acuerdo|firmad)'
  order by o.bucket_id, o.name
$$;

comment on function app.ficheros_sueltos(timestamptz) is
  'Ficheros subidos antes de p_antes que ninguna fila apunta y que no cuelgan de una candidatura descartada ni de una compañía archivada. Solo los lista: borra el cron por la API de Storage.';

revoke all on function app.ficheros_sueltos(timestamptz) from public, anon, authenticated;
