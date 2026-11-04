# Archivos y registro

Versión 1 · 4 nov 2026 · para Rodrigo

Qué pasa con un archivo desde que alguien lo sube hasta que alguien lo
consulta un año después. Está escrito para leerlo entero en cinco minutos y
poder contestar a una fundadora, a un inversor o a un auditor sin llamar a
nadie.

Al final hay una lista de **lo que todavía no existe**, separada de lo que sí.
Ninguna de las dos cosas se mezcla con la otra: si algo no está, aquí lo
pone.

---

## 1. Dónde se guarda

Los archivos no están en la base de datos. Están en un almacén aparte,
dividido en cuatro cajones, y **ninguno de los cuatro es público**: no hay
dirección de internet que abra un archivo sin pasar por la plataforma.

| Cajón | Qué guarda | Tamaño máximo | Formatos |
|---|---|---|---|
| **data-room** | Todo lo del due diligence y del business plan | Sin límite declarado | Cualquiera |
| **candidaturas** | Lo que entrega quien se presenta, antes de ser compañía | 50 MB | Cualquiera |
| **logos** | El logotipo de cada compañía | 2 MB | PNG, JPEG, WebP, SVG |
| **personas** | Currículos del equipo | 10 MB | PDF y Word |

Dentro del data room, cada archivo va en una ruta que empieza por el
identificador de su compañía. Eso no es orden: es la frontera. Las reglas de
acceso se apoyan en esa primera carpeta, así que un archivo no puede
«escaparse» a otra compañía sin cambiar de sitio.

**Cómo se abre un archivo.** La plataforma no enseña la dirección del
archivo: pide un **enlace firmado** que caduca a los pocos minutos y lo abre.
Un enlace copiado y enviado por correo deja de funcionar solo. Es lo que hace
que compartir un documento sea una decisión y no un descuido.

---

## 2. Cómo se versiona

Un documento es una ficha —nombre, carpeta, área, caducidad— y cada archivo
que se sube es una **versión numerada** de esa ficha. Subir uno nuevo no
borra el anterior: añade la versión siguiente.

De cada versión queda el número, el nombre original del archivo, su tipo, su
tamaño, quién la subió y cuándo.

**Lo que se enseña es la última.** Las anteriores siguen guardadas y se
pueden recuperar.

**Un documento puede caducar.** Si tiene fecha de caducidad y esa fecha pasa,
la plataforma lo marca como vencido en rojo y el punto del checklist al que
estaba enlazado deja de contar como entregado. No se borra nada: se dice que
hay que renovarlo.

---

## 3. Quién puede verlo

Lo decide la base de datos, no la pantalla. Un botón que no debería estar ahí
daría un error en vez de abrir el archivo.

| Quién | Qué ve del data room |
|---|---|
| Dirección y equipo de IWL | Todo, de todas las compañías |
| Ingeniería de Niage | Solo las compañías que tiene asignadas |
| Mentor que coordina | Solo su compañía |
| Mentor de apoyo | Su compañía, **sin el due diligence general** |
| Equipo fundador | Solo lo de su propia compañía |
| Lector externo | Su compañía, en solo lectura |
| Candidata | Solo lo suyo, y solo mientras es candidatura |

Si un mentor de apoyo necesita un documento concreto, IWL se lo comparte. No
se le abre la carpeta entera.

---

## 4. Qué queda registrado

Dos registros distintos, y conviene no confundirlos.

**El registro de actividad** anota los cambios: quién, cuándo, sobre qué, qué
acción y el detalle. Hoy tiene 209 anotaciones. Ahí van los cambios de estado
de un punto de due diligence, la reapertura de un mes de KPI, el borrado de
una compañía y los ficheros que no se pudieron borrar con ella.

**El registro de accesos a documentos** anota las consultas: quién abrió qué
documento y cuándo. La tabla existe y **está vacía**: nadie escribe en ella
todavía. Está en la lista de lo que falta.

Además, algunos datos llevan su propio rastro dentro de su pantalla, porque
es donde se miran:

- **Correcciones de KPI**: valor anterior, valor nuevo, quién y cuándo, en el
  historial del mes. Lo escribe la base de datos sola, no la pantalla, así
  que una corrección hecha por cualquier otro camino tampoco se escapa.
- **Validaciones del due diligence**: cada cambio de estado de un punto queda
  con su fecha y su autor.
- **Puntuaciones técnicas**: cada una exige una evidencia escrita. Una
  puntuación sin evidencia no se guarda; no es una recomendación, la base la
  rechaza.

---

## 5. Cuánto tiempo se guarda

**No hay plazo declarado.** Hoy no se borra nada nunca, salvo cuando se borra
una compañía entera a propósito, y entonces se va todo con ella: documentos,
versiones, archivos y registro.

Esto es una decisión pendiente, no un olvido, y conviene tomarla pronto:
un registro de quién abrió la historia clínica de qué paciente sin plazo
declarado es exactamente el hallazgo que la plataforma le marcó a Marea
Clínica. Lo que se pide a las participadas se pide también aquí.

---

## 6. Cómo se consulta

- **El data room**, en Due diligence general: la lista de documentos con su
  carpeta, su caducidad y el botón de abrir.
- **El historial de correcciones de KPI**, en KPI y updates, plegado.
- **El registro de actividad: no se consulta desde la plataforma.** Se escribe
  y no hay ninguna pantalla que lo lea. Está en la lista de lo que falta.

---

## 7. Lo que no existe todavía

Esto es lo que hay que decidir o construir. Mi propuesta al lado de cada
cosa; la decisión es tuya.

1. **Nadie anota quién abre un documento.** La tabla está y está vacía.
   *Propongo* escribir una línea cada vez que se pide un enlace firmado. Es
   el sitio por el que pasan todas las aperturas, así que no se escapa
   ninguna.
2. **El registro de actividad no se puede leer desde la plataforma.**
   *Propongo* una pantalla en Administración con filtro por compañía y por
   fecha, y, en cada ficha, las últimas diez líneas de lo que le ha pasado.
3. **No hay plazo de conservación.** *Propongo* declarar uno por tipo: los
   documentos del Acuerdo mientras dure la relación más seis años, el
   registro de accesos dos años, el de actividad mientras exista la
   compañía. Hace falta que lo fijes tú.
4. **Las versiones anteriores no se pueden descargar desde la pantalla.** Se
   guardan todas y solo se enseña la última. *Propongo* un plegable «versiones
   anteriores» en cada documento.
5. **No hay forma de borrar un archivo concreto**, solo la compañía entera.
   *Propongo* dejarlo así: borrar un documento suelto de un expediente es
   justo lo que un registro no debería permitir sin dejar rastro.
6. **El data room no tiene límite de tamaño por archivo.** Los otros tres
   cajones sí. *Propongo* 50 MB, el mismo que candidaturas.
7. **No hay antivirus ni comprobación del contenido** de lo que se sube.
   *Propongo* dejarlo anotado como riesgo conocido: con el volumen actual no
   compensa, y conviene que esté escrito antes de que alguien lo pregunte.

---

## 8. Qué significa esto para `<Evidencia>`

La pieza que falta en casi todas las pantallas —adjuntar algo al cambiar un
estado, al puntuar una dimensión, al registrar un avance— se apoya en todo lo
anterior y no inventa nada nuevo:

- **Subir un archivo** crea un documento y su primera versión en el data room
  de esa compañía, con las mismas reglas de acceso que el resto.
- **Elegir uno que ya está** enlaza al documento existente, sin duplicarlo.
  Un mismo contrato puede ser la evidencia de tres cosas distintas.
- **Pegar un enlace** guarda la dirección y su rótulo. Para lo que vive fuera:
  un repositorio, un panel, un acta.

Las tres dejan la misma anotación en el registro de actividad: quién, cuándo,
sobre qué y con qué evidencia.

**Lo único que `<Evidencia>` necesita y hoy no está** es poder enlazar una
evidencia a un hito, a una tarea o a un punto del checklist: la tabla que
guarda los enlaces solo contempla hipótesis y secciones del business plan.
Es una columna más y una regla de acceso; va en el mismo cambio.

---

**Qué necesito de ti**: los puntos 1, 2, 3 y 6 del apartado 7. Los demás son
propuestas que puedo ejecutar sin que decidas nada.
