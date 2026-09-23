# DECISIONES.md

Registro de decisiones técnicas y de producto. Una entrada por decisión, con fecha, opción elegida y motivo.
Cuando algo no está resuelto en `IWL_Doc_EspecPlataformaSeguimiento_ES_v2_20260923.md`, se decide aquí y se sigue.

---

## 2026-09-23 · Gestor de paquetes: npm

El documento no fija gestor. `pnpm` no está instalado en la máquina de desarrollo; `npm` 11 sí. Se usa npm y se versiona `package-lock.json`.

## 2026-09-23 · Next.js 16 con Turbopack

`create-next-app` instala Next 16.3.6 y React 19.2. Implicaciones que afectan a cómo se escribe el código en este repositorio:

- Turbopack es el compilador por defecto en `next dev` y `next build`. No se añade configuración de webpack.
- **APIs de request asíncronas.** `cookies()`, `headers()`, `draftMode()`, y `params` y `searchParams` en páginas y layouts son promesas. Siempre `await`.
- **`middleware.ts` se llama ahora `proxy.ts`**, con función exportada `proxy` y runtime Node.js fijo. Ahí va el refresco de sesión de Supabase.
- Tipos de ruta generados: se usan los helpers globales `PageProps<'/ruta'>`, `LayoutProps<'/ruta'>` y `RouteContext<'/ruta'>` en lugar de tipar props a mano.
- `next lint` ya no existe. El script `lint` invoca ESLint directamente con la configuración plana.
- `revalidateTag` exige segundo argumento (perfil de `cacheLife`). Para escrituras con lectura inmediata del propio cambio se usa `updateTag` dentro de Server Actions.

## 2026-09-23 · `@types/node` en ^24

El scaffold fija `@types/node@^20`, que entra en conflicto con el peer de Vitest 5 (`^22 || >=24`). Se sube a `^24`, alineado con el Node 24 de desarrollo y con el runtime de Vercel.

## 2026-09-23 · Sin modo oscuro

La identidad de IWL (§8) es papel blanco con texto en zinc. Un modo oscuro obligaría a una segunda paleta que el documento no define y que cambiaría el uso del acento magenta. Se fija `color-scheme: light` y se retira el bloque `prefers-color-scheme` del scaffold. Si más adelante se quiere, se decide paleta antes de implementarlo.

## 2026-09-23 · Tokens de color con nombre en español

Los colores se exponen en Tailwind como `papel`, `titular`, `secundario`, `metadato`, `filete`, `acento` y `acento-texto`, no como `primary`/`muted`. El nombre dice el papel que cumple el color en la identidad de IWL, lo que evita que el acento magenta se use como color de fondo o de texto grande, que es justo lo que el documento prohíbe.

## 2026-09-23 · Supabase solo en local durante la fase 1

Decidido con Rodrigo. Migraciones y datos semilla versionados en el repositorio, base levantada con `supabase start` sobre Docker. El proyecto cloud en región UE se crea cuando haya algo que enseñar. Consecuencia: ninguna credencial real entra en el repositorio durante esta fase.
