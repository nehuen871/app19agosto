# Noticias, imágenes y calendario

## Uso

La app muestra las noticias en una única columna en escritorio y móvil. La navegación incluye **Noticias** y **Calendario**. El calendario permite cambiar de mes, seleccionar un día y consultar los eventos con título, texto, horario y lugar. Los días se marcan con los colores configurados desde el admin; cada evento también muestra el nombre del color. En pantallas menores al ancho de siete controles táctiles, la grilla permite desplazamiento horizontal.

En `/admin`, seleccionar un archivo PNG/JPEG en **Subir imagen desde tu dispositivo**. La vista previa aparece durante la subida y **Guardar noticia** se habilita al terminar. El archivo tiene prioridad sobre la URL opcional. Máximo 5 MB, 4096 px por dimensión y 12 megapíxeles. SVG y archivos de otros tipos se rechazan. La API verifica firma, contenedor y dimensiones, genera el identificador y fija el MIME al servirlo con `nosniff`; nunca usa nombres o rutas enviados por el usuario.

Las imágenes originales se guardan en PostgreSQL (`MediaImage.data`), dentro del volumen persistente existente. No dependen del filesystem del contenedor. Los respaldos de PostgreSQL incluyen las imágenes. No se recomprimen ni eliminan automáticamente: los archivos subidos que aún no están vinculados a noticias permanecen almacenados. Sus URLs son públicas y contienen identificadores aleatorios. Esta solución es adecuada para el volumen actual; el crecimiento del contenido debe contemplar almacenamiento externo y retención de archivos.

En `/admin/events` se pueden crear y editar eventos. Configurar inicio y fin en horario de Argentina, título, texto, lugar y uno de los cuatro colores del brandbook. **Borrador** y **Cancelado** quedan fuera del calendario público; **Publicado** aparece en la app. El fin debe ser posterior al inicio. Los eventos que atraviesan medianoche o un cambio de mes aparecen en cada día que abarcan; la hora de fin es exclusiva. La agenda se pagina y **Cargar más eventos del mes** incorpora más eventos y sus marcas a la grilla.

## Google Calendar

El botón **Aceptar y guardar en Google Calendar** inicia OAuth cuando está configurado. La persona elige su cuenta y autoriza el acceso; el backend guarda una copia del evento en su calendario principal y vuelve a la app con el resultado. No envía invitaciones ni emails. Las aceptaciones repetidas en la misma cuenta usan el mismo identificador de Google para evitar duplicados. Los tokens de acceso se usan únicamente en esa solicitud; no se almacenan tokens ni se solicita acceso offline. Se solicita autorización al aceptar cada evento.

Si Google OAuth todavía no está configurado, aparece **Aceptar y abrir Google Calendar**: abre el evento con los datos completos, pero la persona debe confirmar **Guardar** en Google. La aceptación local y el guardado en Google son estados diferentes. En web, la aceptación local se conserva en el navegador; en el cliente nativo se conserva durante la sesión. No constituye un registro autenticado de asistencia ni una cuenta institucional UTN.

Para habilitar el guardado automático:

1. Crear o seleccionar un proyecto en Google Cloud y habilitar **Google Calendar API**.
2. Configurar la pantalla de consentimiento y sus usuarios de prueba, si corresponde.
3. Crear un cliente OAuth de tipo **Aplicación web**. Registrar exactamente `http://localhost:8081/api/v1/google-calendar/callback` como URI de redirección autorizada para producción local.
4. Completar en `.env` —sin publicarlo ni enviar secretos por chat—:

```dotenv
GOOGLE_CLIENT_ID=valor-del-cliente
GOOGLE_CLIENT_SECRET=secreto-del-cliente
GOOGLE_REDIRECT_URI=http://localhost:8081/api/v1/google-calendar/callback
APP_PUBLIC_URL=http://localhost:8081
```

5. Recrear la API con `docker compose -f compose.yaml -f compose.prod-local.yaml up -d --no-deps --wait api`. Actualizar el calendario en la app para cargar la nueva configuración.

Las tres variables `GOOGLE_*` deben completarse juntas. En un dominio publicado, usar HTTPS y registrar el callback con ese dominio; el callback y `APP_PUBLIC_URL` deben compartir origen. El flujo usa el servidor web de producción local, que reenvía cookies y redirecciones; el servidor Expo de desarrollo no proporciona ese proxy. Para probar OAuth, usar `compose.prod-local.yaml`.

Scopes: `openid` para identificar la cuenta y `https://www.googleapis.com/auth/calendar.events` para crear el evento. El backend liga el `state` a una cookie HttpOnly/SameSite=Lax, usa PKCE S256 y una autorización de un solo uso que expira a los diez minutos. El inicio usa siempre el origen público de la app para que la cookie coincida con el callback incluso si la API tiene otro dominio. El proxy usa `Referrer-Policy: no-referrer` para evitar propagar el código de autorización. El estado transitorio reside en la API actual: un reinicio invalida autorizaciones pendientes, y un despliegue con múltiples réplicas necesitaría estado compartido o afinidad. Los logs no incluyen códigos, secretos ni tokens.

Editar o cancelar un evento en el admin actualiza el calendario de la app. Las copias que ya fueron guardadas en Google no se sincronizan automáticamente, porque no se conserva acceso a las cuentas. No se implementaron recurrencia ni eventos de día completo.

Referencias oficiales: [OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server?hl=es), [creación de eventos](https://developers.google.com/workspace/calendar/api/guides/create-events), [permisos de Calendar API](https://developers.google.com/workspace/calendar/api/auth).

## Migración y comprobaciones

`202610060002_media_events` agrega imágenes, la relación opcional en noticias y eventos con índices y una restricción de fechas. No elimina datos ni volúmenes. Aplicar mediante `prisma migrate deploy`; se probó primero en PostgreSQL descartable. Ante un problema, conservar las tablas y hacer una corrección hacia adelante o volver a la interfaz anterior; no borrar archivos, tablas ni volúmenes para revertir la interfaz.

Pasaron lint, TypeScript, 33 pruebas API y 3 pruebas de push. Las pruebas de OAuth usan un transporte controlado y verifican estado/cookie, PKCE, consentimiento rechazado, rechazo de reutilización, destino fijo, fechas e idempotencia. Las pruebas de imágenes cubren permisos, MIME, firma, límites, vinculación con noticias y entrega binaria. Se probaron meses superpuestos, límites de fecha, colores admitidos y ocultación de borradores/cancelados.

Chrome verificó subida desde el selector de archivos, vista previa, publicación, imagen visible en la app, noticias verticales, creación del evento desde el admin, selección del día, enlace precargado de Google y edición de título/color reflejada en la app. Se inspeccionaron vistas web de 1280 y 390 px. Las compilaciones nativas Android/iOS y la escritura contra una cuenta real de Google siguen sin validar; el guardado automático requiere las credenciales mencionadas arriba.

La imagen de prueba mantuvo exactamente los mismos bytes tras recrear la API con filesystem de solo lectura y usuario sin privilegios. La API cerró con código 0. La migración se aplicó a la base existente, se actualizaron los contenedores y la noticia previa se conservó.

No se agregaron dependencias. La auditoría general y el escaneo de imágenes conservan los pendientes documentados en [notificaciones-push.md](notificaciones-push.md); estos cambios no declaran aprobado el gate global de producción.
