# Poner la plataforma en internet

Para que unas cuantas personas la prueben sin tener que instalarse nada. Todo
lo que hay aquí cabe en los planes gratuitos de Supabase y Vercel: **0 € al
mes** con esta carga.

Tiempo: unos cuarenta minutos, casi todos esperando.

---

## Antes de empezar

Necesitas una cuenta en [supabase.com](https://supabase.com) y otra en
[vercel.com](https://vercel.com). Las dos se crean entrando con GitHub.

Ten a mano la contraseña que vayas a poner a la base de datos. Anótala en un
gestor de contraseñas: **Supabase no la vuelve a enseñar**.

---

## 1 · La base de datos

En Supabase, **New project**:

| Campo | Qué poner |
|---|---|
| Name | `iwl-plataforma` |
| Database Password | Genérala con el botón y guárdala |
| **Region** | **Frankfurt (eu-central-1)** |
| Plan | Free |

La región importa: el documento de alcance pide datos y ficheros en la UE, y
esto no se puede cambiar después sin rehacer el proyecto.

Tarda unos dos minutos en levantarse.

Cuando esté, ve a **Project Settings → API** y copia tres cosas:

- **Project URL** — algo como `https://abcdefgh.supabase.co`
- **anon public** — la clave pública
- **service_role** — la clave de servicio. **Esta no sale nunca del servidor**:
  con ella se puede leer y escribir todo saltándose los permisos.

## 2 · Subir el esquema

Desde tu portátil, en la carpeta del proyecto:

```bash
npx supabase login
npx supabase link --project-ref <la-referencia-de-tu-proyecto>
npx supabase db push
```

La referencia es lo que aparece en la dirección del panel de Supabase, entre
`/project/` y la siguiente barra.

`db push` aplica las migraciones en orden. **No sube los datos semilla**: eso
es el paso 4, y es a propósito, porque los proyectos reales no están en el
repositorio.

## 3 · Ajustar el acceso

En el panel de Supabase, **Authentication → Sign In / Providers**:

- **Email** activado
- **Confirm email** desactivado — las cuentas las crea la dirección de IWL y
  ya nacen confirmadas
- **Allow new users to sign up** **desactivado**. Esto es lo primero que hay
  que tocar, antes de desplegar nada: un proyecto de Supabase **nace con el
  registro abierto**, y aquí está el due diligence de la cohorte. Se
  comprueba sin entrar al panel:

  ```bash
  curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | grep disable_signup
  ```

  Tiene que decir `"disable_signup": true`

En **Authentication → URL Configuration**:

- **Site URL**: la dirección que te dé Vercel en el paso 5
- **Redirect URLs**: añade `https://<tu-dominio>/auth/confirmar`

Eso solo hace falta para los enlaces de «no recuerdo mi contraseña». Con
contraseña no se usa.

## 4 · Llevar los datos

```bash
npm run sembrar:nube
```

Te pedirá confirmación y usará el proyecto que enlazaste en el paso 2. Sube:

- la configuración del programa: fases, pilares, áreas, dimensiones técnicas,
  KPI, tarifas y recorridos
- lo que tengas en `supabase/seed/local/`: el equipo de IWL y los proyectos
  reales

**No sube las compañías de demostración.** En una instalación de trabajo
estorban, y el repositorio las lleva solo porque las pruebas se apoyan en
ellas.

### Cambiar las contraseñas antes de nada

Los seeds locales crean al equipo con **una contraseña fija escrita en el
propio fichero**. En el portátil de cada cual eso es cómodo y no expone nada.
En un proyecto de la nube con dirección pública es una puerta abierta: la
misma clave para todo el equipo, dirección incluida, y en un archivo.

Así que no se sigue sin pasar por aquí:

```bash
SUPABASE_URL=https://<referencia>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<clave service_role> \
  node scripts/claves.mjs
```

Le pone a cada cuenta una contraseña distinta y deja la tabla en
`.accesos-nube.md`, que está en `.gitignore`. Repártela y **borra el
fichero**. Cada persona puede cambiar la suya desde Mi cuenta, y desde
**Administración → Personas** se le puede poner otra.

Si no hay seeds locales y la base se queda vacía de personas, la primera
cuenta —que tiene que ser de dirección, porque es quien puede crear a las
demás— se da de alta así:

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node scripts/alta.mjs tu@correo.com admin_iwl "" "" "Tu Nombre"
```

## 5 · La aplicación

En Vercel, **Add New → Project** y elige el repositorio `IWL_Platform`.

Vercel detecta Next.js solo. Lo único que hay que darle son las variables de
entorno, en **Environment Variables**:

| Nombre | Valor | Dónde |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | La Project URL del paso 1 | Todos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave `anon public` | Todos |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave `service_role` | **Solo Production** |

La tercera es la delicada. Vercel la guarda cifrada y no la expone al
navegador —no lleva el prefijo `NEXT_PUBLIC_`, que es lo que decide eso— pero
aun así conviene no ponerla en los entornos de vista previa: cualquiera con
acceso al repositorio puede desplegar una rama.

**Deploy**. Tarda unos tres minutos.

Cuando termine, copia la dirección que te da y vuelve al paso 3 para ponerla
como Site URL.

## 6 · Comprobar

Entra con la cuenta de dirección y repasa:

- [ ] La cartera enseña los proyectos
- [ ] Administración → Personas lista al equipo
- [ ] Poner una contraseña a alguien y entrar con ella en una ventana privada
- [ ] Esa persona solo ve lo suyo
- [ ] Un informe se abre y se imprime

Y una comprobación que conviene hacer una vez: intenta registrarte desde una
ventana privada en `https://<tu-dominio>/entrar`. No debe haber forma.

---

## Lo que cuesta

Los planes gratuitos dan de sobra para una cohorte pequeña: 500 MB de base de
datos, 1 GB de ficheros y 100 000 usuarios activos al mes en Supabase; 100 GB
de tráfico en Vercel.

Lo primero que se quedará corto es el almacenamiento de la sala de datos, y
para eso faltan muchos documentos.

**Supabase suspende los proyectos gratuitos que pasan una semana sin
actividad.** Se reactivan solos al entrar, pero la primera visita después
tarda. Si la prueba va a durar, el plan Pro son 25 $ al mes y lo quita.

## Lo que falta para dejarlo en producción de verdad

Esto es una prueba. Antes de que entre gente de fuera de IWL:

- **Un proveedor de correo.** Sin él no funcionan los enlaces de recuperación
  ni las alertas del paso 14. Resend tiene plan gratuito y se configura en
  Authentication → Emails.
- **Un dominio propio.** Se añade en Vercel y se cambia la Site URL.
- **Copias de seguridad.** El plan gratuito de Supabase no las hace. El Pro
  guarda siete días.
- **Que cada persona cambie su contraseña.** Mientras no lo haga, la
  dirección la conoce. Está en Mi cuenta, y la plataforma lo dice ahí.
