-- =============================================================================
-- Evidencia: adjuntar algo a cualquier cosa
--
-- `evidence_links` nació para el business plan y solo sabía colgar de dos
-- sitios: una hipótesis o una sección. Lo que se pide ahora es poder
-- adjuntar al cambiar el estado de un hito, al puntuar una dimensión
-- técnica, al encargar una tarea o al dar por entregado un punto del
-- checklist —es decir, a cualquier cosa que alguien afirme—.
--
-- Se añade el par genérico `entity` + `entity_id`, el mismo patrón que ya
-- usa `comments`. Los dos anclajes viejos se quedan: el plan los usa, y
-- cambiarlos sería reescribir pantallas que funcionan para no ganar nada.
--
-- Las políticas no se tocan. Son por compañía —`can_read_company` y
-- `can_write_company`— así que una evidencia nueva hereda el acceso del
-- proyecto al que pertenece sin que haya que decir nada.
-- =============================================================================

alter table evidence_links
  add column if not exists entity text,
  add column if not exists entity_id uuid;

comment on column evidence_links.entity is
  'A qué cuelga la evidencia: milestone, task, dd_item, tech_score, '
  'progress_entry. El par entity/entity_id es el anclaje genérico; '
  'hypothesis_id y section_id son los del business plan, anteriores.';

create index if not exists evidence_links_entidad_idx
  on evidence_links (company_id, entity, entity_id);

/*
 * Una evidencia que no cuelga de nada no es una evidencia.
 *
 * Sin esto, una fila con los cuatro anclajes a nulo se guarda y no la
 * encuentra ninguna pantalla: queda ocupando sitio y contando en los
 * recuentos sin que nadie pueda llegar a ella.
 */
/*
 * La regla vieja se va: decía «o hipótesis o sección», y era verdad
 * mientras la evidencia solo servía para el business plan. Dejarla
 * puesta junto a la nueva hace que la nueva no sirva de nada: una
 * evidencia colgada de un hito cumple la nueva y sigue chocando con la
 * vieja, y el error que sale es «los datos no cumplen una condición de
 * la base», que no dice cuál.
 */
alter table evidence_links
  drop constraint if exists evidencia_cuelga_de_algo;

alter table evidence_links
  drop constraint if exists evidence_links_cuelga_de_algo;

alter table evidence_links
  add constraint evidence_links_cuelga_de_algo check (
    hypothesis_id is not null
    or section_id is not null
    or (entity is not null and entity_id is not null)
  );

-- -----------------------------------------------------------------------------
-- 50 MB por archivo en el data room
--
-- Era el único de los cuatro cajones sin límite declarado. Decisión de
-- Rodrigo del 5 de noviembre: el mismo que candidaturas.
-- -----------------------------------------------------------------------------

update storage.buckets
   set file_size_limit = 52428800
 where id = 'data-room'
   and file_size_limit is distinct from 52428800;

-- -----------------------------------------------------------------------------
-- Plazos de conservación, provisionales
--
-- En configuración y no en código, para que cambiarlos no sea un
-- despliegue: los tiene que validar la asesoría y van a cambiar.
--
-- Nada los aplica todavía. Están declarados para poder contestar qué se
-- guarda y cuánto, que es la pregunta que hoy no tenía respuesta. El
-- borrado automático se construye cuando los plazos sean firmes: borrar
-- por un plazo provisional es la clase de error que no tiene vuelta atrás.
-- -----------------------------------------------------------------------------

insert into platform_settings (key, value, description) values
  ('conservacion',
   '{"provisional": true,
     "documentos_acuerdo_anios_tras_relacion": 6,
     "registro_accesos_anios": 2,
     "registro_actividad": "mientras exista la compañía"}',
   'Cuánto se guarda cada cosa. Provisional hasta que lo valide la asesoría, y por eso lo lleva escrito: nada lo aplica todavía.')
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description;
