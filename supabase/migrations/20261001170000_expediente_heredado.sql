-- =============================================================================
-- Lo que entregó durante la selección no se vuelve a pedir
--
-- Al firmar, una candidatura se convierte en compañía y la compañía estrena
-- su checklist de due diligence: los mismos 29 puntos que ya había entregado
-- siendo candidata. Pedírselos otra vez choca de frente con el primer
-- principio del proyecto, que es que un dato se introduce una vez.
--
-- Se decidió **no copiar los ficheros**, sino que la ficha de la compañía
-- lea del expediente de su candidatura.
--
-- Por qué así y no copiando: copiar veintinueve ficheros entre buckets
-- dentro de una acción de servidor roza el límite de tiempo del plan de
-- alojamiento, y además duplicaría el almacenamiento y crearía dos copias
-- que pueden divergir. Leer de donde está no tiene ninguna de esas pegas, y
-- el expediente de la candidatura es justamente el sitio donde pasó: es su
-- procedencia, no un trasto heredado.
--
-- Lo que hace falta para que funcione es que quien puede ver la compañía
-- pueda ver el expediente de la candidatura que la originó. Ni más ni menos:
-- las candidaturas que no llegaron a compañía siguen siendo solo de IWL.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Quién puede leer el expediente heredado
-- -----------------------------------------------------------------------------

/*
 * La pregunta, en una función con privilegio propio.
 *
 * No vale ponerla como subconsulta dentro de la política: una política no
 * se salta el RLS de las tablas que consulta, y `candidaturas` solo la ve
 * IWL. Desde una fundadora, el `exists` miraría una tabla vacía y daría
 * falso siempre. Lo expone una función `security definer`, que es lo que ya
 * hacen `app.can_read_company` y las demás por el mismo motivo.
 *
 * Lo que devuelve es solo si esa candidatura acabó en una compañía que la
 * persona puede ver. No filtra nada más.
 */
create or replace function app.puede_ver_expediente(p_candidatura uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from candidaturas c
    where c.id = p_candidatura
      and c.company_id is not null
      and app.can_read_company(c.company_id)
  )
$$;

create policy documentos_equipo_compania on candidatura_documentos
  for select to authenticated using (
    app.puede_ver_expediente(candidatura_id)
  );

create policy peticiones_equipo_compania on candidatura_peticiones
  for select to authenticated using (
    app.puede_ver_expediente(candidatura_id)
  );

/*
 * Y los ficheros.
 *
 * Se recrea la política entera porque hay que añadirle una rama. El bucket
 * sigue siendo privado y las direcciones firmadas: lo que cambia es quién
 * puede pedir una firma.
 */
drop policy if exists candidaturas_doc_select on storage.objects;

create policy candidaturas_doc_select on storage.objects
  for select to authenticated using (
    bucket_id = 'candidaturas'
    and (
      app.is_iwl()
      -- La propia candidata, mientras lo es
      or (storage.foldername(name))[1]::uuid = app.mi_candidatura_id()
      -- Y el equipo de la compañía en que se convirtió, si se convirtió
      or app.puede_ver_expediente((storage.foldername(name))[1]::uuid)
    )
  );

-- -----------------------------------------------------------------------------
-- El puente entre el checklist de la compañía y lo que ya entregó
--
-- `candidatura_peticiones.item_template_id` y `dd_items.template_id` salen
-- del mismo catálogo, así que el punto de la compañía y lo que entregó
-- siendo candidata se reconocen sin inventar ninguna correspondencia.
-- -----------------------------------------------------------------------------

create view documentos_de_seleccion as
select
  c.company_id,
  c.id as candidatura_id,
  p.item_template_id,
  d.id,
  d.nombre,
  d.storage_path,
  d.bytes,
  d.created_at
from candidatura_documentos d
join candidaturas c on c.id = d.candidatura_id
left join candidatura_peticiones p on p.id = d.peticion_id
where c.company_id is not null;

alter view documentos_de_seleccion set (security_invoker = true);
grant select on documentos_de_seleccion to authenticated;

comment on view documentos_de_seleccion is
  'Lo que una compañía entregó mientras era candidatura, enlazado al punto '
  'del checklist que responde. No se copia nada: se lee de donde pasó.';
