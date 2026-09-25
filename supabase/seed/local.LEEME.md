# Semillas locales

`supabase/seed/local/*.sql` se aplica al final de `npm run db:reset` y **no se versiona**.

Es donde van los proyectos reales: un Anexo firmado lleva importes, tarifas y porcentaje de equity, y eso son condiciones comerciales de un acuerdo entre dos partes. El documento de alcance además dice, para los datos semilla versionados, «nunca nombres de compañías reales».

Los ficheros se aplican por orden alfabético, después de los cuatro versionados. Numéralos a partir de 10 para dejar sitio.

Si el directorio está vacío no pasa nada: el glob no encuentra nada y el reset sigue.

Para cargar un proyecto real hacen falta, en este orden: la compañía y su equipo, el Anexo con su compromiso, los pilares y los hitos acordados, los KPI que se van a seguir, y la línea base cuando el due diligence técnico esté hecho.
