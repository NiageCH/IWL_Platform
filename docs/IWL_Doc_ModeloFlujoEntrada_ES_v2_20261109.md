# Plataforma IWL · modelo de datos del flujo de entrada

Versión 2 · 9 nov 2026 · para aprobar antes de construir

Rehecho con la respuesta de Rodrigo a la versión 1: **dos vías de entrada**, Aceleración y Construcción, y una **decisión de incorporación** que cierra la entrada en las dos. Sustituye a la versión 1. El recorrido, en palabras, está en `IWL_Doc_FlujoEntrada_ES_v2_20261109.md`.

Lo que ya existe y se reutiliza:
· el NDA firmado en la plataforma (`nda_plantillas`, `nda_firmas`, `estado_nda`), del commit `ef6b8db`;
· la situación societaria, del commit `2f52a14`;
· el alta paso a paso y los avisos, del commit `e60bcab`.

---

## 1. Tramo y vía

```
companies.tramo   enum ('entrada', 'incubacion')        not null default 'incubacion'
companies.via     enum ('aceleracion', 'construccion')  nulo hasta el acta de comité
```

· **El tramo está separado de la fase del programa.** Las fases miden el avance de una compañía que ya está dentro; «en entrada» es estar todavía fuera.
· **En entrada no cuenta** en cartera, comparativa, cohorte, compromiso ni runway: todas esas lecturas filtran `tramo = 'incubacion'` desde una función común. Se ve en **«En entrada»**, con la vía en cada fila.
· **La vía la fija el acta de comité.** Sale propuesta por el estado de entrada: idea, prototipo y MVP → Construcción; primeros clientes y facturación → Aceleración. El comité la puede cambiar, y entonces el motivo es obligatorio.
· **De Construcción a Aceleración**, cuando empieza a facturar: cambio de dirección, con motivo, y queda en el registro de actividad. Los puntos «por construir» pasan entonces a «por entregar». Al revés no se pasa.
· **Etapa y perfil técnico, vacíos en entrada**:
  ```
  check (tramo = 'entrada' or (stage is not null and tech_profile is not null))
  ```
  Los KPI y la hoja de ruta se instancian al firmar el Acuerdo, que es cuando se deciden.
· Las compañías que hay hoy nacen con `incubacion`, sin vía. Para ellas no cambia nada.

## 2. «Por construir»

Un estado nuevo para lo que no se le pide a la entrada, sino que se hace con IWL dentro del programa:

```
estado_punto_dd    + 'por_construir'
estado_seccion_bp  + 'por_construir'
dd_items.milestone_id → milestones (nulo)
```

· **No cuenta como pendiente ni como vencido**, ni en el score, ni en los avisos, ni en «Recordar». Como «No aplica», sale del denominador; a diferencia de él, se va a hacer.
· **Pasa a «por entregar»** —el `pendiente` de siempre— cuando se enlaza a un hito con fecha. Toma la fecha del hito, y desde ahí avisa como cualquier otro. Lo hace un disparador al enlazar, y también si el hito estrena fecha después.
· En **Construcción**, el checklist y las secciones del business plan nacen «por construir». En **Aceleración**, el checklist nace «por entregar», como hoy.
· En pantalla se pinta como «Por hacer», sin fecha. Va en `lib/estados.ts`, igual que el resto.

## 3. La compañía nace al contrafirmar el NDA

En las dos vías. `app.contrafirmar_nda` llama, en la misma transacción, a `app.crear_compania_en_entrada(candidatura)`, que:

1. crea la compañía en `tramo = 'entrada'`, con la vía del acta, el nombre, el sector, la frase, la web, la cohorte, el liderazgo femenino y la situación societaria si ya se dijo;
2. instancia el checklist y el business plan, «por entregar» o «por construir» según la vía;
3. enlaza `candidaturas.company_id` y pasa la candidatura a `entrada`;
4. **la candidata pasa a fundadora**: `profiles.role = 'fundadora'` y su fila en `company_members` con papel `fundadora`. Lo mismo cada cofundadora de la candidatura que tenga cuenta;
5. deja su fila en el registro.

El identificador sale del nombre con el primer número libre. La fundadora entra en **Mi compañía**.

## 4. La situación societaria

```
companies.situacion_confirmada_at   timestamptz
companies.situacion_confirmada_por  → profiles
```

· **La dice la fundadora, una vez**: mientras esté sin decir y la compañía esté en entrada. Mi compañía abre con esa pregunta.
· **IWL la confirma**, como un punto más del diagnóstico o del due diligence. Hasta entonces se ve «Por confirmar».
· Después solo la cambia IWL, y lo comprueba el guardián de la base.
· De la situación salen, como ya hace la base, los puntos societarios, el hito «Constituir la sociedad» y quién firma el Acuerdo.

## 5. Estados del embudo

`estado_candidatura`, con dos cambios:

| Valor | Antes | Ahora |
|---|---|---|
| `nda` | «NDA firmado» | **«NDA enviado»**: con cuenta, firmas pendientes |
| `diligencia` | due diligence de la candidata | **renombrado a `entrada`**: la compañía existe |

`acuerdo`, `firmada` y `descartada` no cambian de sentido; `firmada` ya no crea la compañía: la pasa a incubación.

· El due diligence deja de hacerse en la candidatura: se hace en `dd_items` de la compañía. Lo que se le pidió antes (`candidatura_peticiones`) sigue llegando a la compañía por el expediente heredado.
· Se retira `pedir_dd_al_firmar_nda`.
· `firmada_tiene_compania` se amplía: desde `entrada`, la candidatura tiene compañía.

## 6. Reuniones, y si abrió el enlace

```
candidatura_reuniones
  id, candidatura_id → candidaturas (cascade)
  propuesta_at, propuesta_por → profiles
  franjas jsonb            [{inicio, fin}], dos o tres
  celebrada_on date
  asistentes jsonb         [{nombre, de: 'iwl' | 'candidatura'}]
  notas text
  conclusion enum ('seguir', 'no_seguir', 'pendiente')
  created_at, created_by
candidatura_documentos.reunion_id → candidatura_reuniones (nulo): los adjuntos
candidaturas.enlace_abierto_at, candidaturas.enlace_visto_at   la primera apertura y la última
```

· **«Proponer reunión»** crea la fila con sus franjas y abre el correo ya redactado (`mailto:`), como «Recordar».
· **«Anotar la reunión»** la completa con fecha, asistentes, notas, conclusión y adjuntos.
· Cada una deja su evento en `candidatura_eventos`.
· La candidata ve «Reunión propuesta» mientras haya una propuesta sin celebrar.
· Las aperturas del enlace las apunta `ver_candidatura`, la función del enlace, en cada apertura.

## 7. Acta de comité

```
comite_actas
  id, candidatura_id → candidaturas
  fecha date, resumen text
  decision enum ('preseleccionada', 'descartada', 'aplazada')
  via enum ('aceleracion', 'construccion')        con decisión preseleccionada
  via_propuesta enum (…)                          la que salía del estado de entrada
  via_motivo text                                 obligatorio si via <> via_propuesta
  motivo text
  revision_on date                                obligatoria si aplazada
  puede_volver boolean, mensaje text              para la descartada, en la voz de IWL
  cerrada_at timestamptz                          cuando firman todos
  documento_id → candidatura_documentos           el PDF
  created_at, created_by

comite_firmas
  acta_id → comite_actas, profile_id → profiles   (clave doble)
  firmado_at, firmado_ip, firmado_ua

platform_settings 'comite_miembros'               la lista por defecto: ids de personas de IWL
```

· **Los miembros**: al crear el acta salen marcados los de la lista por defecto (Programa), y se pueden cambiar en cada una. Son las filas de `comite_firmas`.
· **Con la primera firma, el contenido se congela**. Es un guardián de integridad: no se exime ni con la clave de servicio.
· **Firmar va como el NDA**: la sesión en la acción, y la IP y el navegador del servidor.
· **Cuando firma el último**:
  · se genera el PDF del acta con sus firmas (lo que ya hace `lib/nda-pdf.ts`, generalizado) y va al expediente;
  · se aplica la decisión. Preseleccionada mueve el estado y fija la vía. Descartada descarta con el motivo y deja preparado el mensaje. Aplazada deja la candidatura en Comité.
· **Aplazada**: el día de `revision_on`, aviso a dirección. Es un aviso calculado, como las altas detenidas, y se va cuando hay acta nueva.

## 8. El NDA: enviarlo y comentarlo

**«Enviar el NDA»**, desde Preseleccionada, hace en un paso:
· crea la cuenta;
· pasa a `nda`;
· deja preparado el mensaje con el acceso.

```
nda_comentarios
  id, candidatura_id, plantilla_id (la versión comentada), profile_id
  texto, created_at
  respuesta, respondido_at, respondido_por
nda_plantillas.candidatura_id → candidaturas      nulo = la genérica
avisos.tipo  + 'nda_comentario'
```

· **Un comentario** llega como aviso a dirección.
· **Si cambia el texto**, se crea una versión propia de esa candidatura, con las mismas reglas: no se edita y lleva su hash. Esa versión **anula la firma de ella si IWL aún no ha firmado**, y vuelve a pedírsela.
· **Con las dos firmas**, un cambio ya es un NDA nuevo, no una versión.
· `estado_nda` y la firma usan la versión propia si la hay, y si no la genérica.

## 9. La decisión de incorporación

```
decisiones_incorporacion
  company_id → companies (unique)
  decision enum ('si', 'no')
  base enum ('due_diligence', 'estrategica')
  motivo text not null
  decidido_on date, decidido_por → profiles
  mensaje text                                    para el no, en la voz de IWL
```

· **Solo dirección**, en la compañía en entrada. La base normal es el due diligence en Aceleración y la estratégica en Construcción, pero las dos valen en cualquier vía, siempre con su motivo.
· **No** → la compañía se archiva como «No incorporada», con el motivo y el mensaje. Su expediente queda.
· **Sí** → abre «Proponer el Acuerdo».

## 10. Proponer y aceptar el Acuerdo

```
acuerdo_propuestas
  id, company_id, version int
  stage, equity_pct, aportacion text
  situacion_societaria (y sus datos), firmantes jsonb
  estado enum ('propuesta', 'aceptada', 'retirada')
  propuesta_at, propuesta_por, aceptada_at, aceptada_por
acuerdo_comentarios
  id, propuesta_id, profile_id, texto, created_at
  respuesta, respondido_at, respondido_por
```

· La fundadora **ve la propuesta en Mi compañía**, puede comentarla y la acepta.
· Un cambio es una propuesta nueva. Las versiones no se editan.
· Aceptada, se firman el Acuerdo y su Anexo. **Firmar el Acuerdo** hace todo esto:
  · fija etapa, perfil, fase y recorrido;
  · instancia KPI y hoja de ruta;
  · guarda los firmantes;
  · pasa la compañía a `incubacion` y la candidatura a `firmada`.
· **La puerta, en la base**:
  · En **Aceleración**, firmar exige validados todos los puntos obligatorios del due diligence.
  · En **Construcción**, se firma sin ninguno validado.
  · En las dos, hace falta la decisión de incorporación en «sí» y la propuesta aceptada.

## 11. «En entrada», separado de la cartera

· `/cartera` solo enseña `tramo = 'incubacion'`.
· Al lado, **«En entrada»**: cada compañía con su vía y el paso en que está.
· **En Aceleración**, el avance del due diligence (x de y), los días, «Recordar» y «Validar».
· **En Construcción**, el diagnóstico: reunión, ficha y situación.
· El contador de dirección cuenta también lo detenido aquí. Lo «por construir» no cuenta.

## 12. Lo que se toca de lo hecho

· `firmar_candidatura` deja de crear la compañía: pasa a ser la firma del Acuerdo del punto 10.
· La línea del alta (`lib/onboarding.ts`) gana reunión y comité al principio. En Construcción, el paso del due diligence se sustituye por el diagnóstico.
· La guía de carga se rehace con el nuevo flujo y con Siren como ejemplo.

**Datos existentes**: en la nube, tras `nube:vaciar`, solo quedan las candidaturas de muestra, y se ajustan en la misma migración. En local, las compañías de la semilla quedan en `incubacion`.

---

## Lo que queda por decidir

1. **Pasar de Construcción a Aceleración**: lo he dejado como cambio de dirección con motivo, sin volver a comité. ¿Vale, o pasa por comité?
2. **«Por construir» al enlazarse a un hito**: lo he puesto automático, en cuanto el hito tiene fecha. ¿O lo pasa IWL a mano?
3. **La propuesta de Acuerdo y el Anexo**: ¿la propuesta es ya el borrador del Anexo, o son dos cosas? He supuesto que el Anexo se abre al aceptar la propuesta, con sus cifras.
