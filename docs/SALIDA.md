# Antes de cargar la primera startup real

Lo que hay que hacer, en este orden, el día que se deje de trabajar con datos
de prueba en producción. Se añade aquí cada paso que dependa de ese día.

1. **Borrar los datos de prueba de producción**: compañías, candidaturas y
   cuentas de prueba, con sus ficheros. Antes, una copia de la base.
2. **Revisar Administración → Correos**: lo retenido por el modo pruebas no
   se envía nunca; si algo de ahí debía llegar a alguien de verdad, se le
   manda a mano.
3. **Quitar el modo pruebas del correo**, en Administración → Programa →
   «Modo pruebas del correo» → «Quitar el modo pruebas», escribiendo
   `ACTIVAR CORREOS`. Queda en el registro quién y cuándo. Desde ese momento
   los correos salen a cualquier dirección y el resumen diario a todo el que
   lo tenga en «Cada mañana».
4. **Comprobar con una cuenta real de fuera de IWL** que le llega un correo
   (por ejemplo, «¿Has olvidado tu contraseña?»).
