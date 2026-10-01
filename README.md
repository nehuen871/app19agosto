# UTN FRBA

Primera etapa de la especificación: monorepo pnpm, PostgreSQL con migración versionada, API pública de noticias, lector móvil Expo y base visual del panel Next.js. Todo el tooling se ejecuta en Docker. `19Agosto/` se conserva sin cambios como proyecto original; el desarrollo activo está en `apps/`.

## Iniciar

Requisitos: Docker Desktop con Compose; no hace falta instalar Node ni pnpm en el host.

```sh
cp .env.example .env
docker compose up --build -d
docker compose exec api pnpm --filter @utn/api db:seed
```

- Panel inicial: http://localhost:3001/admin
- Expo web: http://localhost:8081
- API: http://localhost:4000/api/v1/news
- Salud (incluye PostgreSQL): http://localhost:4000/health
- Mailpit: http://localhost:8025 (preparado para la futura integración de correo).

La migración se aplica antes de iniciar la API. El seed es explícito, idempotente y carga una noticia claramente identificada como demostración. La base conserva datos en un volumen. `docker compose down` detiene servicios sin borrar datos.

Los puertos están limitados a localhost. Esta configuración es de desarrollo, sin TLS; no desplegarla directamente en producción. La contraseña predeterminada es exclusivamente local. Los dominios UTN permanecen sin definir hasta su confirmación; todavía no hay registro ni autenticación institucional; el administrador local tiene acceso con clave.

## Desarrollo y validación

Los directorios de código están montados para recarga automática. Ante cambios de dependencias, configuración o Prisma, reconstruir la imagen. No usar npm/pnpm del host.

```sh
docker compose exec api pnpm typecheck
docker compose exec api pnpm lint
docker compose exec api pnpm test
docker compose exec admin pnpm --filter @utn/admin build
docker compose exec mobile pnpm --filter @utn/mobile export:web
docker compose logs -f api admin mobile
```

Los tests de integración crean registros aislados con identificadores aleatorios y los eliminan al terminar; nunca deben ejecutarse contra producción.

Para actualizar el lockfile después de editar un manifiesto:

```sh
docker run --rm -v "$PWD:/workspace" -w /workspace node:22-bookworm-slim sh -c 'npx --yes pnpm@10.28.2 install --lockfile-only'
docker compose up --build -d
```

## Mobile

La nueva app usa Expo SDK 57 / React Native 0.86 con las versiones de la matriz oficial de Expo. Mobile y panel comparten React 19.2.3 para evitar duplicados incompatibles. El proyecto original en `19Agosto/` conserva su SDK 52 sin modificaciones. Expo y Metro corren en Docker; los emuladores y dispositivos físicos se ejecutan fuera del contenedor. La compilación nativa iOS requiere macOS/Xcode o un servicio de build y no funciona dentro de contenedores Linux.

Para un dispositivo físico se necesita una development build compatible con SDK 57. Configurar `EXPO_PUBLIC_API_URL` y `REACT_NATIVE_PACKAGER_HOSTNAME` con la IP LAN del host y publicar 4000/8081 en esa interfaz usando un override local de Compose; ajustar también CORS para otros orígenes web. Por defecto sólo está habilitado el acceso local y Expo web. La verificación en Android/iOS reales queda pendiente.

## Contratos implementados

- `GET /api/v1/news?page=1&limit=20&category=institucional&featured=true`: resultados paginados; límite 100.
- `GET /api/v1/news/:slug`: detalle de una noticia publicada.
- `GET /api/v1/categories`: categorías ordenadas por nombre.

Borradores, archivadas y noticias con fecha futura no se exponen. Validación con Zod, Helmet, CORS explícito, rate limiting y errores estructurados. El panel es una vista de comprobación pública, no un ABM habilitado sin permisos.

## Siguientes etapas

1. Usuarios, verificación institucional, sesiones y recuperación; integración SMTP con Mailpit y permisos backend.
2. ABM de noticias/categorías, autoría y auditoría; formularios validados.
3. Dispositivos, preferencias, historial y envío de push independiente de publicación.
4. Ampliar el design system, filtros visuales, pruebas de interfaz y validación en dispositivos.

El esquema Prisma contiene sólo las entidades de esta entrega. Los demás modelos y flujos de la especificación aún no están implementados. La identidad visual sigue la sección 20 de `especificacion_app_utnfrba_identidad_visual.md`: paleta oficial, Archivo Black para títulos y Libre Franklin para cuerpo/controles. Los tokens están centralizados en `packages/design-tokens`. Las fuentes TTF se sirven localmente desde `packages/brand-assets/fonts`, con sus licencias OFL (origen: https://github.com/expo/google-fonts). No se necesitan solicitudes a Google Fonts en tiempo de ejecución. Archivo y Libre Baskerville quedan definidos para futuras variantes, sin cargarlos en pantallas que no los usan.

Faltan los archivos oficiales de logo/isotipo/isologo. Sus placeholders semánticos están en `packages/brand-assets/`; las barras muestran identificación textual discreta, sin imitar el logo. Las marcas futuras deben conservar sus proporciones y el padding de seguridad. El modo oscuro tiene tokens preparados y no está activado.

Validación visual: TypeScript, lint y compilaciones web en Docker; revisión en Chromium de 320/375/820/1440 px, carga de las tres variantes de fuente y navegación a detalle, sin desbordamiento horizontal. Contraste calculado: blanco/azul 6,77:1; negro/amarillo 8,44:1; negro/fondo editorial 14,58:1. La comprobación en dispositivos Android/iOS reales queda pendiente.

Compatibilidad consultada: [Prisma 7](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7) [Next.js](https://nextjs.org/docs/app/getting-started/installation) y [Expo en monorepos](https://docs.expo.dev/guides/monorepos/). Se usa Node 22 y el adaptador PostgreSQL requerido por Prisma 7. El lockfile fija las resoluciones estables.

## Auditoría de dependencias

Auditoría del lockfile del 30-09-2026: `pnpm audit --prod` reportó 5 avisos transitivos (2 altos, 3 moderados; ninguno crítico). Paquetes afectados: `deepmerge-ts`, `mysql2`, `uuid` y `decode-uri-component`. Los parches de algunos paquetes requieren cambios mayores; no se forzaron overrides incompatibles. Revisar y resolver estos avisos antes de producción, junto con la auditoría completa de dependencias de desarrollo. La app utiliza PostgreSQL, no MySQL, pero el paquete transitivo igualmente está incluido en la imagen de desarrollo.

```sh
docker compose exec api pnpm audit
```

## Cargar notificaciones

Abrir http://localhost:3001/admin/notifications o el enlace **Notificaciones** del menú. El panel redirige a `/admin/login` si no hay sesión. Ingresar el valor de `ADMIN_ACCESS_TOKEN` del archivo local `.env`; es una clave aleatoria de al menos 32 caracteres, nunca debe subirse a Git. La instalación actual ya tiene una clave generada. Para instalaciones nuevas, definir una clave aleatoria en `.env` antes de iniciar Compose; sin ella los endpoints administrativos permanecen deshabilitados.

El formulario permite cargar título (100 caracteres), mensaje (500) y una noticia opcional entre las últimas 20 publicaciones. Se guarda como **DRAFT**, con historial paginado y auditoría `NOTIFICATION_CREATED`. Guardar **no envía push**; el envío, dispositivos y destinatarios todavía no están implementados.

- `GET /api/v1/admin/notifications?page=1&limit=20`
- `POST /api/v1/admin/notifications` con `{title, body, newsId?}`

Ambos endpoints requieren `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`. El navegador recibe una cookie HttpOnly/SameSite=Strict firmada que vence a las 8 horas; la clave sólo se utiliza en el servidor al llamar a la API. Las acciones del panel comprueban sesión antes de guardar, y Next.js comprueba el origen de sus Server Actions. La cookie usa Secure en producción. Cerrar sesión borra la cookie; cambiar la clave invalida todas las sesiones después de recrear los contenedores.

Este acceso es un bootstrap para administración local: el actor de auditoría es `local-admin`. No sustituye el futuro modelo de usuarios, roles USER/EDITOR/ADMIN y sesiones revocables de la especificación, que debe incorporarse antes de habilitar administración multiusuario en producción.
