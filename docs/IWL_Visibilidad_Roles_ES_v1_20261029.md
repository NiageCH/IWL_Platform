# Visibilidad por rol y tipo de miembro

Versión 1 · 29 oct 2026 · aprobada en `docs/REVISION.md` del 29 oct

Qué ve cada persona dentro de una compañía. Lo impone la base con políticas
por `member_role`; la pantalla solo esconde lo que la base ya prohíbe.

---

## 1. El problema que resuelve

Una sola función decidía todo: `app.can_read_company` dice **sí a cualquier
miembro**, sin mirar de qué tipo. Y las seis tablas en juego la usaban tal
cual:

```
cash_disbursements · contribution_hours · contribution_items
deliverables · introductions · tech_findings     →  can_read_company
```

O sea: un mentor secundario veía las horas y el dinero que IWL ha puesto, y
los hallazgos técnicos, igual que la dirección.

## 2. Los actores

**Rol global** (`app_role`): `admin_iwl`, `equipo_iwl`, `revisor_niage`,
`fundadora`, `mentor`, `lector_externo`, `candidata`.

**Tipo de miembro** (`company_member_role`), que es lo que decide dentro de
una compañía concreta: `fundadora`, `responsable_iwl`, `revisor_niage`,
`mentor_principal`, `mentor_secundario`, y `mentor` —heredado, ya no se
ofrece al asignar, cero filas—.

**IWL** = rol global `admin_iwl` o `equipo_iwl`. Pasa por encima de todo,
como hasta ahora: `app.is_iwl()` cortocircuita.

## 3. La tabla

| Qué | Fundadora | Responsable IWL | Mentor **principal** | Mentor **secundario** | Revisor Niage |
|---|---|---|---|---|---|
| Resumen, Recorrido | ✅ | ✅ | ✅ | ✅ | ✅ |
| Negocio · plan, números, updates | ✅ | ✅ | ✅ | ✅ | ❌ |
| Due diligence general | ✅ | ✅ | ✅ | ❌ | ❌ |
| DD técnico · evaluación y puntuaciones | ✅ publicadas | ✅ | ✅ | ❌ | ✅ **edita** |
| DD técnico · hallazgos | ✅ publicados | ✅ | ✅ | ❌ | ✅ **edita** |
| Aportación · horas, caja, introducciones, entregables | ✅ | ✅ | ✅ | ❌ | ❌ |
| Tareas | ✅ las suyas | ✅ | ✅ asigna | ✅ las suyas | ✅ las suyas |

### Las decisiones que no estaban en el encargo

**La fundadora ve su aportación.** El extracto es lo que IWL le aporta a
ella: ocultárselo rompería el contador de compromiso de su propio Resumen.

**La fundadora ve sus hallazgos, una vez publicados.** Son defectos de su
producto y los tiene que arreglar. Borradores y puntuaciones sin confirmar,
no: una evaluación a medias leída como definitiva es peor que no verla.

**El mentor secundario pierde el due diligence general.** Es de la misma
naturaleza que la aportación —contratos, cap table, nóminas—. Si necesita
un documento concreto, IWL se lo comparte; no se abre la carpeta.

## 4. Cómo se impone

Dos funciones nuevas en `app`, al lado de las cuatro que ya hay:

| Función | `true` para |
|---|---|
| `app.can_read_aportacion(c)` | IWL · fundadora · responsable_iwl · mentor_principal |
| `app.can_read_tecnico(c)` | IWL · fundadora · responsable_iwl · mentor_principal · revisor_niage |

Y las políticas `SELECT` pasan a usarlas:

```
contribution_hours · cash_disbursements           →  can_read_aportacion
contribution_items · introductions · deliverables
tech_findings                                      →  can_read_tecnico
```

`tech_scores` y `tech_assessments` ya filtran por «publicada o puedes
validar». Se les añade el mismo predicado para que un mentor secundario no
lea la evaluación, y para que la fundadora siga viendo solo lo publicado.

**Las pestañas salen de aquí.** `lib/permisos.ts` gana las capacidades por
compañía —`verAportacion`, `verTecnico`, `verNegocio`, `verDiligencia`—
calculadas del mismo `member_role`. La pantalla esconde lo que la base
prohíbe, nunca al revés.

## 5. Cómo se comprueba

Una prueba RLS por cada ❌ de la tabla, entrando **como esa persona** y no
como IWL: una prueba que solo entra como quien puede todo pasa en verde con
la política rota.
