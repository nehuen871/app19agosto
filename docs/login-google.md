# Login con Google: app y admin

La app tiene una pantalla **Mi cuenta**. El admin ofrece **Continuar con Google** y mantiene el ingreso por clave. Noticias y calendario siguen siendo públicos.

## Configuración

1. En Google Cloud, configurar la pantalla de consentimiento y crear un cliente OAuth de tipo **Aplicación web**. En modo de prueba, agregar las cuentas que van a probarlo. Usar un cliente distinto para producción y desarrollo.
2. Registrar estas URI de redirección exactas en ese cliente (reemplazar los orígenes en producción):
   - App: `http://localhost:8081/api/v1/auth/google/callback`
   - Admin: `http://localhost:3001/admin/oauth/callback`
   - Calendar, si se utiliza: `http://localhost:8081/api/v1/google-calendar/callback`
3. Completar `.env`, que no se versiona:

```dotenv
GOOGLE_CLIENT_ID=cliente.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=secreto-del-cliente
GOOGLE_REDIRECT_URI=http://localhost:8081/api/v1/google-calendar/callback
APP_PUBLIC_URL=http://localhost:8081
ADMIN_PUBLIC_URL=http://localhost:3001
GOOGLE_LOGIN_ENABLED=true
GOOGLE_APP_ACCESS=institutional
ALLOWED_EMAIL_DOMAINS=dominio-institucional-confirmado.edu.ar
ADMIN_GOOGLE_EMAILS=19deagosto.utn@gmail.com
```

Los dominios y correos del ejemplo deben reemplazarse por los reales. Las listas admiten comas; los dominios coinciden exactamente, sin comodines ni subdominios implícitos. Por defecto, la app requiere un dominio configurado. Para permitir cualquier cuenta de Google con correo verificado, usar `GOOGLE_APP_ACCESS=verified`. El admin siempre requiere un correo completo en `ADMIN_GOOGLE_EMAILS`; una lista vacía deshabilita su login con Google. Ningún usuario obtiene acceso administrativo por ser el primero en registrarse.

En producción, los orígenes deben usar HTTPS. Agregar ambos a `CORS_ORIGINS` si hay clientes que llaman directamente a la API. Nunca colocar `GOOGLE_CLIENT_SECRET` ni `ADMIN_ACCESS_TOKEN` en variables `EXPO_PUBLIC_*`.

```sh
docker compose -f compose.yaml -f compose.prod-local.yaml build api admin mobile migrate
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm migrate
docker compose -f compose.yaml -f compose.prod-local.yaml up -d --no-deps --wait api admin mobile
```

## Android e iOS

El cliente abre el navegador de autenticación de Expo y vuelve a `utnfrba://account`, el esquema definido en `app.json`. Requiere una compilación de desarrollo o una app instalada con ese esquema; Expo Go no sirve para validar este retorno. Configurar `EXPO_PUBLIC_API_URL` con la URL HTTPS pública de la API al compilar para dispositivos: `localhost` en el teléfono apunta al teléfono.

El navegador recibe únicamente un ticket de un uso que vence a los 60 segundos. La app lo intercambia con un verificador propio y conserva la sesión en `expo-secure-store`. El web usa una cookie HttpOnly; no guarda tokens en localStorage. Google retorna siempre al backend mediante la URI web registrada, incluso en Android/iOS.

## Permisos y sesiones

El login solicita `openid email profile`. El permiso para escribir en Google Calendar se solicita en el flujo existente de aceptación de eventos, por separado. No se almacenan access tokens ni refresh tokens de Google. La identidad se obtiene del endpoint oficial UserInfo después del intercambio del código y PKCE, y se exige `email_verified=true`. Se identifica al usuario por `sub`, sin vincular cuentas por coincidencia de correo ni certificar condición de alumno.

Los intentos OAuth se guardan en PostgreSQL, duran 10 minutos, están vinculados al navegador y se consumen una vez. Las sesiones se guardan por hash, duran 7 días en la app y 8 horas en el admin, y se revocan al cerrar sesión. El propósito de cada sesión se comprueba en el servidor: una sesión de la app no habilita endpoints administrativos, aunque pertenezca a un administrador. El admin verifica además rol ADMIN, cuenta sin bloqueo y correo autorizado en cada solicitud. Los cambios de listas requieren reiniciar la API; el bloqueo o cambio de rol en la base se aplica en la siguiente solicitud. Las acciones administrativas registran el ID de la cuenta en auditoría.

La nueva migración agrega tablas de cuentas, sesiones, intentos OAuth y tickets; conserva noticias, eventos, imágenes y suscripciones existentes. No hay panel de gestión de cuentas en este cambio.

## Verificación

Las pruebas de integración usan PostgreSQL aislado y respuestas de Google simuladas. Cubren PKCE, estado/cookie, separación de propósitos, callbacks vencidos y repetidos, correo no verificado, dominios, lista administrativa, bloqueo, rol, revocación, CSRF en logout, ticket nativo y límites de solicitudes. La autorización real de Google requiere las credenciales y una cuenta de prueba; debe verificarse además en dispositivos Android/iOS.

Referencias: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

Validación local realizada el 7 de octubre de 2026: TypeScript y lint aprobados; 43 pruebas de API y 3 de Web Push aprobadas en base aislada; cinco migraciones aplicadas a una base limpia; imágenes de producción construidas; bundles Hermes de Android/iOS exportados; smoke tests y salud de API/admin/app aprobados. La prueba en Chrome con Google simulado verificó ambos logins, cookies HttpOnly, recarga de sesión, aislamiento de permisos, guardado de una noticia y revocación al salir. La base local conservó sus registros existentes.

La auditoría de dependencias sigue fallando por 4 vulnerabilidades altas y 3 moderadas preexistentes. No se validó OAuth con una cuenta real por falta de credenciales ni se ejecutó la app en dispositivos. El escaneo de imágenes requiere autenticación de Docker Scout y sigue pendiente. Estas comprobaciones pendientes impiden considerar aprobada la preparación completa para producción.

La cuenta administrativa configurada es `19deagosto.utn@gmail.com`. Administra noticias, imágenes, eventos y notificaciones. Los demás usuarios acceden a las vistas públicas de noticias y calendario y pueden aceptar eventos; no pueden cargar contenido ni enviar notificaciones. El inicio de sesión con Google ocurre en Google y no requiere guardar la contraseña de ese correo en la aplicación. Para habilitarlo siguen siendo necesarias las credenciales del cliente OAuth.
