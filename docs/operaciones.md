# Operación y recuperación

## Base de datos

Antes de migraciones destructivas o de alto riesgo: guardar respaldo, probar restauración y preparar una migración correctiva o rollback compatible. No usar `prisma db push` en producción.

Crear respaldo del proyecto activo (no incluye secretos en argumentos):

```sh
docker compose -f compose.yaml -f compose.prod-local.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backup.dump
```

Restaurar periódicamente en una base vacía y descartable. Nunca restaurar sobre la base operativa sin autorización:

```sh
# Crear primero restore_test en un PostgreSQL aislado y copiar backup.dump.
pg_restore --exit-on-error --no-owner --dbname=restore_test backup.dump
```

Verificar migraciones, conteos y consultas funcionales en la restauración. Guardar respaldos cifrados fuera del host, con retención y controles de acceso acordados.

## Release

Construir imágenes y conservar sus etiquetas inmutables antes de desplegar. Ejecutar lint, typecheck, tests en base aislada, auditoría y escaneo de imágenes. Aplicar migraciones en base limpia de prueba y verificar healthchecks, smoke, cierre SIGTERM y persistencia al recrear contenedores sin borrar volúmenes.

Rollback: volver a las imágenes anteriores únicamente si el esquema sigue siendo compatible. Ante un cambio incompatible, usar la migración correctiva previamente probada; restaurar un respaldo implica pérdida de cambios posteriores y requiere aprobación. Conservar el respaldo y la versión de migraciones de cada release.

El panel requiere una sesión de Google con propósito ADMIN, rol ADMIN, cuenta sin bloqueo y correo autorizado en ADMIN_GOOGLE_EMAILS. El ingreso por clave compartida fue eliminado. La preparación completa para producción requiere las verificaciones documentadas en docs/login-google.md.
