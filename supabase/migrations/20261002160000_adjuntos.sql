-- =============================================================================
-- Adjuntar lo que ya está escrito: el business plan y el CV
--
-- Rodrigo lo pidió así: «poder cargar un archivo ya hecho de business plan».
-- Se valoró que el sistema extrajera la información y la repartiera por las
-- secciones, y se decidió que no: eso necesita una IA leyendo documentos, con
-- su dependencia y su coste, y de momento no compensa. El archivo se adjunta
-- y las secciones se siguen escribiendo a mano.
--
-- Dos sitios distintos porque son dos cosas distintas:
--
--   · El business plan es de una compañía, así que vive en `documents`, que
--     ya tiene versiones, caducidad y registro de accesos. Solo le falta
--     poder decir «este documento es EL business plan».
--
--   · El CV es de una persona, y `documents` cuelga de una compañía. Va a su
--     propio sitio, con la misma forma que el logo: la ruta en el perfil y
--     el fichero en un bucket privado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Un documento puede ser «el» business plan
-- -----------------------------------------------------------------------------

alter table documents add column if not exists kind text;

comment on column documents.kind is
  'Qué es este documento, cuando es algo concreto que la plataforma enseña '
  'en su sitio: «business_plan». Vacío para el resto del data room.';

-- Uno por compañía: «el business plan» en singular. Subir otro reemplaza
create unique index if not exists documents_kind_unico
  on documents (company_id, kind)
  where kind is not null;

-- -----------------------------------------------------------------------------
-- El CV de una persona
-- -----------------------------------------------------------------------------

alter table profiles add column if not exists cv_path text;

comment on column profiles.cv_path is
  'Ruta del CV dentro del bucket `personas`. La dirección se firma al leer.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personas',
  'personas',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

/*
 * La primera carpeta de la ruta es el id del perfil: `<profile_id>/<fichero>`.
 *
 * Lo ve IWL y lo ve la propia persona. No lo ven las fundadoras de otras
 * compañías, aunque compartan proyecto con quien sea: un CV es un documento
 * personal, no un dato del programa.
 */
create policy personas_select on storage.objects
  for select to authenticated using (
    bucket_id = 'personas'
    and (
      app.is_iwl()
      or (storage.foldername(name))[1]::uuid = auth.uid()
    )
  );

create policy personas_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'personas'
    and (app.is_iwl() or (storage.foldername(name))[1]::uuid = auth.uid())
  );

create policy personas_update on storage.objects
  for update to authenticated using (
    bucket_id = 'personas'
    and (app.is_iwl() or (storage.foldername(name))[1]::uuid = auth.uid())
  );

create policy personas_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'personas' and app.is_iwl()
  );
