# URLs por ambiente

Copiar `.env.example` a `.env` y completar las variables. Se pueden mantener archivos privados `.env.development`, `.env.staging` y `.env.production`, sin versionarlos. No incluir secretos en variables `EXPO_PUBLIC_*`.

| Variable | Uso |
| --- | --- |
| `APP_PUBLIC_URL` | Origen público de la app, sin rutas. Genera enlaces y callbacks de login. |
| `ADMIN_PUBLIC_URL` | Origen público del panel, sin rutas. Genera el callback del panel. |
| `CORS_ORIGINS` | Orígenes públicos permitidos, separados por coma, sin barra final. |
| `API_URL` | URL de la API utilizada por el servidor del panel, con `/api/v1`. |
| `API_INTERNAL_URL` | Origen de la API utilizado por el proxy web, sin `/api/v1`. |
| `EXPO_PUBLIC_WEB_API_URL` | API de la web compilada. `/api/v1` utiliza el proxy del mismo dominio y conserva las cookies del login. |
| `EXPO_PUBLIC_API_URL` | API accesible desde Android/iOS, con `/api/v1`. En un teléfono usar un dominio HTTPS público, nunca localhost. |
| `EXPO_PUBLIC_DEV_WEB_API_URL` | API para Expo web con Compose de desarrollo, que no usa el proxy de producción. |
| `GOOGLE_REDIRECT_URI` | Callback de Google Calendar: `${APP_PUBLIC_URL}/api/v1/google-calendar/callback`, escribiendo la URL completa. |
| `DATABASE_URL` | Opcional: conexión PostgreSQL externa. Si se omite, Compose construye la conexión a su servicio `db`. |
| `BIND_ADDRESS` | IP donde Docker publica puertos. Predeterminada: `127.0.0.1`. |
| `API_PORT`, `ADMIN_PORT`, `MOBILE_PORT` | Puertos publicados; no cambian los puertos internos de los contenedores. |

Ejemplo local con Docker:

```dotenv
APP_PUBLIC_URL=http://localhost:8081
ADMIN_PUBLIC_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:8081,http://localhost:3001
API_URL=http://api:4000/api/v1
API_INTERNAL_URL=http://api:4000
EXPO_PUBLIC_WEB_API_URL=/api/v1
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
GOOGLE_REDIRECT_URI=http://localhost:8081/api/v1/google-calendar/callback
```

Ejemplo de dominios públicos, conservando la red interna de Docker:

```dotenv
APP_PUBLIC_URL=https://app.ejemplo.com
ADMIN_PUBLIC_URL=https://admin.ejemplo.com
CORS_ORIGINS=https://app.ejemplo.com,https://admin.ejemplo.com
API_URL=http://api:4000/api/v1
API_INTERNAL_URL=http://api:4000
EXPO_PUBLIC_WEB_API_URL=/api/v1
EXPO_PUBLIC_API_URL=https://api.ejemplo.com/api/v1
GOOGLE_REDIRECT_URI=https://app.ejemplo.com/api/v1/google-calendar/callback
```

Los ejemplos de dominios deben reemplazarse por los propios. Los servidores de Google, sus permisos OAuth y las URLs de licencias son direcciones externas del protocolo, no direcciones del despliegue. El esquema instalado `utnfrba://account` sigue siendo la identidad de la app nativa, no un dominio de ambiente.

## Aplicar un ambiente

```sh
docker compose --env-file .env.staging -f compose.yaml -f compose.prod-local.yaml config --quiet
docker compose --env-file .env.staging -f compose.yaml -f compose.prod-local.yaml build api admin mobile migrate
docker compose --env-file .env.staging -f compose.yaml -f compose.prod-local.yaml up -d --wait
```

Para el ambiente predeterminado se puede omitir `--env-file`: Compose utiliza `.env`. No ejecutar simultáneamente distintos ambientes con el mismo proyecto Compose y los mismos puertos.

Los scripts `pnpm --filter @utn/mobile start` y `export:web` leen también las variables públicas de `.env` en la raíz. Para otro archivo:

```sh
ENV_FILE=.env.development pnpm --filter @utn/mobile start
```

Al iniciar Expo web directamente, configurar `EXPO_PUBLIC_WEB_API_URL` con la URL absoluta de la API, ya que ese servidor de desarrollo no incluye el proxy web de producción. En Compose de desarrollo se utiliza `EXPO_PUBLIC_DEV_WEB_API_URL`.

Expo incorpora las variables públicas durante la compilación: cambiar una URL de cliente requiere reconstruir web/APK/IPA. Las variables internas del panel y del proxy se aplican al recrear sus contenedores. Un cambio de dominio exige registrar en Google ambos callbacks de login (`/api/v1/auth/google/callback` en la app y `/admin/oauth/callback` en el panel), además del callback de Calendar si se utiliza. Para producción, mantener la web y sus endpoints de sesión bajo el mismo origen mediante el proxy.

Los healthchecks consultan los puertos internos fijos de cada contenedor y no dependen del dominio público. Los scripts de smoke obtienen los puertos locales de Compose.
