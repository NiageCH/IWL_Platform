# Plataforma IWL · especificación para Claude Code

Versión 2 · 23 sep 2026 · Inception Woman Lab

Documento de construcción. Claude Code lo lee entero antes de escribir código y lo ejecuta por fases, en el orden de la sección 9.

---

## 1. Qué construimos

Una plataforma web donde cada compañía de la cohorte de Inception Woman Lab mantiene su **business plan vivo** y su **due diligence vivo**, reporta sus KPI cada mes y ve su avance en el programa. El equipo de IWL ve la cartera completa, entra proyecto a proyecto y saca informes.

Dos vistas sobre los mismos datos:

| Vista | Quién | Ve |
|---|---|---|
| Fundadora | El equipo fundador de cada compañía | Solo su compañía. Carga información, responde a comentarios, reporta KPI |
| IWL | Equipo de IWL e ingeniería de Niage Technology | Todas las compañías, dashboard de cohorte, revisión, validación e informes |

Tres principios:

- **La fundadora carga una vez y todo se alimenta de ahí.** Business plan, due diligence, KPI e informes comparten datos.
- **El due diligence tecnológico es el núcleo.** Lo ejecuta la ingeniería de Niage Technology, combina análisis automático del código con revisión experta y produce un plan de trabajo, no solo una nota. Es lo que separa a IWL de cualquier otro programa y la plataforma lo trata como módulo principal (sección 4.4).
- **Se evalúa contra la etapa.** Una compañía en fase semilla no se mide con la vara de una serie B. Cada criterio dice qué es suficiente para la etapa actual y qué hace falta para la siguiente ronda.

## 2. Referencias de mercado

| Familia | Ejemplos | Qué tomamos |
|---|---|---|
| Gestión de aceleradoras | AcceleratorApp, Babele, F6S | Fases del programa, sesiones y mentoría |
| Seguimiento de cartera de fondos | Visible, Standard Metrics, Vestberry | Update mensual estructurado, biblioteca de KPI, alertas |
| Data rooms | DocSend, Peony | Carpetas, permisos, checklist de documentos |
| Due diligence técnico | Consultoras de tech DD, checklists de inversores | Áreas de revisión y severidad de hallazgos |
| Análisis de código abierto | Syft, Grype, OSV-Scanner, Gitleaks, Semgrep, scc | Motor del análisis automático |

El hueco: las herramientas de aceleradora gestionan el programa pero no el plan de negocio; las de fondos monitorizan métricas pero no el proceso de construcción; el due diligence técnico se contrata como informe puntual que caduca en semanas. IWL lo tiene todo en una plataforma y con el técnico vivo durante todo el programa.

## 3. Modelo del programa que la plataforma refleja

Fuente: `Propuesta-iwl_Lu-Ro.md` §5 a §7.

**Fases**

| Fase | Contenido |
|---|---|
| 0 · Acuerdo Marco | Incorporación formal a la cohorte |
| 1 · Due diligence conjunto | Máximo 2 semanas. Diagnóstico y firma del Anexo de Programa |
| 2 · Incubación | 6 a 18 meses según Anexo. Plan a medida, seguimiento periódico |
| 3 · Cierre y graduación | Evaluación frente a hitos, demo day, relación post-programa |

**Pilares.** Seis, activables por proyecto con intensidad distinta según el Anexo: acompañamiento operativo · mentoría especializada · fundraising readiness · espacio y recursos · comunicación y visibilidad · red y partnerships.

**Proyecto invertible.** Ha superado su due diligence, cumple los hitos de producto y tracción de su Anexo y está en condiciones reales de levantar una ronda institucional o de sostenerse financieramente. La plataforma calcula este estado; no lo marca nadie a mano.

Fases, pilares, áreas de due diligence, dimensiones técnicas y KPI son **datos configurables**, no código.

## 4. Módulos

### 4.1 Ficha de la compañía

Datos básicos, sector, fase del programa, equipo fundador con porcentaje de liderazgo femenino, cap table simplificada, pilares activos, responsable IWL y revisor técnico de Niage asignados. Cabecera fija en todas las pantallas del proyecto con fase, semáforo, score de preparación y score técnico.

### 4.2 Business plan vivo

Secciones estructuradas: problema · solución y producto · mercado · modelo de negocio · go-to-market · roadmap · equipo · plan financiero · necesidad de capital.

- Estado por sección: borrador · en revisión · validada por IWL.
- Historial de versiones con comparación y autor de cada cambio.
- Comentarios anclados a la sección, con hilo de respuesta.
- Hipótesis clave por sección con su evidencia enlazada (documento, KPI, hito o resultado del due diligence técnico).
- El plan financiero toma los reales de los KPI mensuales y muestra real frente a previsto. El coste de infraestructura por cliente sale del due diligence técnico.
- Las secciones de producto y roadmap enlazan con el roadmap técnico de la sección 4.4.
- Exportación a PDF con el formato de IWL.

### 4.3 Due diligence general y data room

Áreas: societario y legal · propiedad intelectual · financiero · comercial y tracción · equipo · regulatorio · impacto y 2X Criteria. La tecnología tiene módulo propio (4.4) y su resultado entra en el score total.

- Cada punto: descripción, documento, responsable, fecha y estado (pendiente · entregado · en revisión · validado · bloqueante).
- Data room con carpetas espejo de las áreas, versiones y registro de accesos.
- Hallazgos con impacto, plan de resolución y fecha. La interfaz los presenta como siguiente paso con fecha.
- **Score de preparación** por área y total, ponderado. Pesos configurables.
- Documentos con caducidad opcional: al vencer vuelven a pendiente.

### 4.4 Due diligence tecnológico Niage

El módulo principal. Tres capas que se alimentan entre sí: **análisis automático**, **revisión experta** de Niage y **plan de trabajo técnico**.

#### Dimensiones

Diez dimensiones. Las marcadas «si aplica» se activan según el tipo de compañía.

| Dimensión | Qué se revisa |
|---|---|
| Arquitectura y producto | Componentes, diagrama, decisiones clave, acoplamiento, adecuación a la etapa y al roadmap |
| Código y calidad | Tamaño, lenguajes, complejidad, tests y cobertura, documentación, deuda técnica |
| Seguridad | Dependencias vulnerables, secretos en el repositorio, autenticación, cifrado, OWASP Top 10, historial de incidentes |
| Infraestructura y operación | Proveedor cloud, infraestructura como código, CI/CD, monitorización, copias, recuperación, coste cloud por cliente |
| Escalabilidad y rendimiento | Qué pasa con 10 veces la carga actual, cuellos de botella, límites conocidos |
| Datos y privacidad | Modelo de datos, alojamiento, RGPD, contratos de encargo con proveedores, calidad y propiedad del dato |
| IA y modelos (si aplica) | Origen y derechos de los datos de entrenamiento, evaluación, dependencia de proveedor, coste de inferencia, clasificación de riesgo según el AI Act |
| Hardware (si aplica) | Nivel de madurez TRL, lista de materiales y coste unitario, proveedores y cadena de suministro, certificación CE y radio, firmware y actualización remota, fabricabilidad |
| Propiedad intelectual técnica | Titularidad del código y cesión de derechos de quien lo escribió, licencias open source y riesgo copyleft, patentes |
| Equipo y proceso | Concentración de conocimiento en una persona, dependencia de terceros, cadencia de entrega (frecuencia de despliegue, tiempo de entrega, tasa de fallo, tiempo de recuperación), roadmap técnico |

Cada dimensión tiene una lista de criterios concretos, configurables desde la administración y cargados como datos semilla.

#### Escala de madurez

Cada dimensión se puntúa de 0 a 4, siempre con evidencia:

| Nivel | Significado |
|---|---|
| 0 | No existe |
| 1 | Ad hoc, depende de una persona |
| 2 | Básico, funciona para la etapa actual con riesgo conocido |
| 3 | Sólido para la etapa y defendible ante un inversor |
| 4 | Preparado para escalar a la siguiente etapa |

Para cada dimensión y etapa (pre-semilla, semilla, serie A) se configura el **nivel objetivo**. El score técnico mide la distancia al objetivo de la etapa, no la distancia a la perfección. Pesos por dimensión configurables y distintos para software y para hardware.

#### Capa 1 · Análisis automático

- La fundadora conecta su repositorio con una **GitHub App o token de GitLab de solo lectura**, con permiso explícito y revocable desde la plataforma.
- Un worker clona el repositorio en un contenedor efímero, ejecuta el análisis y **borra el código al terminar**. La plataforma guarda solo métricas, hallazgos y el SBOM. Nunca almacena el código.
- Herramientas:

| Herramienta | Produce |
|---|---|
| scc | Líneas, lenguajes, complejidad, estimación de esfuerzo |
| Syft | SBOM: inventario de dependencias |
| Grype y OSV-Scanner | Vulnerabilidades conocidas en dependencias, con severidad |
| Grant o ScanCode | Licencias de las dependencias y detección de copyleft |
| Gitleaks | Secretos en el código y en el historial. Se guarda tipo y ubicación, **nunca el valor** |
| Semgrep | Análisis estático de patrones inseguros |
| Historial git y API del proveedor | Contribuidores, concentración de conocimiento, cadencia de commits y despliegues, pull requests |

- Cada ejecución queda registrada con fecha y versión de herramientas. Comparación entre dos ejecuciones: qué ha mejorado y qué ha aparecido.
- Reejecución programable, por defecto mensual, y bajo demanda.
- Los resultados automáticos proponen puntuación en las dimensiones que cubren. El revisor de Niage la confirma o la ajusta con motivo.

#### Capa 2 · Revisión experta Niage

- Cuestionario técnico que responde la fundadora o su CTO por dimensión, con adjuntos: diagrama de arquitectura, documentación, contratos de desarrollo, certificados, lista de materiales.
- Sesiones de revisión registradas con asistentes, duración y conclusiones. Las horas cuentan como dedicación de Niage al pilar de acompañamiento operativo.
- El revisor puntúa cada dimensión, enlaza la evidencia y redacta la conclusión.
- Hallazgos técnicos con severidad (crítico · alto · medio · bajo), dimensión, evidencia y recomendación. Un hallazgo crítico abierto bloquea el estado invertible.

#### Capa 3 · Plan de trabajo técnico

- Cada hallazgo genera un punto del plan con responsable (compañía o Niage), esfuerzo estimado y fecha.
- Los puntos que se acuerdan entran como hitos en el Anexo de Programa.
- Roadmap técnico visual por trimestres, enlazado con el roadmap del business plan.
- Estimación de coste de remediación, que alimenta la necesidad de capital del business plan.

#### Salidas

- **Scorecard técnico:** gráfico radar de las dimensiones, actual frente al objetivo de la etapa, con evolución en el tiempo.
- **Informe técnico Niage en PDF**, en dos versiones: la interna completa y el resumen para inversor, que solo lleva scorecard, fortalezas, plan de trabajo y estado. El resumen se escribe desde dentro del proyecto: lo que está construido y lo que viene, con fechas.
- **Reevaluación** trimestral y antes de cualquier ronda. La plataforma avisa cuando toca.

### 4.5 Programa, Anexo e hitos

- Anexo de Programa digital: pilares activos con intensidad, cadencia, duración e hitos.
- Hitos con fecha, criterio de cumplimiento y evidencia. Estados: pendiente · en curso · cumplido · retrasado. Los hitos que vienen del plan técnico llevan su origen.
- Línea temporal por fases con los hitos encima.
- Registro de sesiones con fecha, tipo, pilar, asistentes, acuerdos y siguientes pasos.
- Registro de dedicación de IWL y Niage por pilar en horas, para valorar el servicio prestado a cada compañía.

### 4.6 Update mensual y KPI

- Update mensual por compañía: KPI del mes, logros, bloqueos y peticiones a IWL. Recordatorio y fecha límite configurables.
- Núcleo común de KPI: ingresos · MRR · clientes activos · clientes de pago · pilotos activos · caja · burn mensual · runway · equipo. KPI por sector y propios.
- KPI técnicos que entran en el update desde el análisis automático: vulnerabilidades críticas abiertas, frecuencia de despliegue, disponibilidad, coste cloud mensual.
- Métricas derivadas: crecimiento mensual, runway en meses, conversión piloto a cliente, coste cloud sobre ingresos.
- Objetivo frente a real, con el objetivo fijado en el Anexo. Carga manual o por CSV.

### 4.7 Dashboard IWL

- Vista de cohorte: fila por compañía con fase, semáforo, score de preparación, score técnico, último update, runway e hitos cumplidos.
- Dashboard por compañía: KPI en el tiempo, due diligence general, scorecard técnico, plan técnico, hitos, sesiones y dedicación.
- Comparativa entre compañías en KPI comunes y dimensiones técnicas.
- Embudo hacia invertible según la definición de la sección 3, con objetivo interno de cohorte configurable.
- Alertas: update no entregado · runway bajo umbral · hito vencido · documento caducado · hallazgo crítico abierto · vulnerabilidad crítica nueva · secreto detectado · repositorio desconectado · reevaluación técnica pendiente. Umbrales configurables.

### 4.8 Informes

- Informe mensual por compañía en PDF, generado desde el update.
- Informe técnico Niage, versión interna y versión inversor.
- Informe de cohorte para el equipo IWL.
- Informe para terceros: IWL elige secciones y genera un enlace de solo lectura con caducidad.
- Exportación CSV y XLSX. SBOM exportable en formato SPDX o CycloneDX.

### 4.9 Transversales

Comentarios con menciones y notificación por correo · tareas por compañía con responsable y fecha · registro de actividad completo · buscador global para IWL.

## 5. Roles y permisos

| Rol | Alcance |
|---|---|
| admin_iwl | Todo, incluida la configuración |
| equipo_iwl | Todas las compañías. Revisa, valida, comenta, registra sesiones y hallazgos |
| revisor_niage | Compañías asignadas. Puntúa el due diligence técnico, registra hallazgos técnicos y el plan de trabajo, lanza análisis |
| fundadora | Solo su compañía. Edita, conecta repositorios, responde el cuestionario técnico. No valida ni puntúa sus propios puntos |
| mentor | Fase 2. Compañías asignadas y secciones que IWL comparta |
| lector_externo | Fase 3. Enlace de solo lectura con caducidad |

**Aislamiento estricto entre compañías**, con Row Level Security en base de datos y tests. Los resultados técnicos son la información más sensible de la plataforma: solo los ven la propia compañía, equipo_iwl y el revisor asignado.

## 6. Stack

| Capa | Elección |
|---|---|
| Aplicación | Next.js (App Router) con TypeScript |
| Interfaz | Tailwind CSS y shadcn/ui |
| Base de datos, auth y ficheros | Supabase: Postgres, Auth con enlace mágico, Storage, Row Level Security. Región UE |
| Worker de análisis | Contenedor Docker con las herramientas de 4.4, cola de trabajos en Postgres, desplegado en región UE (Fly.io o equivalente). Sin acceso a la base salvo por API con clave de servicio |
| Integración con repositorios | GitHub App propia de IWL con permisos de solo lectura. Token de GitLab como alternativa |
| Gráficos | Recharts |
| PDF | React PDF en servidor |
| Correo | Resend |
| Tests | Vitest, Playwright y tests de RLS contra Supabase local |
| Despliegue | Vercel en región UE |

Interfaz en español, preparada para inglés con i18n desde el inicio.

## 7. Modelo de datos base

`organizations` · `profiles` · `company_members` · `companies` · `cohorts` · `phases` · `pillars` · `company_pillars` · `annexes` · `milestones` · `bp_sections` · `bp_section_versions` · `hypotheses` · `evidence_links` · `dd_areas` · `dd_items` · `dd_item_status_history` · `documents` · `document_versions` · `findings` · `kpi_definitions` · `company_kpis` · `monthly_updates` · `kpi_values` · `sessions` · `time_entries` · `comments` · `tasks` · `alerts` · `share_links` · `activity_log`.

Due diligence técnico:

`tech_dimensions` · `tech_criteria` · `tech_stage_targets` (nivel objetivo por dimensión y etapa) · `tech_assessments` (una por evaluación, con fecha y revisor) · `tech_scores` (dimensión, nivel, evidencia, origen automático o manual) · `tech_questionnaire_answers` · `repo_connections` · `scan_runs` · `scan_results` · `sbom_components` · `tech_findings` · `tech_plan_items`.

Todas las tablas de negocio llevan `company_id`, `created_by`, `created_at`, `updated_at`.

## 8. Identidad visual

- Papel `#FFFFFF`. Texto en zinc: `#18181B` titulares y cuerpo, `#3F3F46` secundario, `#71717A` metadatos. Filetes `#E4E4E7`.
- Acento `#FF007A` solo en filetes y elementos gráficos. Texto pequeño en acento: `#D6005F`.
- Montserrat. Roboto Mono para cifras, métricas técnicas y metadatos.
- Símbolo W en magenta en la cabecera: `IWL_Simbolo_W_Magenta_ES_v1_20260914.png`.
- Interfaz sobria y densa en información. Sin emojis ni signos de exclamación.
- Semáforo y severidades siempre con texto, nunca solo color.

Textos de interfaz en la voz de IWL: afirmativa, directa, de par a par con la fundadora. «Siguiente paso» en lugar de «pendiente de corregir». Nunca «ayuda», «apoyo» ni «empoderar».

## 9. Fases de construcción

Cada fase termina desplegable y con tests pasando.

**Fase 1 · MVP**

1. Proyecto base, Supabase local, auth, roles y RLS con tests de aislamiento.
2. Configuración con datos semilla: fases, pilares, áreas, dimensiones técnicas con criterios y niveles objetivo, biblioteca de KPI.
3. Ficha de la compañía y cabecera.
4. **Due diligence técnico manual:** cuestionario, puntuación por dimensión, hallazgos, plan de trabajo, scorecard radar.
5. Due diligence general y data room con score de preparación.
6. Business plan con secciones, estados, versiones y comentarios.
7. Update mensual con KPI y métricas derivadas.
8. Dashboard IWL de cohorte y por compañía.

**Fase 2 · Análisis automático y operación**

9. GitHub App, conexión de repositorios y worker de análisis con las herramientas de 4.4.
10. Propuesta automática de puntuación, comparación entre ejecuciones, KPI técnicos en el update.
11. Informe técnico Niage en PDF, versión interna y versión inversor.
12. Anexo de Programa, hitos y línea temporal. Plan técnico enlazado a hitos.
13. Sesiones, dedicación por pilar y tareas.
14. Alertas y recordatorios por correo.
15. Informes mensual y de cohorte. Exportaciones.

**Fase 3 · Extensión**

16. Rol mentor y enlaces de solo lectura para terceros.
17. Con la API de Claude: resumen del update mensual, lectura del informe de análisis para proponer hallazgos, detección de incoherencias entre business plan, KPI y estado técnico.
18. Integraciones: contabilidad, CRM, ClickUp, proveedor cloud para coste real.

## 10. Datos semilla

Tres compañías ficticias de sectores distintos: una solo software, una con componente de IA y una con hardware. Fases distintas, seis meses de datos y un repositorio público de ejemplo para probar el análisis. Nunca nombres de compañías reales.

## 11. Criterios de aceptación

- Una fundadora solo accede a su compañía; lo prueban tests de RLS y de interfaz.
- Una fundadora no puede validar ni puntuar sus propios puntos.
- El score de preparación y el score técnico coinciden con el cálculo manual.
- El score técnico cambia al cambiar la etapa de la compañía, porque cambia el nivel objetivo.
- Un análisis de repositorio termina sin dejar código almacenado; lo prueba un test que revisa el contenedor y el Storage.
- Gitleaks detecta un secreto de prueba y la plataforma guarda tipo y ubicación, nunca el valor.
- Un hallazgo crítico abierto impide el estado invertible.
- Un KPI cargado aparece en dashboard, plan financiero e informe sin volver a introducirlo.
- La versión inversor del informe técnico no contiene hallazgos, solo scorecard, fortalezas, plan y estado.
- Vista fundadora usable en móvil. Datos, ficheros y worker en región UE.

## 12. Cómo trabaja Claude Code

- Lee este documento entero y propone el plan de la fase 1 antes de escribir código.
- Crea un `CLAUDE.md` en la raíz con el resumen de este documento, las convenciones del proyecto y los comandos de arranque y tests.
- Trabaja por pasos de la sección 9, con commit por paso y tests en cada uno.
- Mantiene `README.md` con arranque local, variables de entorno y despliegue, y `DECISIONES.md` con cada decisión técnica tomada.
- Si una decisión de producto no está aquí, la anota en `DECISIONES.md` con la opción elegida y sigue.
- Para el worker, primero un script local que analice un repositorio público y escriba un JSON de resultados. Cuando ese JSON sea estable, se conecta a la cola y a la base.
