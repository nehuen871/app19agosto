# Login con Google: app y admin

La app tiene una pantalla **Mi cuenta**. El admin ofrece **Continuar con Google** como único método de ingreso. La app solicita ingresar con Google antes de mostrar cualquier sección: noticias, detalle, calendario y cuenta. Sin sesión, la única pantalla accesible es el ingreso. La API exige además una sesión válida para leer noticias, categorías, eventos e imágenes subidas. Una sesión APP no permite administrar contenido.

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

En producción, los orígenes deben usar HTTPS. Agregar ambos a `CORS_ORIGINS` si hay clientes que llaman directamente a la API. Nunca colocar `GOOGLE_CLIENT_SECRET` en variables `EXPO_PUBLIC_*`.

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

Los intentos OAuth se guardan en PostgreSQL, duran 10 minutos, están vinculados al navegador y se consumen una vez. Los tokens se guardan por hash. En la app, el acceso vence a los 15 minutos y se renueva con un refresh token rotativo hasta un límite absoluto de 7 días desde el login. Cada renovación invalida el acceso anterior; reutilizar un refresh consumido revoca toda su familia. El cliente coordina solicitudes concurrentes y pestañas web para evitar rotaciones duplicadas. El admin conserva sesiones de 8 horas y luego requiere ingresar con Google. Cerrar sesión revoca también la renovación. El propósito de cada sesión se comprueba en el servidor: una sesión de la app no habilita endpoints administrativos, aunque pertenezca a un administrador. El admin verifica además rol ADMIN, cuenta sin bloqueo y correo autorizado en cada solicitud. Los cambios de listas requieren reiniciar la API; el bloqueo o cambio de rol en la base se aplica en la siguiente solicitud. Las acciones administrativas registran el ID de la cuenta en auditoría.

La nueva migración agrega tablas de cuentas, sesiones, intentos OAuth y tickets; conserva noticias, eventos, imágenes y suscripciones existentes. No hay panel de gestión de cuentas en este cambio.

## Verificación

Las pruebas de integración usan PostgreSQL aislado y respuestas de Google simuladas. Cubren PKCE, estado/cookie, separación de propósitos, callbacks vencidos y repetidos, correo no verificado, dominios, lista administrativa, bloqueo, rol, revocación, CSRF en logout, ticket nativo y límites de solicitudes. La autorización real de Google requiere las credenciales y una cuenta de prueba; debe verificarse además en dispositivos Android/iOS.

Referencias: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

Validación local realizada el 7 de octubre de 2026: TypeScript y lint aprobados; 43 pruebas de API y 3 de Web Push aprobadas en base aislada; cinco migraciones aplicadas a una base limpia; imágenes de producción construidas; bundles Hermes de Android/iOS exportados; smoke tests y salud de API/admin/app aprobados. La prueba en Chrome con Google simulado verificó ambos logins, cookies HttpOnly, recarga de sesión, aislamiento de permisos, guardado de una noticia y revocación al salir. La base local conservó sus registros existentes.

La auditoría de dependencias sigue fallando por 4 vulnerabilidades altas y 3 moderadas preexistentes. No se validó OAuth con una cuenta real por falta de credenciales ni se ejecutó la app en dispositivos. El escaneo de imágenes requiere autenticación de Docker Scout y sigue pendiente. Estas comprobaciones pendientes impiden considerar aprobada la preparación completa para producción.

La cuenta administrativa configurada es `19deagosto.utn@gmail.com`. Administra noticias, imágenes, eventos y notificaciones. Los demás usuarios autenticados acceden a noticias y calendario y pueden aceptar eventos; no pueden cargar contenido ni enviar notificaciones. El inicio de sesión con Google ocurre en Google y no requiere guardar la contraseña de ese correo en la aplicación. Para habilitarlo siguen siendo necesarias las credenciales del cliente OAuth.

El acceso a la app usa `Stack.Protected` de Expo Router y reutiliza `GoogleLoginCard`. Antes de resolver la sesión inicial, el layout muestra una pantalla de espera. Sin sesión no se montan las pantallas ni las consultas de noticias o calendario. Al cerrar sesión se elimina la caché de la app y las rutas protegidas salen del historial. El callback web exitoso y el ingreso nativo llevan al listado. Los errores de configuración, conexión o autorización conservan la posibilidad de reintentar.

El panel y la API administrativa aceptan únicamente sesiones de Google con propósito ADMIN, cuenta activa, rol ADMIN y correo autorizado. No existe ingreso alternativo por clave compartida ni cookies locales firmadas.

## Cuenta y perfil

La app y el panel muestran el icono de cuenta en el extremo izquierdo del header cuando hay sesión. El icono abre un panel lateral con Administrar mis datos y Cerrar sesión. El panel web usa un diálogo con cierre por Escape y devolución de foco; la app usa un modal con cierre mediante el fondo y regreso del sistema. No se agregan animaciones personalizadas ni dependencias.

Los formularios editan el nombre visible (entre 1 y 200 caracteres, sin espacios iniciales/finales). El correo verificado de Google, el identificador, el rol y el bloqueo no son editables desde el perfil. Las modificaciones se guardan mediante `PATCH /api/v1/auth/me` (sesión APP) y `PATCH /api/v1/auth/admin/me` (sesión ADMIN). Las actualizaciones con cookie exigen el origen público de la app; las nativas y las del servidor del panel utilizan su token. El backend determina la cuenta desde la sesión, valida estrictamente los campos y registra `ACCOUNT_PROFILE_UPDATED` en la misma transacción.

El nombre editado se conserva en futuros ingresos con Google. Los errores mantienen el borrador y permiten reintentar. La app descarta una respuesta tardía del guardado si la sesión cambió mientras se procesaba la solicitud. No se modificó el esquema de la base.

## Renovación y lecturas protegidas — noviembre de 2026

Las migraciones `202611050001` y `202611050002` conservan el contenido y vencen las sesiones APP anteriores: es necesario volver a ingresar con Google. Android/iOS guardan el par de tokens en SecureStore; web utiliza cookies HttpOnly y SameSite=Lax, con Secure bajo HTTPS. El refresh web requiere el origen permitido y no entrega tokens en JSON. No se guardan tokens en localStorage. Los errores transitorios de red conservan la sesión para reintentar.

El guardado automático en Google Calendar comienza con un POST autenticado que emite un ticket de un uso, ligado a cuenta y evento, válido por 60 segundos. El navegador abre ese ticket; los tokens de sesión nunca viajan en la URL. Los endpoints de salud, configuración de login y callbacks OAuth permanecen accesibles para permitir iniciar sesión.

El despliegue público requiere HTTPS en el proxy/servidor y URLs HTTPS en el ambiente. La compilación nativa de producción rechaza una API HTTP externa. El entorno local permite HTTP en localhost.

Auditoría actual: 2 vulnerabilidades críticas, 13 altas, 12 moderadas y 6 bajas en el árbol de dependencias de producción del monorepo. Las críticas informadas corresponden a Next.js. Es necesario actualizar y verificar las dependencias antes de aprobar producción; este cambio de sesiones no resuelve ese pendiente. Las cifras anteriores de esta guía corresponden a la validación histórica.

Validación del cambio de sesiones: TypeScript y ESLint aprobados; suite completa con 57 pruebas API, 6 de scripts y 5 del cliente aprobada contra PostgreSQL aislado. Una primera ejecución completa falló y la repetición completa pasó; Google Calendar también pasó por separado. Imágenes de producción y bundles Android/iOS construidos. Chrome con cuentas ficticias en una base aislada verificó renovación por cookies a través del proxy real, segunda rotación al vencer el acceso, revocación por reutilización y carga del panel de notificaciones con lecturas protegidas. No se probó este cambio en dispositivos físicos ni con una autorización real de Google. El entorno local recibió las dos migraciones después de generar un respaldo privado en `/private/tmp`; no se eliminaron volúmenes de datos.
