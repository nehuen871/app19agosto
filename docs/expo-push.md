# Notificaciones nativas con Expo Push Service

## Proyecto vinculado

- Expo/EAS: [`agostos19/agosto19app`](https://expo.dev/accounts/agostos19/projects/agosto19app), Project ID `8c03564e-bf35-4073-ae65-e689396f5cde`.
- Android: `ar.com.diecinuevedeagosto.app`, registrado en Firebase `agosto-6d4eb`.
- Firma Android: configuración `Android 19 de Agosto`, alias `upload`, guardada en Expo.
- FCM v1: cuenta dedicada `expo-push-android@agosto-6d4eb.iam.gserviceaccount.com`, con el rol Firebase Cloud Messaging API Admin, guardada y asociada al paquete Android en Expo.
- Los originales de la firma, su contraseña y la cuenta FCM se conservan en `.credentials/`, excluidos de Git, Docker y EAS. Respaldar esa carpeta de forma privada. La configuración pública Android está en `apps/mobile/google-services.json`, ignorada por Git e incluida expresamente en el paquete EAS mediante `.easignore`.

Configuración completada el 13 de noviembre de 2026. El backend local tiene Expo Push habilitado; la entrega real sigue pendiente de una URL pública HTTPS, una compilación instalada y un dispositivo suscripto. No se generó ni publicó un APK como parte de esta vinculación. iOS requiere configurar por separado el identificador y las credenciales APNs de Apple.

La app Android/iOS permite activar y desactivar notificaciones desde Noticias. El panel existente envía a las suscripciones web y nativas habilitadas, con la misma confirmación y cola. Guardar o publicar una noticia no envía push.

## Configuración inicial

1. Crear una cuenta en Expo y un proyecto EAS para la app. Desde `apps/mobile`, con las dependencias instaladas, ejecutar `pnpm dlx eas-cli login` y `pnpm dlx eas-cli init`. No crear otro proyecto si ya existe uno.
2. Conservar el Project ID que asigna EAS. Configurar en el ambiente del backend `EXPO_PROJECT_ID=<UUID>` y `EXPO_PUSH_ENABLED=true`; en el ambiente de compilación móvil, `EXPO_PUBLIC_EAS_PROJECT_ID=<mismo UUID>`. Mientras no exista proyecto, dejar `EXPO_PUSH_ENABLED=false` (valor por defecto).
3. Elegir identificadores propios para Android e iOS: `EXPO_PUBLIC_ANDROID_PACKAGE` y `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`. No cambiar estos identificadores después de publicar.
4. Android: registrar ese identificador en Firebase, descargar `google-services.json` y configurar `EXPO_PUBLIC_GOOGLE_SERVICES_FILE` con la ruta del archivo, relativa a `apps/mobile`. Subir la **service account FCM v1** mediante `eas credentials`; esa clave privada no pertenece a la app ni a variables `EXPO_PUBLIC_*`.
5. iOS: configurar las credenciales APNs en `eas credentials` con la cuenta Apple Developer correspondiente. Las claves `.p8` no se versionan.
6. Si se activa la protección de acceso del servicio push en Expo, cargar su token únicamente como `EXPO_ACCESS_TOKEN` del backend. No enviarlo al cliente.
7. Configurar `EXPO_PUBLIC_API_URL` con una URL HTTPS pública accesible desde el teléfono, junto con los orígenes y callbacks OAuth documentados en `login-google.md`. `localhost` en el teléfono apunta al teléfono.
8. Construir e instalar una app nativa: `pnpm dlx eas-cli build --platform android --profile preview` o una compilación iOS firmada. Expo Go no sirve para probar esta integración. Para iOS, la distribución interna necesita el dispositivo registrado y las credenciales correspondientes.
9. Aplicar Docker: `docker compose -f compose.yaml -f compose.prod-local.yaml up -d --build --wait`. La migración es aditiva: conserva suscripciones Web Push y datos existentes.
10. Ingresar con una cuenta institucional, abrir Noticias y tocar **Activar notificaciones**. Luego preparar un borrador en el panel y confirmar su envío para probar en un dispositivo propio.

Las variables de compilación deben existir en el ambiente EAS o en un `.env` local de `apps/mobile` al ejecutar EAS directamente. El lanzador `scripts/expo.mjs` carga las variables públicas del `.env` raíz cuando se usan los scripts pnpm del repositorio. No depender de que EAS cargue automáticamente ese archivo raíz ignorado por Git. No subir archivos de credenciales al repositorio; usar el almacenamiento de credenciales/variables de archivo de EAS cuando corresponda.

## Contrato y entrega

- `GET /api/v1/push/native/config` expone disponibilidad y Project ID público.
- `POST /api/v1/push/native/subscriptions` requiere una sesión APP por bearer, un ExpoPushToken válido y el Project ID configurado. Las sesiones ADMIN y las cookies solas no habilitan este endpoint.
- La suscripción devuelve una capacidad de revocación guardada en SecureStore. Se desactiva desde la app o al cerrar sesión. Las suscripciones son por dispositivo y reciben avisos generales; no se implementó segmentación por carrera ni por usuario.
- Los tokens se deduplican y no aparecen en logs ni respuestas del panel. El transporte llama solamente a la API fija de Expo y usa timeout. Hasta cinco mensajes se procesan por ciclo.
- Un ticket de Expo deja la entrega en `AWAITING_RECEIPT` y el aviso en `PROCESSING`. A partir de 15 minutos se consultan recibos; la aceptación de FCM/APNs marca `SENT`. Esto no confirma lectura ni visualización en el teléfono.
- `DeviceNotRegistered` deshabilita el dispositivo. Los errores definitivos marcan fallo; los recibos todavía ausentes o con fallos de red se consultan cada minuto, hasta 24 horas. Un envío interrumpido no se reenvía automáticamente, evitando duplicados. La política previa de no reintentar envíos fallidos se conserva.
- La apertura acepta únicamente `/` o rutas locales `/news/<slug>`. Si no hay sesión, la app conserva el último toque y lo procesa después del ingreso. No abre URLs externas desde el payload.

Las claves VAPID se conservan: web y nativo se activan por separado. Para deshabilitar Expo, establecer `EXPO_PUSH_ENABLED=false`; conservar tablas, recibos y suscripciones. Nunca borrar volúmenes para revertir esta integración.

## Validación pendiente de credenciales

Las pruebas automatizadas utilizan transporte Expo simulado y PostgreSQL aislado. La entrega real, permisos del sistema y apertura con app cerrada requieren proyecto EAS, FCM/APNs, una compilación instalada y dispositivos de prueba; no se consideran validados por compilar o recibir un ticket.

Validación local del 12 de noviembre de 2026: migraciones completas aprobadas primero en PostgreSQL aislado; suites completas de API, scripts, cliente y seguridad aprobadas; lint y TypeScript del monorepo aprobados; imágenes de API, panel y web construidas; bundles Hermes Android/iOS y web exportados. Se comprobaron registro autenticado, separación APP/ADMIN, deduplicación, revocación, selección de proveedores, tickets pendientes, recibos aceptados y dispositivos desregistrados con transporte simulado.

La auditoría de producción del árbol de dependencias reportó 42 vulnerabilidades (2 críticas, 15 altas, 16 moderadas y 9 bajas), incluidas críticas en Next.js. Docker Scout no pudo completar el escaneo porque requiere autenticación. Estos controles no están aprobados para un despliegue público; la integración de push no actualiza dependencias ajenas a su alcance.

Referencias: [configuración de Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/), [envío y recibos](https://docs.expo.dev/push-notifications/sending-notifications/).
