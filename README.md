# UTN FRBA

Monorepo pnpm: API Express + Prisma/PostgreSQL, panel Next.js y app Expo.
Especificación: [docs/especificacion_app_utnfrba_identidad_visual.md](docs/especificacion_app_utnfrba_identidad_visual.md).
Los siete skills del proyecto están en `.agents/skills/`.

## Producción local

1. Copiar `.env.example` a `.env`. Completar `POSTGRES_PASSWORD` y `ADMIN_ACCESS_TOKEN` (mínimo 32 caracteres aleatorios). Para la contraseña de PostgreSQL usar caracteres seguros para URL o codificarlos en la conexión.
2. Ejecutar `./prod-local.sh`: construye imágenes, aplica migraciones y espera los healthchecks.
3. Ejecutar `./smoke.sh`. API: `http://localhost:4000`; panel: `http://localhost:3001`.

Las imágenes de aplicación usan Node 22, usuario sin privilegios, filesystem de solo lectura y `/tmp` temporal. La API se compila en un bundle; Next.js utiliza standalone. Los compiladores y pnpm quedan fuera de las imágenes de aplicación. El servicio `migrate` contiene Prisma CLI y ejecuta `prisma migrate deploy` antes de iniciar la API.

Para desarrollo: `docker compose -f compose.yaml -f compose.dev.yaml up --build`. Los mounts/watch son exclusivos de ese override. Expo se ejecuta aparte con `pnpm --filter @utn/mobile start`; configurar `EXPO_PUBLIC_API_URL` con una dirección accesible desde el dispositivo.

## Validación

Con Node 22 y pnpm 10.28.2: `pnpm install --frozen-lockfile`, generar Prisma con `pnpm --filter @utn/api exec prisma generate`, luego `pnpm lint`, `pnpm typecheck`, `pnpm test:security`. `pnpm test` requiere `DATABASE_URL` de una base descartable con las migraciones aplicadas; crea y elimina fixtures.

`./security-check.sh` exige tests de seguridad, auditoría de dependencias y escaneo Docker Scout de las imágenes construidas. Falla si Scout no está disponible: no declara un gate pendiente como aprobado.

## Entorno y operación

- `DATABASE_URL`: conexión PostgreSQL, requerida al ejecutar API/Prisma fuera de Compose; Compose usa DNS `db`.
- `PORT`: puerto interno API, 4000 por defecto; `API_PORT` y `ADMIN_PORT` controlan puertos publicados.
- `ADMIN_ACCESS_TOKEN`: clave administrativa local compartida entre API y panel. La autenticación institucional y los roles del MVP siguen pendientes; esta clave no los reemplaza.
- `CORS_ORIGINS`: orígenes completos separados por comas, sin comodines ni rutas.
- `DB_POOL_MAX`: conexiones máximas por proceso (10 por defecto). Dimensionar según réplicas y capacidad PostgreSQL.
- `API_URL`: URL interna del backend para Next.js; Compose la configura.
- `ALLOWED_EMAIL_DOMAINS`: reservado para autenticación institucional futura.

`/health/live` comprueba el proceso; `/health/ready` y el alias `/health` comprueban la base sin modificarla. Logs JSON incluyen request ID, método, estado y duración; no registran cuerpos, query strings ni credenciales. SIGTERM cierra conexiones y Prisma con un plazo máximo de 10 segundos.

Producción real requiere HTTPS para las cookies Secure del panel. El modo local conserva esa configuración de producción; para probar sesiones administrativas usar un proxy HTTPS local o el override de desarrollo.

Ver [procedimiento de respaldo y recuperación](docs/operaciones.md). No ejecutar `docker compose down -v` sin autorización para borrar los datos.

## Identidad visual

El brandbook provisto es de **19 de Agosto**. Logos originales, paleta, tipografías y reglas de integración: [docs/identidad-visual.md](docs/identidad-visual.md). El panel sincroniza sus assets públicos desde `packages/brand-assets/` al iniciar desarrollo o construir; mobile importa los mismos originales.

La app web se sirve también en producción local en `http://localhost:8081`. Usa una exportación de Expo y un proxy a los endpoints públicos de la API en el mismo origen. El panel permite guardar noticias como borrador o publicadas en `/admin`; los borradores quedan fuera de la app y guardar una noticia nunca envía push.

El envío push web se activa con claves VAPID. Generarlas una sola vez con `node scripts/configure-push.mjs mailto:contacto@dominio.com`, luego reconstruir y levantar los contenedores. En la app, pulsar **Activar notificaciones**; en `/admin/notifications`, guardar el borrador, confirmar destinatarios y pulsar **Enviar push**. Ver alcance, configuración y comprobaciones en [docs/notificaciones-push.md](docs/notificaciones-push.md).
