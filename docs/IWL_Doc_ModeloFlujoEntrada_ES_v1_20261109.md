# Plataforma IWL · modelo de datos del nuevo flujo de entrada

Versión 1 · 9 nov 2026 · para aprobar antes de construir

Cómo cambia la base para que **la compañía nazca cuando las dos partes han firmado el NDA**, según `IWL_Doc_FlujoEntrada_ES_v1_20261109.md`. Cubre los puntos 3 a 7 de la revisión del 9 de noviembre. Al final, lo que necesito que decidas.

Lo que ya existe y se reutiliza:
· el NDA firmado en la plataforma (`nda_plantillas`, `nda_firmas`, `estado_nda`), del commit `ef6b8db`;
· la situación societaria, del commit `2f52a14`;
· el alta paso a paso y los avisos, del commit `e60bcab`.

---

## 1. El corte: un «tramo» en la compañía

Una compañía puede estar en due diligence o en incubación. Propongo una columna nueva, separada de la fase del programa:

```
companies.tramo   enum ('due_diligence', 'incubacion')   not null default 'incubacion'
```

· **Por qué no una fase más.** Las fases (`phases`) son las del programa —diagnóstico, validación…— y miden el avance de una compañía que ya está dentro. «En due diligence» es estar todavía fuera. Mezclarlo rompería cada pantalla que pinta el recorrido por fases.
· **Fuera de todo agregado**, como `is_demo`. Cartera, comparativa, cohorte, compromiso y runway solo cuentan `tramo = 'incubacion'`. El filtro va en `lib/datos/cartera.ts` y en las demás lecturas que agregan, en una función común.
· **«No incorporada»**: si el due diligence no sigue, la compañía se archiva (`archived_at`) con motivo «No incorporada» y se queda en `due_diligence`. Su expediente queda.
· Las compañías que hay hoy nacen con `incubacion`, el valor por defecto: no cambia nada para ellas.

Mientras está en due diligence, la compañía todavía no tiene etapa de inversión ni perfil técnico decididos:

```
companies.stage, companies.tech_profile   pasan a admitir nulo
check (tramo = 'due_diligence' or (stage is not null and tech_profile is not null))
```

Al crearla se instancian el checklist de due diligence y las secciones del business plan, como hoy. **Los KPI y la hoja de ruta, al firmar el Acuerdo**: dependen del perfil técnico y del recorrido, que se deciden entonces.

## 2. La candidatura y su compañía

`candidaturas.company_id` ya existe y se rellena **al contrafirmar el NDA**, no al firmar el Acuerdo.

Los estados del embudo (`estado_candidatura`) se mantienen, con un cambio de sentido:

| Estado | Hoy | Con el nuevo corte |
|---|---|---|
| `nda` | «NDA firmado» | **«NDA enviado»**: con cuenta, firmas pendientes |
| `diligencia` | due diligence de la candidata | **la compañía existe**; el due diligence va en Mi compañía |
| `acuerdo` | acuerdo propuesto | igual |
| `firmada` | crea la compañía | **pasa la compañía a incubación** |

· `firmada_tiene_compania` se amplía: desde `diligencia`, la candidatura tiene compañía.
· `candidatura_peticiones` deja de usarse a partir del NDA: el due diligence se pide en `dd_items` de la compañía. Lo pedido antes («Pedirle algo más») sigue en la candidatura, y la compañía lo ve por el expediente heredado (`documentos_de_seleccion`), como ahora.
· El disparador `pedir_dd_al_firmar_nda` se retira; su trabajo lo hace la creación de la compañía.

## 3. La contrafirma lo dispara todo

`app.contrafirmar_nda` llama, en la misma transacción, a una función nueva `app.crear_compania_en_dd(candidatura)` que:

1. crea la compañía en `tramo = 'due_diligence'`, con nombre, sector, frase, web, cohorte, liderazgo femenino y la situación societaria si ya se dijo;
2. instancia el checklist de due diligence y el business plan;
3. enlaza `candidaturas.company_id` y pasa la candidatura a `diligencia`;
4. **la candidata pasa a fundadora**: `profiles.role = 'fundadora'` y `company_members` con papel `fundadora`. Lo mismo para cada cofundadora de la candidatura que tenga cuenta (respuesta 1 del 5 nov);
5. deja una fila en el registro de actividad.

El identificador sale del nombre con el primer número libre, como en el arreglo del punto 4 (`lib/identificador.ts`, llevado a SQL).

La fundadora entra en **Mi compañía** con su lista abierta.

## 4. La situación societaria, primera pregunta a la fundadora

Hoy solo IWL la escribe (`guard_company_governance`). Propuesta: **la fundadora puede decirla una vez**, mientras esté sin decir y la compañía esté en due diligence. Después, como ahora, solo IWL. El guardián lo comprueba en la base.

Mi compañía, en due diligence y sin situación, abre con esa pregunta antes que la lista. De la respuesta salen, como ya hace la base, los puntos societarios, el hito y quién firma el Acuerdo.

## 5. Reuniones

```
candidatura_reuniones
  id, candidatura_id → candidaturas (cascade)
  propuesta_at timestamptz, propuesta_por → profiles
  franjas jsonb            [{inicio, fin}], dos o tres
  celebrada_on date
  asistentes jsonb         [{nombre, de: 'iwl' | 'candidatura'}]
  notas text
  conclusion enum ('seguir', 'no_seguir', 'pendiente')
  created_at, created_by
candidatura_documentos.reunion_id → candidatura_reuniones (nullable): los adjuntos
```

· «Proponer reunión» crea la fila con sus franjas y abre el correo ya redactado (`mailto:`), como «Recordar». «Anotar la reunión» completa fecha, asistentes, notas, conclusión y adjuntos.
· Cada una deja su evento en `candidatura_eventos` (`tipo = 'reunion'`), que es el historial que ya se enseña.
· La candidata ve «Reunión propuesta» mientras haya una propuesta sin celebrar. Va en `app.momento_candidata`.

**Si abrió el enlace privado:**

```
candidaturas.enlace_abierto_at, candidaturas.enlace_visto_at   timestamptz
```

Los escribe `ver_candidatura` (la función del enlace, ya `security definer`) en cada apertura: la primera y la última.

## 6. Acta de comité

```
comite_actas
  id, candidatura_id → candidaturas
  fecha date, resumen text
  decision enum ('preseleccionada', 'descartada', 'aplazada')
  motivo text
  puede_volver boolean           ¿se puede presentar otra vez?
  mensaje text                   lo que se le dice a ella, en la voz de IWL
  cerrada_at timestamptz         cuando firman todos
  documento_id → candidatura_documentos   el PDF
  created_at, created_by

comite_firmas
  acta_id → comite_actas, profile_id → profiles   (clave doble)
  firmado_at, firmado_ip, firmado_ua
```

· **Los miembros son las filas de `comite_firmas`**, elegidos al crear el acta entre las personas de IWL.
· **Con la primera firma, el contenido se congela**: un acta firmada por uno no se edita. Es un guardián de integridad, sin excepción para la clave de servicio.
· Firmar va como el NDA: la acción comprueba la sesión, la IP la pone el servidor, y la función solo la llama la clave de servicio.
· **Cuando firma el último**: PDF con el acta y las firmas (el mismo `lib/nda-pdf.ts`, generalizado), al expediente, y se aplica la decisión. Preseleccionada mueve el estado; descartada descarta con el motivo y deja preparado el mensaje.

## 7. El NDA: enviarlo y comentarlo

**«Enviar el NDA»**, desde Preseleccionada, hace en un paso lo que hoy son dos:
· crea la cuenta (`darAccesoCandidata`);
· pasa a `nda`;
· deja preparado el mensaje con el acceso.

**Comentarios de la candidata:**

```
nda_comentarios
  id, candidatura_id, plantilla_id (la versión que comenta), profile_id
  texto, created_at
  respuesta text, respondido_at, respondido_por
avisos.tipo   + 'nda_comentario'
```

**Una versión del NDA solo para ella**, cuando el comentario cambia el texto:

```
nda_plantillas.candidatura_id → candidaturas (nulo = la genérica)
```

`estado_nda` y la pantalla de firma usan la versión específica de la candidatura si la hay, y si no la genérica. La específica sigue las mismas reglas: no se edita, lleva su hash, y la firma apunta a ella. Una versión nueva **anula la firma de ella si aún no ha firmado IWL**, y vuelve a pedírsela.

## 8. «En due diligence», separado de la cartera

· `/cartera` solo enseña `tramo = 'incubacion'`.
· Al lado, una pestaña o sección **«En due diligence»**: cada compañía con su avance (x de y), los días en el paso, «Recordar» y «Validar». La línea del alta (`lib/onboarding.ts`) ya sabe pintarlo.
· El contador de dirección cuenta también lo detenido aquí.

## 9. Lo que se toca de lo hecho

· `firmar_candidatura` deja de crear la compañía. Pasa a «firmar el Acuerdo»: fija etapa, perfil, fase y recorrido, instancia KPI y hoja de ruta, guarda los firmantes y pasa a `incubacion`.
· La línea del alta de la candidatura (`lib/onboarding.ts`) gana dos pasos al principio, reunión y comité. El due diligence lo lee de la compañía.
· La guía de carga (`IWL_Doc_CargarCompania_ES_v1_20261105.md`) se rehace con el nuevo corte y Siren como ejemplo.

**Datos existentes:** en la nube no hay candidaturas en curso tras `nube:vaciar`, salvo las de muestra, que se ajustan en la misma migración. En local, las compañías de la semilla quedan en `incubacion`.

---

## Lo que necesito que decidas

1. **¿«Tramo» como columna aparte**, y no como una fase más?
2. **¿Etapa y perfil técnico vacíos durante el due diligence**, y KPI y hoja de ruta instanciados al firmar el Acuerdo?
3. **¿La fundadora dice la situación societaria una vez**, y después solo IWL?
4. **¿Quién forma el comité?** Propongo elegir los miembros de entre las personas de IWL al crear cada acta. La alternativa es una lista fija en Programa.
5. **¿Una versión del NDA propia de la candidata**, cuando su comentario cambia el texto? ¿Y que anule su firma si IWL no ha firmado todavía?
6. **¿El estado `nda` pasa a llamarse «NDA enviado»**, y `diligencia` a significar que la compañía ya existe?
7. **«Aplazada» en el acta**: ¿la candidatura se queda en Comité, o hay un estado nuevo?
