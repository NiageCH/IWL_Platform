-- Los avisos calculados en el resumen diario, sin repetir (REVISION, 21 nov).
--
-- Un aviso calculado (el avance del mes, un hito que vence, decidir la
-- incorporación, proponer el Acuerdo) no se guarda: sale del estado. Para
-- que el resumen cuente solo los que aparecen ese día y los que pasan a
-- vencidos, aquí queda qué se le contó a quién y en qué estado. Lo que ya
-- tiene fila no vuelve a salir; si pasa de atención a vencido, sale otra vez.
--
-- Solo lo escribe y lo lee el cron, con la clave de servicio: RLS activado
-- y sin políticas, así que nadie con sesión lo ve.

create table if not exists public.digest_computed_notices (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  notice_key text not null,
  state text not null check (state in ('atencion', 'vencido')),
  sent_at timestamptz not null default now(),
  primary key (profile_id, notice_key, state)
);

alter table public.digest_computed_notices enable row level security;

comment on table public.digest_computed_notices is
  'Avisos calculados ya contados en el resumen diario, para no repetirlos. Solo la clave de servicio.';
