# Cargas de prueba manuales

Los datos se conservan como generadores TypeScript dentro del repositorio.
Son portables entre instalaciones de este proyecto que tengan el esquema
actual de PostgreSQL. No son un respaldo de la base ni contienen cuentas,
contraseñas, sesiones o credenciales.

| Archivo | Datos |
| --- | --- |
| `apps/api/prisma/seed-news-demo.ts` | 100 noticias publicadas entre enero y diciembre de 2025, 20 destacadas y cinco categorías. |
| `apps/api/prisma/seed-events-demo.ts` | 500 eventos publicados en 2026: al menos uno por día, los cuatro colores, superposiciones, actividades de varios días y cruces de mes. Noviembre incluye 133 eventos de prueba. |

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

# Ambas, una después de otra
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
# O cargar ambas:
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
- No crean notificaciones, entregas push ni eventos en Google Calendar.
- Los slugs de noticias y los UUID deterministas de eventos identifican cada
  lote. Una segunda ejecución omite registros existentes, sin duplicarlos ni
  sobrescribir sus ediciones. Los demás registros se conservan.
- Cada lote se ejecuta en una transacción y muestra un resumen de creados,
  total del lote y distribución temporal. En una base vacía, la primera carga
  completa crea 100 noticias y 500 eventos; repetirla informa cero creados.
- Las comprobaciones del generador esperan la composición del lote original.
  Si se cambian manualmente fechas o destacadas de las noticias de prueba,
  su validación puede rechazar una repetición; no restaura ni sobrescribe esos
  cambios automáticamente.

La carga de noticias y la de eventos son transacciones independientes. Si la
segunda falla al ejecutar `demo:all`, se puede corregir la causa y repetir el
comando: el primer lote ya creado se omite.
