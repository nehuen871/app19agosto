# Especificación técnica --- App UTN FRBA

> Documento maestro para arquitectura, desarrollo y agentes de IA.\
> Actualizado: 30-09-2026

## 1. Objetivo

Construir una plataforma con app móvil Android/iOS, API REST,
PostgreSQL, panel web ABM, autenticación mediante correo institucional
UTN verificado, noticias y alertas push.

El MVP incluye registro, verificación de email, login/logout,
recuperación de contraseña, perfil, noticias, categorías, noticias
destacadas, historial de alertas y administración web.

## 2. Arquitectura

``` text
Android/iOS -> Expo + React Native -> HTTPS -> Node.js + Express
                                             |-> PostgreSQL + Prisma
                                             |-> Expo Push Service

Administradores -> Next.js ABM -> API Express
```

Monorepo:

``` text
apps/
  mobile/
  admin/
  api/
packages/
  types/
  validation/
  api-client/
  config/
  design-tokens/
docs/
```

Usar pnpm workspaces.

## 3. Stack

### Mobile

-   Expo + React Native + TypeScript.
-   Expo Router.
-   NativeWind 4.x estable.
-   React Native Reusables o componentes propios.
-   TanStack Query.
-   React Hook Form + Zod.
-   expo-notifications.
-   expo-secure-store.

### Admin

-   Next.js + TypeScript + App Router.
-   Tailwind CSS.
-   shadcn/ui.
-   React Hook Form + Zod.

### Backend

-   Node.js + Express + TypeScript.
-   PostgreSQL.
-   Prisma ORM 7 estable.
-   Zod.
-   Argon2id.
-   Access/refresh tokens.
-   Helmet, CORS y rate limiting.

No usar automáticamente alpha, beta, canary, RC o pre-release. Antes de
actualizar dependencias principales, revisar compatibilidad y ejecutar
tests.

## 4. Autenticación UTN

En el MVP no existe integración con el login institucional.
`utnVerified=true` significa solamente que el usuario demostró controlar
una dirección institucional admitida. No implica condición de alumno
regular, docente o personal activo.

Los dominios NO deben hardcodearse:

``` env
ALLOWED_EMAIL_DOMAINS=
```

Los dominios reales se deben confirmar antes de producción. La
validación definitiva siempre ocurre en backend.

### Registro

``` text
nombre
apellido
email
contraseña
confirmación
aceptación de términos
```

Flujo:

``` text
registro
-> normalizar email
-> validar dominio
-> verificar duplicado
-> Argon2id
-> crear emailVerified=false
-> generar token de un solo uso
-> enviar email
-> confirmar
-> emailVerified=true
```

Endpoints:

``` text
POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Los tokens de verificación/reset deben ser seguros, expirar, ser de un
solo uso y almacenarse preferentemente hasheados. Aplicar rate limiting.

Login permitido si las credenciales son correctas, `emailVerified=true`
y `status=ACTIVE`. Usar mensajes genéricos como "Credenciales
inválidas".

Mobile guarda secretos en SecureStore. Web debe preferir cookies
HttpOnly, Secure y SameSite apropiado.

## 5. Roles

-   `USER`: noticias, alertas, perfil y preferencias propias.
-   `EDITOR`: ABM de noticias/categorías y alertas según permisos.
-   `ADMIN`: lo anterior más usuarios, roles, bloqueos y auditoría.

Todos los permisos se verifican en backend. Ocultar un botón no
constituye seguridad.

## 6. Noticias

Estados:

``` text
DRAFT
PUBLISHED
ARCHIVED
```

Modelo conceptual:

``` text
News
 id
 title
 slug
 summary
 content
 coverImageUrl
 categoryId
 status
 featured
 publishedAt
 createdById
 createdAt
 updatedAt
```

Mobile tendrá Destacadas, Últimas noticias, Categorías y Detalle.
`NewsCard` soportará `default`, `featured` y `compact`.

Usar paginación y filtros:

``` text
GET /api/v1/news?page=1&limit=20
GET /api/v1/news/:slug
GET /api/v1/categories
```

Los endpoints públicos nunca devuelven borradores.

## 7. ABM web

``` text
/admin
  login
  dashboard
  news/
  categories/
  notifications/
  users/
  audit/
```

Noticias: crear, editar, guardar borrador, publicar, archivar, destacar,
seleccionar categoría, imagen y preview.

Preferir archivado/soft delete cuando ayude a preservar auditoría.

## 8. Notificaciones push

Usar `expo-notifications`.

``` text
login
-> solicitar permiso
-> obtener push token
-> POST /devices
-> asociar dispositivo al usuario
```

Un usuario puede tener varios dispositivos.

**Publicar una noticia y enviar una notificación son acciones
independientes.**

``` text
[ Publicar noticia ]
[ ] Enviar notificación push
```

Una alerta asociada a `newsId` debe abrir el detalle correspondiente.

Estados:

``` text
DRAFT
QUEUED
PROCESSING
SENT
PARTIAL
FAILED
```

Guardar `requestedRecipients`, `sentCount`, `failedCount`, `createdAt` y
`sentAt`. `SENT` no significa `READ`.

Si un push token queda inválido, marcar el dispositivo deshabilitado.

Preparar segmentación futura por TODOS, CARRERA, TURNO, CATEGORIA,
MATERIA, SEDE o USUARIO, sin inventar datos académicos en el MVP.

## 9. Datos

Entidades iniciales:

``` text
User
Device
Category
News
Notification
RefreshSession
EmailVerificationToken
PasswordResetToken
AuditLog
```

Indexar al menos `User.email`, `News.slug`, `News.status`,
`News.publishedAt`, `Device.pushToken` y `Category.slug`.

## 10. API administrativa

``` text
GET    /admin/news
POST   /admin/news
GET    /admin/news/:id
PATCH  /admin/news/:id
DELETE /admin/news/:id
POST   /admin/news/:id/publish
POST   /admin/news/:id/archive

GET    /admin/categories
POST   /admin/categories
PATCH  /admin/categories/:id
DELETE /admin/categories/:id

GET    /admin/notifications
POST   /admin/notifications
POST   /admin/notifications/:id/send

GET   /admin/users
GET   /admin/users/:id
PATCH /admin/users/:id/status
PATCH /admin/users/:id/role
```

Formato de error:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos ingresados no son válidos",
    "details": []
  }
}
```

No devolver stack traces en producción.

# 11. Design System

Mobile y ABM deben mantener la misma identidad visual. Pueden tener
componentes técnicos diferentes, pero deben compartir tokens y criterios
visuales desde `packages/design-tokens/`.

Principios: moderno, minimalista, mobile-first, accesible, responsive y
consistente.

### Colores semánticos

``` text
primary / primaryForeground
secondary / secondaryForeground
background / foreground
surface / surfaceForeground
muted / mutedForeground
border
success
warning
error
info
```

Prohibido hardcodear colores en pantallas. Los colores de marca
definitivos se fijarán una vez aprobada la identidad visual.

### Espaciado

``` text
xs=4
sm=8
md=16
lg=24
xl=32
2xl=48
```

No usar valores arbitrarios sin una razón documentada.

### Radios

``` text
sm
md
lg
xl
full
```

### Tipografía

``` text
Display
Heading1
Heading2
Heading3
Body
BodySmall
Label
Caption
```

Cada variante define tamaño, peso y line-height. Las pantallas no
inventan tipografía local.

### Componentes base

``` text
components/ui/
  Button
  Input
  Text
  Card
  Badge
  Avatar
  Checkbox
  Switch
  Modal
  BottomSheet
  Toast
  Skeleton
  Divider
  EmptyState
  LoadingIndicator
```

`Button`: primary, secondary, outline, ghost, danger; tamaños sm/md/lg;
estados default/pressed/disabled/loading.

`Input`: label, placeholder, helper, error, disabled, icon y password.

`NewsCard`: imagen, categoría, título, resumen, fecha y destacado;
variantes default/featured/compact.

Toda pantalla remota debe contemplar `Loading`, `Success`, `Empty`,
`Error` y `Offline`. Usar Skeleton cuando corresponda.

Probar Android pequeño/grande, iPhone, tablet y web del ABM. Evitar
dimensiones fijas innecesarias.

Usar una sola familia principal de iconos. Los tokens deben estar
preparados para light/dark aunque dark mode se active más adelante.

Accesibilidad: contraste suficiente, labels, áreas táctiles adecuadas,
focus visible en web, soporte para screen reader y no depender solo del
color para comunicar estados.

# 12. Reglas para Codex / Cursor / agentes IA

Este documento es fuente de verdad.

Antes de programar:

1.  Leer este documento.
2.  Revisar el módulo afectado.
3.  Buscar implementaciones existentes.
4.  Revisar `components/ui`.
5.  Revisar `packages/types`, `validation` y `design-tokens`.
6.  Evitar duplicación.

Antes de instalar una dependencia: - comprobar si ya existe una
solución; - preferir open source/gratuita y mantenida; - confirmar
compatibilidad; - evitar pre-releases; - no actualizar paquetes no
relacionados.

Prohibido duplicar Button/Input/Card, hardcodear colores o inventar
spacing. Una nueva variante visual debe incorporarse formalmente al
Design System.

No dispersar `fetch` en pantallas. Centralizar API en `services/`,
`api-client/` y hooks.

TypeScript debe usar `strict: true`; evitar `any`, casts innecesarios y
errores silenciados.

No dejar `console.log` de debugging, código muerto, imports sin uso,
secretos ni TODO sin explicación.

No refactorizar áreas ajenas a la tarea salvo necesidad técnica real.

## 13. Seguridad

-   HTTPS.
-   Argon2id.
-   Zod.
-   Rate limiting.
-   Helmet.
-   CORS explícito.
-   Tokens con expiración/revocación.
-   Variables de entorno.
-   Logs sin secretos.
-   Límites de upload.
-   Auditoría de dependencias.
-   Mínimo privilegio.

Nunca guardar secretos en Git.

## 14. Auditoría

Registrar al menos:

``` text
NEWS_CREATED
NEWS_UPDATED
NEWS_PUBLISHED
NEWS_ARCHIVED
NOTIFICATION_CREATED
NOTIFICATION_SENT
USER_ROLE_CHANGED
USER_BLOCKED
USER_UNBLOCKED
```

Guardar actor, entidad, timestamp y metadata no sensible.

## 15. Testing

Backend: unitarios, integración, auth, permisos, dominio UTN, noticias y
notificaciones.

Mobile: componentes críticos, formularios, navegación, estados remotos y
apertura desde push.

Admin: formularios, permisos, publicación y validaciones.

E2E prioritarios:

``` text
registro -> email -> verificación -> login
login -> noticias -> detalle
admin -> crear noticia -> publicar -> aparece en mobile
admin -> enviar alerta -> usuario abre noticia
reset password -> nuevo login
```

## 16. Definition of Done

Una tarea no está terminada hasta que:

-   compila;
-   pasa lint/typecheck;
-   tiene manejo de error/loading cuando corresponde;
-   respeta Design System;
-   respeta permisos;
-   no introduce secretos;
-   tiene tests razonables;
-   funciona en los targets afectados;
-   actualiza documentación si cambia arquitectura o contrato.

## 17. Librerías gratuitas recomendadas

Mobile: - Expo / React Native. - Expo Router. - NativeWind estable. -
React Native Reusables. - TanStack Query. - React Hook Form. - Zod. -
expo-notifications. - expo-secure-store.

Admin: - Next.js. - Tailwind CSS. - shadcn/ui. - TanStack Query. - React
Hook Form. - Zod.

Backend: - Express. - Prisma ORM estable. - PostgreSQL. - Zod. -
Argon2. - Helmet.

## 18. Decisiones pendientes antes de producción

-   Confirmar dominios de correo UTN admitidos.
-   Definir proveedor de email transaccional.
-   Definir hosting.
-   Definir almacenamiento de imágenes.
-   Definir colores/logo/tipografía final.
-   Definir política de privacidad y términos.
-   Definir retención de auditoría.
-   Definir política de eliminación de cuentas.
-   Definir segmentación académica si se incorpora.
-   Evaluar login institucional UTN cuando exista acceso.

## 19. Principio de evolución

El MVP debe priorizar una arquitectura simple y mantenible. No
implementar microservicios, colas complejas ni segmentación académica
antes de necesitarlos. Mantener límites claros entre mobile, admin, API
y paquetes compartidos para poder evolucionar sin reescribir el
producto.
