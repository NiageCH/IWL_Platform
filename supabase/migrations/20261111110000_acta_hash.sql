/*
 * El hash del contenido firmado de un acta de comité.
 *
 * El PDF del acta pasa a la plantilla de documento de IWL, y su registro de
 * firmas lleva, como el del NDA, el hash de lo firmado: el SHA-256 de
 * `contenidoActa` (lib/comite.ts), que son los campos que el acta congela
 * desde la primera firma y quién forma el comité.
 *
 * Lo calcula la aplicación al cerrar el acta, porque el texto que se
 * resume lo define ella, y se guarda aquí. Las actas cerradas antes no lo
 * tienen: se calcula la primera vez que dirección regenera su PDF, sobre un
 * contenido que no ha podido cambiar.
 *
 * Una vez puesto no cambia, lo escriba quien lo escriba: es de integridad,
 * no de autorización, y no se exime sin sesión.
 */

alter table comite_actas add column if not exists contenido_hash text
  check (contenido_hash is null or contenido_hash ~ '^[0-9a-f]{64}$');

comment on column comite_actas.contenido_hash is
  'SHA-256 de lo firmado (contenidoActa en lib/comite.ts). Se escribe una vez: al cerrar el acta o, en las de antes, al regenerar su PDF.';

create or replace function app.guard_hash_acta()
returns trigger
language plpgsql
as $$
begin
  if old.contenido_hash is not null and new.contenido_hash is distinct from old.contenido_hash then
    raise exception 'El hash de un acta no cambia: es el de lo que se firmó.' using errcode = '42501';
  end if;
  if new.contenido_hash is not null and new.cerrada_at is null then
    raise exception 'El hash se guarda cuando el acta está firmada por todos.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists comite_actas_hash on comite_actas;
create trigger comite_actas_hash
  before update on comite_actas
  for each row execute function app.guard_hash_acta();
