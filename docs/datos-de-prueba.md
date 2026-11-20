# Cargas de prueba manuales

Los datos se conservan como generadores TypeScript dentro del repositorio.
Son portables entre instalaciones de este proyecto que tengan el esquema
actual de PostgreSQL. No son un respaldo de la base ni contienen cuentas,
contraseñas, sesiones o credenciales.

| Archivo | Datos |
| --- | --- |
| `apps/api/prisma/seed-news-demo.ts` | 100 noticias publicadas entre enero y diciembre de 2025, 20 destacadas y cinco categorías. |
| `apps/api/prisma/seed-events-demo.ts` | 500 eventos publicados en 2026: al menos uno por día, los cuatro colores, superposiciones, actividades de varios días y cruces de mes. Noviembre incluye 133 eventos de prueba. |
| `apps/api/prisma/seed-useful-links-demo.ts` | 16 links útiles publicados, con 16 ilustraciones temáticas PNG y cinco destacados. Los destinos, textos y orden están en `apps/api/prisma/demo-links/links.json`; las imágenes viajan en `demo-links/images/`. |

Las fechas son fijas para reproducir las mismas pruebas en cualquier ambiente.
Las noticias usan un año completo pasado para que todas sean visibles; los
eventos futuros también aparecen en el calendario. Los horarios de eventos
corresponden a Argentina. Algunos eventos de diciembre terminan en enero de 2027.

## Con Docker

Desde la raíz del proyecto, con el `.env` del ambiente de destino configurado:

```sh
docker compose -f compose.yaml -f compose.prod-local.yaml build migrate
docker compose -f compose.yaml -f compose.prod-local.yaml up -d --wait db
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm migrate
```

Después, ejecutar solamente la carga que se necesite:

```sh
# Noticias
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm --no-deps migrate pnpm demo:news

# Eventos
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm --no-deps migrate pnpm demo:events

# Links útiles con sus imágenes
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm --no-deps migrate pnpm demo:links

# Las tres cargas, una después de otra
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm --no-deps migrate pnpm demo:all
```

El servicio `migrate` aporta las herramientas y la conexión a la base de ese
Compose. No hace falta instalar pnpm en los contenedores de API, admin o mobile.
Al cambiar de ambiente, usar el archivo de variables y la configuración de
Compose correspondientes en todos los comandos.

## Sin Docker

Requiere Node 22, pnpm 10.28.2 y PostgreSQL accesible. Exportar `DATABASE_URL`
con la conexión de destino en la terminal; estos comandos no cargan `.env`
automáticamente. Luego, desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm --filter @utn/api exec prisma generate
pnpm --filter @utn/api db:deploy

pnpm demo:news
pnpm demo:events
pnpm demo:links
# O cargar las tres:
pnpm demo:all
```

No se necesitan claves de Google, Expo, Firebase o Apple para estas cargas.

## Qué modifican

- Se ejecutan únicamente al invocar estos comandos. No hay hooks de arranque,
  instalación, build ni migración que los ejecuten.
- Noticias agrega sus cinco categorías si no existen y reutiliza las existentes
  por su slug. Si hay una imagen local disponible, puede reutilizarla; en una
  base vacía las noticias no dependen de imágenes ni servicios externos.
- Eventos solo escribe en `CalendarEvent`.
- Links útiles solo agrega `UsefulLink` y sus imágenes en `MediaImage`. Las
  imágenes están incluidas en el repositorio: no se descargan ni se generan
  durante la carga. Los destinos son los enlaces de prueba proporcionados;
  el importador no los visita, no completa formularios ni se une a grupos.
- No crean notificaciones, entregas push ni eventos en Google Calendar.
- Los slugs de noticias y los UUID deterministas de eventos identifican cada
  lote. Una segunda ejecución omite registros existentes, sin duplicarlos ni
  sobrescribir sus ediciones. Los demás registros se conservan.
- Links útiles conserva también los enlaces creados en el admin con la misma
  URL, aunque tengan otro ID. No cambia sus títulos, imágenes, orden ni
  publicación. Si un enlace fue dado de baja, repetir el comando no lo restaura.
  Las ejecuciones simultáneas del importador se serializan para evitar duplicados.
- Cada lote se ejecuta en una transacción y muestra un resumen de creados,
  total del lote y distribución temporal. En una base vacía, la primera carga
  completa crea 100 noticias, 500 eventos y 16 links útiles con sus imágenes;
  repetirla informa cero creados. `demo:links` informa creados y omitidos.
- Las comprobaciones del generador esperan la composición del lote original.
  Si se cambian manualmente fechas o destacadas de las noticias de prueba,
  su validación puede rechazar una repetición; no restaura ni sobrescribe esos
  cambios automáticamente.

Las tres cargas son transacciones independientes. Si alguna falla al ejecutar
`demo:all`, se puede corregir la causa y repetir el comando: los lotes ya
creados se omiten. Para trasladar la carga de links a otra instalación, conservar
el generador, `demo-links/links.json` y la carpeta completa `demo-links/images/`.
La instalación debe tener las migraciones vigentes, incluida
`202611200001_useful_links`.
