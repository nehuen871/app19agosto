# Validación de adaptación a los skills

Validación local del 5 de octubre de 2026 en el proyecto Compose aislado `utnskills`, con secretos temporales y puertos 14000/13001. No se modificaron los datos del proyecto anterior.

## Aprobado

- Instalación `pnpm install --frozen-lockfile` durante los builds.
- Lint y TypeScript de API, panel, mobile y paquetes compartidos.
- Suite completa: 16 tests aprobados, incluidos 7 nuevos de salud y seguridad.
- Imágenes de producción API y Next.js standalone construidas.
- Compose validado; dos migraciones aplicadas en una base nueva.
- API, panel y PostgreSQL saludables, con smoke sobre puertos publicados.
- API ejecutada como usuario `node`, filesystem de solo lectura, capacidades eliminadas y no-new-privileges.
- SIGTERM: cierre registrado y salida de API con código 0.
- Recreación de PostgreSQL: las dos migraciones permanecen en el volumen.
- Sintaxis shell y `git diff --check` aprobados.

## Gates pendientes

`pnpm audit --prod --audit-level high` devuelve error: 4 avisos altos y 3 moderados. El resumen del registro npm indica:

| Dependencia transitiva | Severidad | Versión corregida informada |
| --- | --- | --- |
| uuid | Moderada | >=11.1.1 |
| deepmerge-ts | Alta | >=8.0.0 |
| decode-uri-component | Moderada | >=0.5.0 |
| mysql2 | Alta y moderada | >=3.23.1 para ambos avisos |
| node-forge | Alta | Sin corrección informada |
| braces | Alta | Sin corrección informada |

Los avisos llegan por Prisma CLI y las herramientas de Expo. No se aplicaron overrides de versiones mayores sin probar compatibilidad. Las imágenes de aplicación excluyen las herramientas de build; el servicio migrador sí contiene Prisma CLI. El gate del monorepo sigue fallando y no se declara producción aprobada.

Docker Scout está instalado. Los intentos de escanear API y panel fallaron porque requieren iniciar sesión en Docker. Queda pendiente el escaneo de ambas imágenes.

El procedimiento de backup/restore está documentado en `operaciones.md`; la restauración periódica sigue siendo una tarea operativa pendiente. Autenticación institucional, roles y envío push continúan pendientes del MVP original.
