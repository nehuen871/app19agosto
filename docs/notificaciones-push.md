# Notificaciones push web

La app web de `http://localhost:8081` permite activar y desactivar push en cada navegador. El administrador guarda un borrador en `/admin/notifications`, marca la confirmación y pulsa **Enviar push**. Publicar una noticia no envía push. Sin suscripciones activas, el envío muestra un error y conserva el borrador.

Esta implementación usa Web Push y VAPID. El envío nativo Android/iOS por Expo sigue pendiente: requiere una compilación nativa, proyecto EAS y credenciales FCM/APNs. No se solicitan permisos automáticamente al abrir la app. Fuera de localhost, la app web debe servirse por HTTPS; la compatibilidad depende del navegador y del sistema operativo.

## Configuración

Desde la raíz, después de crear `.env`, ejecutar una sola vez:

```sh
node scripts/configure-push.mjs mailto:contacto@dominio.com
docker compose -f compose.yaml -f compose.prod-local.yaml build api admin mobile migrate
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm migrate
docker compose -f compose.yaml -f compose.prod-local.yaml up -d --no-deps --wait api admin mobile
```

`PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY` y `PUSH_VAPID_SUBJECT` deben configurarse juntas. La clave privada queda únicamente en el backend y `.env` ignorado por Git. El script conserva claves ya existentes. Respaldarlas junto con el entorno: rotarlas invalida la relación con las suscripciones existentes. El entorno local usa `mailto:push@example.invalid` como contacto de prueba; reemplazarlo por un contacto real antes de publicar, conservando las claves.

La API necesita salida HTTPS hacia los proveedores push. Solo admite endpoints de Google, Mozilla, Apple y Windows para impedir solicitudes a destinos arbitrarios. Las suscripciones son voluntarias y anónimas por navegador; no representan usuarios UTN autenticados ni permiten segmentación académica.

## Contrato y operación

- `GET /api/v1/push/config`: disponibilidad y clave pública.
- `POST /api/v1/push/subscriptions`: suscripción del navegador; devuelve identificador y capacidad aleatoria de revocación. El backend guarda únicamente el hash de esa capacidad.
- `POST /api/v1/push/unsubscribe`: deshabilita una suscripción con su capacidad de revocación.
- `POST /api/v1/admin/notifications/:id/send`: requiere credencial administrativa; toma una instantánea de las suscripciones activas y encola cada destino una sola vez. Máximo 5000 destinos por alerta en esta implementación.

El worker procesa hasta cinco destinos simultáneos con timeout de cinco segundos y TTL de un día. Registra resultados en PostgreSQL, deshabilita destinos que responden 404/410 y actualiza `requestedRecipients`, `sentCount`, `failedCount`, `sentAt` y auditoría. Estados: `DRAFT`, `QUEUED`, `PROCESSING`, `SENT`, `PARTIAL`, `FAILED`. Una aceptación por el proveedor no confirma lectura ni visualización en el dispositivo.

No hay reintentos automáticos de envíos fallidos. Un envío interrumpido con resultado desconocido se marca fallido después de dos minutos para evitar duplicados. La cola pendiente se conserva entre reinicios. La apertura desde push lleva al detalle de la noticia cuando sigue publicada; de lo contrario, al inicio. El service worker valida que los enlaces permanezcan en el mismo origen.

## Validación y límites

Lint y TypeScript pasaron. Las tres migraciones se aplicaron primero sobre PostgreSQL descartable. Pasaron 24 pruebas API, incluidas autorización de envío, ausencia de destinatarios, rechazo de endpoints inseguros, revocación, doble envío concurrente, resultados parciales, deshabilitación de destinos vencidos y recuperación tras interrupción. Pasaron tres pruebas del service worker para visualización y apertura segura.

Chrome también pasó la prueba con las imágenes de producción y una base aislada: renderizado de activación, configuración pública habilitada, registro del service worker, visualización de una notificación con un evento push inyectado, login administrativo, guardado del borrador, confirmación de envío y error sin destinatarios. Los smoke tests de los servicios actualizados pasaron y los contenedores quedaron saludables.

La entrega real a un navegador suscripto requiere probar con un dispositivo que conceda permiso y tenga conectividad con su proveedor push; las pruebas de cola usan un transporte controlado. El evento inyectado en Chrome no verifica la entrega del proveedor remoto. Android/iOS nativos no fueron validados.

La auditoría del workspace detectó cuatro vulnerabilidades altas y tres moderadas en dependencias ya existentes (`deepmerge-ts`, `mysql2`, `node-forge`, `braces`, `uuid`, `decode-uri-component`). No se modificaron esas dependencias como parte del envío push. El gate general de seguridad no se declara aprobado.

Docker Scout está instalado, pero el escaneo de la imagen API no pudo ejecutarse porque exige iniciar sesión. El escaneo de las imágenes queda pendiente.

La migración push es aditiva y no elimina tablas ni volúmenes. Para volver al código anterior, conservar las tablas nuevas y deshabilitar las tres variables VAPID juntas; no ejecutar una migración destructiva para retirar datos de suscripciones o auditoría.

Referencias: [Web Push para Node.js](https://github.com/web-push-libs/web-push), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [servicio push de Expo para el futuro cliente nativo](https://docs.expo.dev/push-notifications/sending-notifications/).
