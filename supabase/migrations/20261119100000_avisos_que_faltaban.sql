-- =============================================================================
-- Los avisos que faltaban en el inventario
--
-- (REVISION, 19 nov) Cinco acciones que esperaban a alguien sin avisarle.
-- Con las mismas reglas que los demás (`docs/AVISOS.md`): se abren con el
-- hecho, llevan a su sitio y se cierran solos cuando alguien hace lo que
-- piden o deja de tener sentido.
--
--   · Candidatura nueva: a dirección y al equipo, hasta que pasa a «En
--     revisión» o se descarta.
--   · Acta pendiente de tu firma: a cada miembro del comité que falta,
--     hasta que firma o el borrador se borra.
--   · Propuesta de Acuerdo aceptada: a dirección, hasta que se firma o
--     vuelve a borrador.
--   · Documento entregado: a quien lo pidió y, si nadie, al equipo, hasta
--     que se valida o se piden cambios.
--   · Correos sin enviar: uno solo a dirección aunque sean varios, hasta
--     que no queda ninguno.
--
-- «Decidir la incorporación» no está aquí: sale de `pasoEntrada`, en
-- `lib/entrada.ts`, y se calcula, como el tope de Construcción.
-- =============================================================================

alter table avisos
  add column if not exists acta_id uuid references comite_actas (id) on delete set null,
  add column if not exists dd_item_id uuid references dd_items (id) on delete cascade,
  add column if not exists annex_id uuid references annexes (id) on delete cascade,
  add column if not exists para_iwl boolean not null default false;

comment on column avisos.para_iwl is
  'Para todo IWL —dirección y equipo—, no para una persona. Lo atiende quien llegue primero.';
comment on column avisos.acta_id is
  'El acta que falta por firmar. Si el borrador se borra, el aviso queda cerrado y sin ella.';

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha',
                  'anexo_comentario', 'cambio_via',
                  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar',
                  'hito_entregado', 'hito_sin_revisar',
                  'candidatura_nueva', 'acta_por_firmar', 'anexo_aceptado',
                  'documento_entregado', 'correos_sin_enviar'));

-- Lo de todo IWL lo ve y lo cierra cualquiera de IWL
drop policy if exists avisos_direccion on avisos;
create policy avisos_direccion on avisos
  for select using (app.is_admin() or para = auth.uid() or (para_iwl and app.is_iwl()));

drop policy if exists avisos_cerrar on avisos;
create policy avisos_cerrar on avisos
  for update using (app.is_admin() or para = auth.uid() or (para_iwl and app.is_iwl()))
  with check (app.is_admin() or para = auth.uid() or (para_iwl and app.is_iwl()));

-- -----------------------------------------------------------------------------
-- Candidatura nueva
-- -----------------------------------------------------------------------------

create or replace function app.avisos_de_candidatura_nueva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado = 'presentada' then
      insert into avisos (tipo, candidatura_id, para_iwl, created_at)
      values ('candidatura_nueva', new.id, true, new.created_at);
    end if;
  elsif old.estado = 'presentada' and new.estado is distinct from 'presentada' then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where candidatura_id = new.id and tipo = 'candidatura_nueva' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists candidaturas_aviso_nueva on candidaturas;
create trigger candidaturas_aviso_nueva
  after insert or update of estado on candidaturas
  for each row execute function app.avisos_de_candidatura_nueva();

-- -----------------------------------------------------------------------------
-- Acta pendiente de tu firma
-- -----------------------------------------------------------------------------

create or replace function app.avisos_de_firma_de_acta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidatura uuid;
begin
  if tg_op = 'INSERT' then
    if new.firmado_at is null then
      select candidatura_id into v_candidatura from comite_actas where id = new.acta_id;
      insert into avisos (tipo, candidatura_id, acta_id, para)
      values ('acta_por_firmar', v_candidatura, new.acta_id, new.profile_id);
    end if;
    return new;
  end if;

  -- Firmó, o ya no está en el comité
  if tg_op = 'DELETE' or (new.firmado_at is not null and old.firmado_at is null) then
    update avisos
    set cerrado_at = now(),
        cerrado_por = case when tg_op = 'DELETE' then auth.uid() else old.profile_id end
    where acta_id = old.acta_id and para = old.profile_id
      and tipo = 'acta_por_firmar' and cerrado_at is null;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists comite_firmas_avisos on comite_firmas;
create trigger comite_firmas_avisos
  after insert or update of firmado_at or delete on comite_firmas
  for each row execute function app.avisos_de_firma_de_acta();

-- Un borrador que se borra: lo que pedía firmarlo se cierra antes de que se
-- vaya, y el aviso se queda sin acta (on delete set null)
create or replace function app.cerrar_avisos_de_acta_borrada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update avisos set cerrado_at = now(), cerrado_por = auth.uid()
  where acta_id = old.id and cerrado_at is null;
  return old;
end;
$$;

drop trigger if exists comite_actas_cerrar_avisos on comite_actas;
create trigger comite_actas_cerrar_avisos
  before delete on comite_actas
  for each row execute function app.cerrar_avisos_de_acta_borrada();

-- -----------------------------------------------------------------------------
-- Propuesta de Acuerdo aceptada
-- -----------------------------------------------------------------------------

create or replace function app.avisos_de_anexo_aceptado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'aceptado' and (tg_op = 'INSERT' or old.status is distinct from 'aceptado') then
    insert into avisos (tipo, company_id, annex_id, profile_id)
    values ('anexo_aceptado', new.company_id, new.id, new.aceptado_por);
  elsif tg_op = 'UPDATE' and old.status = 'aceptado' and new.status is distinct from 'aceptado' then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where annex_id = new.id and tipo = 'anexo_aceptado' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists annexes_aviso_aceptado on annexes;
create trigger annexes_aviso_aceptado
  after insert or update of status on annexes
  for each row execute function app.avisos_de_anexo_aceptado();

-- -----------------------------------------------------------------------------
-- Documento entregado
--
-- Un punto pasa a «entregado» o a «en revisión» cuando ella lo entrega o
-- sube su fichero. Si quien lo mueve es IWL, es que ya lo está mirando: no
-- hay a quién avisar. Lo recibe quien lo pidió —un punto que IWL añadió a
-- mano—; uno que viene de la plantilla no lo pidió nadie, y va al equipo.
-- -----------------------------------------------------------------------------

create or replace function app.avisos_de_documento_entregado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entra boolean := new.status in ('entregado', 'en_revision')
    and (tg_op = 'INSERT' or old.status not in ('entregado', 'en_revision'));
  v_sale boolean := tg_op = 'UPDATE' and old.status in ('entregado', 'en_revision')
    and new.status not in ('entregado', 'en_revision');
  v_pidio uuid;
begin
  if v_entra and not app.is_iwl() then
    if new.template_id is null then
      select p.id into v_pidio from profiles p
      where p.id = new.created_by and p.role in ('admin_iwl', 'equipo_iwl');
    end if;
    insert into avisos (tipo, company_id, dd_item_id, profile_id, para, para_iwl)
    values ('documento_entregado', new.company_id, new.id, auth.uid(), v_pidio, v_pidio is null);
  elsif v_sale then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where dd_item_id = new.id and tipo = 'documento_entregado' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists dd_items_aviso_entregado on dd_items;
create trigger dd_items_aviso_entregado
  after insert or update of status on dd_items
  for each row execute function app.avisos_de_documento_entregado();

-- -----------------------------------------------------------------------------
-- Correos sin enviar: uno solo, desde el más antiguo
-- -----------------------------------------------------------------------------

create or replace function app.aviso_de_correos_sin_enviar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde timestamptz;
begin
  select min(created_at) into v_desde from correos where estado = 'sin_enviar';
  if v_desde is null then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where tipo = 'correos_sin_enviar' and cerrado_at is null;
  elsif not exists (select 1 from avisos where tipo = 'correos_sin_enviar' and cerrado_at is null) then
    insert into avisos (tipo, created_at) values ('correos_sin_enviar', v_desde);
  end if;
  return null;
end;
$$;

drop trigger if exists correos_aviso_sin_enviar on correos;
create trigger correos_aviso_sin_enviar
  after insert or update of estado or delete on correos
  for each statement execute function app.aviso_de_correos_sin_enviar();

-- -----------------------------------------------------------------------------
-- Lo que ya estaba pendiente al desplegar, con constancia
-- -----------------------------------------------------------------------------

with nuevas as (
  insert into avisos (tipo, candidatura_id, para_iwl, created_at)
  select 'candidatura_nueva', k.id, true, k.created_at
  from candidaturas k
  where k.estado = 'presentada'
    and not exists (select 1 from avisos a where a.candidatura_id = k.id and a.tipo = 'candidatura_nueva')
  returning tipo
),
firmas as (
  insert into avisos (tipo, candidatura_id, acta_id, para, created_at)
  select 'acta_por_firmar', ac.candidatura_id, f.acta_id, f.profile_id, ac.created_at
  from comite_firmas f
  join comite_actas ac on ac.id = f.acta_id
  join candidaturas k on k.id = ac.candidatura_id
  where f.firmado_at is null and ac.cerrada_at is null and k.estado <> 'descartada'
    and not exists (select 1 from avisos a where a.acta_id = f.acta_id and a.para = f.profile_id)
  returning tipo
),
aceptados as (
  insert into avisos (tipo, company_id, annex_id, profile_id, created_at)
  select 'anexo_aceptado', x.company_id, x.id, x.aceptado_por, coalesce(x.aceptado_at, now())
  from annexes x
  join companies c on c.id = x.company_id
  where x.status = 'aceptado' and c.archived_at is null
    and not exists (select 1 from avisos a where a.annex_id = x.id)
  returning tipo
),
documentos as (
  insert into avisos (tipo, company_id, dd_item_id, para, para_iwl, created_at)
  select 'documento_entregado', d.company_id, d.id, p.id, p.id is null, d.updated_at
  from dd_items d
  join companies c on c.id = d.company_id
  left join profiles p on d.template_id is null and p.id = d.created_by and p.role in ('admin_iwl', 'equipo_iwl')
  where d.status in ('entregado', 'en_revision') and c.archived_at is null
    and not exists (select 1 from avisos a where a.dd_item_id = d.id)
  returning tipo
),
correos_ as (
  insert into avisos (tipo, created_at)
  select 'correos_sin_enviar', min(created_at) from correos
  where estado = 'sin_enviar'
  having count(*) > 0
  returning tipo
),
todos as (
  select tipo from nuevas union all select tipo from firmas union all select tipo from aceptados
  union all select tipo from documentos union all select tipo from correos_
)
insert into activity_log (entity, action, detail)
select 'avisos', 'avisos_abiertos_por_revision',
       jsonb_build_object(
         'motivo', 'REVISION 19 nov: avisos que faltaban; se abren los que ya estaban pendientes',
         'por_tipo', jsonb_object_agg(tipo, n),
         'total', sum(n))
from (select tipo, count(*) as n from todos group by tipo) t
having count(*) > 0;
