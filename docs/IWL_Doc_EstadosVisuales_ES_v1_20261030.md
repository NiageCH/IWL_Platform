# Plataforma IWL · estados visuales

Versión 1 · 30 oct 2026 · Inception Woman Lab

Un solo lenguaje de estado para toda la plataforma y los tres públicos: fundadora, IWL y mentor. Se ve el estado antes de leer nada. Sustituye a los tonos sueltos que hay hoy (cielo, lila, menta, durazno, ok, warn, crit).

---

## 1. Cinco estados, nada más

| Estado | Color | Icono (Lucide) | Significa |
|---|---|---|---|
| **Hecho** | Verde | `CircleCheck` | Validado, cumplido, resuelto |
| **En curso** | Azul | `CircleDashed` | Se está trabajando o está en revisión |
| **Por hacer** | Gris | `Circle` | Aún no empieza y no corre prisa |
| **Atención** | Ámbar | `Clock` | Vence en 7 días o menos, o va por debajo del objetivo |
| **Vencido** | Rojo | `CircleAlert` | Fuera de fecha o bloqueante |

Y uno neutro, **No aplica**: gris claro con `CircleSlash`, para descartado o fuera de alcance.

Los cinco van **siempre con icono y palabra**. El color ayuda; nunca es la única señal.

## 2. Tokens

| Estado | Relleno sólido | Texto | Fondo suave |
|---|---|---|---|
| Hecho | `#16A34A` | `#15803D` | `#DCFCE7` |
| En curso | `#2563EB` | `#1D4ED8` | `#DBEAFE` |
| Por hacer | `#71717A` (solo contorno) | `#3F3F46` | `#F4F4F5` |
| Atención | `#D97706` | `#B45309` | `#FEF3C7` |
| Vencido | `#DC2626` | `#B91C1C` | `#FEE2E2` |

Contraste comprobado: texto sobre su fondo ≥ 4,5 : 1; relleno sólido sobre blanco ≥ 3 : 1.

Reglas de color:
· **El magenta no es un estado.** Es marca: navegación, enlaces y acción principal. Nunca pinta un estado.
· **El azul existe solo para «En curso».** No se usa en enlaces, botones ni gráficos.
· Fuera los tonos decorativos de los iconos de sección: los iconos de navegación van en gris.

Variables: `--estado-hecho`, `--estado-curso`, `--estado-pendiente`, `--estado-atencion`, `--estado-vencido`, cada una con `-texto` y `-fondo`. Un componente `<Estado valor="…">` y una función `estadoVisual(entidad, fila)` en `lib/estados.ts` que traduce cualquier estado de la base a uno de los cinco. Ninguna pantalla decide colores por su cuenta.

## 3. Cada cosa, a cuál de los cinco

| Elemento | Hecho | En curso | Por hacer | Atención | Vencido |
|---|---|---|---|---|---|
| Hito | Cumplido | En curso | Pendiente, fecha lejana | Vence ≤ 7 días | Retrasado |
| Paso de hito · tarea | Hecha | En curso | Pendiente | Vence ≤ 7 días | Vencida |
| Punto de due diligence | Validado | Entregado · en revisión | Pendiente | Vence ≤ 7 días | Bloqueante · caducado |
| Sección del business plan | Validada | Para revisar · en revisión | Borrador | Comentario sin responder | Sin tocar y con fecha pasada |
| Update mensual | Revisado | Enviado | Aún no abierto | Abierto, vence ≤ 7 días | No entregado |
| KPI frente a objetivo | En objetivo | Sin objetivo fijado | Sin dato | Hasta 20 % por debajo | Más de 20 % por debajo |
| Hallazgo técnico | Resuelto | En resolución | Medio · bajo abierto | Alto abierto | Crítico abierto |
| Tramo de la hoja de ruta | Completado | En curso | Planificado | En riesgo | Retrasado |
| Compañía (semáforo) | En plazo | En diagnóstico | Por empezar | Algo en ámbar | Algo en rojo |

Una compañía toma el peor estado de lo que tiene abierto, con el motivo escrito al pasar el ratón.

## 4. Menos texto

1. **Primero la forma, después la palabra.** Cada bloque abre con algo que se ve: barra, puntos, cifra. El texto explicativo va detrás de un `?` o al pasar el ratón.
2. **Barra segmentada para todo conjunto.** Un segmento por elemento, coloreado por estado. «29 puntos de due diligence» se ve como 29 cuadrados: cuántos verdes, cuántos rojos, de un vistazo. Pulsar un segmento abre ese elemento.
3. **Recorrido como línea de puntos.** Tramos y hitos como puntos sobre una línea, con el color de su estado y «estás aquí» marcado.
4. **Títulos de cuatro palabras como máximo.** Sin subtítulo si el título se entiende solo.
5. **Cifras grandes, rótulos pequeños.** «3 de 5» en grande; «condiciones cumplidas» debajo, en pequeño.
6. **Nada de párrafos en pantalla.** Lo que hoy es un párrafo pasa a una línea, a un `?` o desaparece.
7. **Leyenda una sola vez**, en la barra lateral o al pie: los cinco estados con su icono. Igual en todas las pantallas y para todos los roles.

## 5. Criterios de aceptación

- Ningún componente usa un color de estado fuera de `<Estado>` o de `estadoVisual`.
- Los cinco estados se ven iguales para fundadora, IWL y mentor.
- Ningún icono de navegación lleva color.
- Ninguna pantalla tiene un párrafo de más de dos líneas visible sin pulsar.
- Due diligence, hitos, pasos y business plan abren con su barra segmentada.
- Con escala de grises activada, cada estado se distingue por su icono.
