-- =============================================================================
-- Los límites de subida, también en los buckets
--
-- (REVISION, 13 nov) Los ficheros ya no pasan por el servidor de la
-- aplicación: el navegador sube directamente a Storage con una dirección
-- firmada. La pantalla y la acción comprueban el tamaño (`lib/subidas.ts`),
-- pero quien sube con una dirección firmada habla con Storage, no con ellas.
-- El tope que no se puede saltar es el del bucket, así que se alinea con lo
-- decidido: documentos y evidencias 25 MB, CV 10 MB.
--
-- Solo afecta a lo que se suba a partir de ahora: lo que ya está no se toca.
-- =============================================================================

update storage.buckets set file_size_limit = 26214400   -- 25 MB
 where id in ('data-room', 'candidaturas');

update storage.buckets set file_size_limit = 10485760   -- 10 MB
 where id = 'personas';
