/*
 * El correo de la plataforma: lo que se envía y cómo fue.
 *
 * Cada envío deja una fila, con el evento, a quién, cuándo, el id que da
 * el proveedor y en qué quedó. Si el proveedor falla o no hay ninguno
 * configurado, la acción que lo provocó no falla: la fila queda
 * «sin_enviar», y desde la ficha se reintenta.
 *
 * No se guarda el correo ya escrito, sino el evento y sus datos, y se
 * vuelve a escribir en cada intento. Así no queda en una tabla ningún
 * enlace de acceso: el del NDA, que deja fijar la contraseña de su cuenta,
 * se genera en el momento de enviar y no se guarda en ningún sitio.
 *
 * Escribe solo el servidor, con la clave de servicio: la acción que
 * provoca el envío ya ha comprobado quién es. Lo lee IWL.
 */

create table if not exists correos (
  id uuid primary key default gen_random_uuid(),
  evento text not null check (evento in (
    'enlace_candidatura', 'reunion_propuesta', 'reunion_confirmada', 'reunion_cambiada',
    'reunion_cancelada', 'nda_enviado', 'respuesta_comentario', 'acuerdo_propuesto',
    'descarte', 'recordatorio', 'resumen_avisos'
  )),
  destinatario text not null,
  destinatario_nombre text,
  profile_id uuid references profiles(id) on delete set null,
  candidatura_id uuid references candidaturas(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  asunto text not null,
  datos jsonb not null default '{}',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'sin_enviar')),
  proveedor text,
  proveedor_id text,
  error text,
  intentos int not null default 0,
  created_at timestamptz not null default now(),
  enviado_at timestamptz,
  created_by uuid references profiles(id) on delete set null
);

create index if not exists correos_candidatura on correos (candidatura_id, created_at desc);
create index if not exists correos_compania on correos (company_id, created_at desc);
create index if not exists correos_estado on correos (estado) where estado <> 'enviado';

comment on table correos is
  'Cada correo que envía la plataforma: evento, destinatario, estado e id del proveedor. Se escribe con la clave de servicio; lo lee IWL.';
comment on column correos.datos is
  'Lo que hace falta para volver a escribirlo al reintentar. Nunca un enlace de acceso a una cuenta: ese se genera al enviar.';

alter table correos enable row level security;

drop policy if exists correos_select_iwl on correos;
create policy correos_select_iwl on correos
  for select to authenticated using (app.is_iwl());

-- El resumen diario de avisos, para quien tenga alguno abierto
alter table profiles add column if not exists resumen_avisos text not null default 'diario'
  check (resumen_avisos in ('diario', 'nunca'));

comment on column profiles.resumen_avisos is
  'Si recibe por correo, una vez al día, los avisos que tiene abiertos. Solo cuenta para IWL.';
