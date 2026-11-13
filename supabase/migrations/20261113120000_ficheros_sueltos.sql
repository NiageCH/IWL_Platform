-- =============================================================================
-- Los ficheros sueltos: subidos y nunca registrados
--
-- (REVISION, 13 nov) Desde que el navegador sube directo a Storage, una
-- subida que no llega a registrarse —se cierra la pestaña a mitad, se cae la
-- conexión— deja un fichero sin documento que lo apunte. No se ve en ninguna
-- pantalla; solo ocupa sitio. El cron diario los borra.
--
-- Aquí solo se **listan**: Storage no deja borrar con SQL
-- (`protect_objects_delete`), porque el fichero de verdad vive fuera de la
-- base y quedaría huérfano al revés. Borra el cron, por la API de Storage, y
-- deja constancia en el registro de actividad (`lib/limpieza.ts`).
--
-- Suelto quiere decir **todo** esto a la vez:
--   · está en un bucket donde se sube a mano: data room, expediente de
--     candidaturas, CV, fotos y logos;
--   · ninguna fila lo apunta (`document_versions`, `candidatura_documentos`,
--     `profiles.cv_path`, `profiles.photo_path`, `companies.logo_path`);
--   · tiene más de 24 horas, para no llevarse una subida que se está
--     registrando ahora mismo;
--   · no parece un documento firmado —NDA, acta, Anexo, Acuerdo— ni es de
--     una compañía archivada. Un firmado siempre está apuntado, así que esto
--     no debería filtrar nada; está por si un día deja de estarlo: antes que
--     borrar un firmado, que ocupe sitio.
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
    and o.name !~* '(nda|acta|anexo|acuerdo|firmad)'
    and not exists (
      select 1 from companies c
      where c.archived_at is not null
        and c.id::text = split_part(o.name, '/', 1)
    )
  order by o.bucket_id, o.name
$$;

comment on function app.ficheros_sueltos(timestamptz) is
  'Ficheros subidos antes de p_antes que ninguna fila apunta. Solo los lista: borra el cron por la API de Storage.';

-- Solo el cron, con la clave de servicio. Nadie con sesión.
create or replace function public.ficheros_sueltos(p_antes timestamptz)
returns table (bucket text, ruta text, bytes bigint, creado timestamptz)
language sql
stable
security definer
set search_path = public
as $$ select * from app.ficheros_sueltos(p_antes) $$;

revoke all on function app.ficheros_sueltos(timestamptz) from public, anon, authenticated;
revoke all on function public.ficheros_sueltos(timestamptz) from public, anon, authenticated;
grant execute on function public.ficheros_sueltos(timestamptz) to service_role;
