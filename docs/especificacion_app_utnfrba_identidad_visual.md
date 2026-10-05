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

# 20. Identidad visual de 19 de Agosto en la app UTN FRBA

Fuente: `Brandbook - 19 de Agosto.pdf`. Los identificadores fundacionales son los de **19 de Agosto**; no deben presentarse como el logotipo oficial de la universidad. La arquitectura y el contexto de la app UTN FRBA se mantienen. Los originales raster están extraídos del PDF en `packages/brand-assets/`, con trazabilidad en `manifest.json`.

Esta sección traduce el manual de marca provisto a reglas concretas para interfaces móviles y web. Cuando exista conflicto entre una decisión visual local y estas reglas, prevalece esta sección.

## 20.1 Paleta oficial

Usar estos colores como tokens de marca:

```text
brand.blue        = #1F5AAA
brand.lightBlue   = #83A1BB
brand.cyanGray    = #C0D4D3
brand.yellow      = #EDAA37
brand.warmGray    = #F3EDDD
brand.beigeGray   = #E0D6CA
brand.black       = #1C1C1C
```

### Reglas de uso

- `brand.blue`: color institucional principal. Usarlo en acciones primarias, barras, headers, tabs activas, enlaces importantes y fondos de marca.
- `brand.yellow`: acento. Reservarlo para énfasis, destacados, badges o estados visuales secundarios. No debe competir con el azul como color principal de interacción.
- `brand.lightBlue` y `brand.cyanGray`: superficies secundarias, fondos suaves, chips, bloques informativos y estados seleccionados de baja intensidad.
- `brand.warmGray` y `brand.beigeGray`: fondos editoriales, superficies de contenido y secciones con tono institucional más cálido.
- `brand.black`: texto principal, fondos oscuros y alto contraste.

No crear nuevos colores de marca sin aprobación. Los estados funcionales `success`, `warning`, `error` e `info` pueden usar colores semánticos adicionales, pero deben convivir visualmente con esta paleta y conservar contraste accesible.

## 20.2 Tipografía oficial

Familias del manual:

```text
Archivo Black       -> títulos principales
Libre Baskerville   -> acentos / frases editoriales
Libre Franklin      -> textos corridos y UI
Archivo             -> variante secundaria
```

### Mapeo para producto digital

```text
Display / Hero        -> Archivo Black
Heading1 / Heading2   -> Archivo Black
Heading3              -> Archivo Black o Libre Franklin Semibold
Body                  -> Libre Franklin
BodySmall             -> Libre Franklin
Label                 -> Libre Franklin Semibold
Caption               -> Libre Franklin
EditorialAccent       -> Libre Baskerville
AlternateHeading      -> Archivo
```

### Reglas

- `Libre Franklin` es la tipografía base de interfaz.
- `Archivo Black` se reserva para títulos con fuerte jerarquía visual; evitar usarla en textos largos.
- `Libre Baskerville` se utiliza como acento editorial, citas o bloques especiales; no en controles, formularios o cuerpos extensos.
- `Archivo` puede usarse como variante cuando se necesite un tono menos pesado que `Archivo Black`.
- No mezclar las cuatro familias en una misma pantalla si no es necesario.
- Mantener legibilidad y accesibilidad por encima de efectos editoriales.

## 20.3 Jerarquía sugerida

```text
Display:        Archivo Black, 40-48, weight 400
Heading1:       Archivo Black, 32-36
Heading2:       Archivo Black, 26-30
Heading3:       Archivo Black / Libre Franklin 700, 20-24
Body:           Libre Franklin, 16-18
BodySmall:      Libre Franklin, 14
Label:          Libre Franklin 600, 14-16
Caption:        Libre Franklin, 12-13
EditorialAccent: Libre Baskerville, 16-22
```

Los tamaños son rangos de producto y pueden adaptarse por breakpoint, sin alterar la jerarquía entre estilos.

## 20.4 Logotipo, isotipo e isologo

Se deben conservar los identificadores fundacionales. La actualización de marca se concentra en el sistema visual complementario; por lo tanto, no redibujar, reinterpretar ni estilizar arbitrariamente el logotipo, isotipo o isologo.

### Regla general de tamaño

En composiciones informativas normales, el recurso de marca debe ser el elemento visual más pequeño o uno de los más discretos. Solo puede convertirse en protagonista cuando la intención explícita sea llevar la atención a la marca.

### Consistencia en secuencias

En carruseles, onboarding, tutoriales o secuencias de varias pantallas, si el recurso de marca aparece en una ubicación determinada en la primera pieza, conservar posición y tamaño en las siguientes pantallas de esa secuencia.

### Ubicación permitida - Isotipo

```text
Margen superior: izquierda, derecha o centro
Margen inferior: derecha o centro
Sin margen inferior: izquierda
Siempre dentro del área de seguridad
```

Evitar usar el isotipo intervenido o a gran escala salvo piezas excepcionales de carácter artístico.

### Ubicación permitida - Logotipo

```text
Margen superior: izquierda, derecha o centro
Margen inferior: derecha o centro
Sin margen inferior: izquierda
Siempre dentro del área de seguridad
```

En pantallas con mucho texto, mantenerlo pequeño. Cuando la marca sea el foco principal, puede aumentar de tamaño.

Si se combina con isotipo:
- ambos deben tener tamaño visual equivalente;
- deben quedar alineados;
- deben colocarse en lados opuestos cuando la composición lo requiera.

### Ubicación permitida - Isologo

```text
Margen superior: centro
Margen inferior: centro
Centro de composición: permitido
Sin margen inferior: esquinas superiores o inferiores, izquierda o derecha
Siempre dentro del área de seguridad
```

Si el isologo es la pieza visual dominante, debe ir centrado.

## 20.5 Área de seguridad

Los assets de marca deben tener un contenedor con padding interno suficiente para evitar que queden pegados a bordes, notch, navegación o controles.

Implementación sugerida:

```text
BrandMarkContainer
  paddingHorizontal >= spacing.md
  paddingVertical   >= spacing.sm
  respectSafeArea   = true
```

Nunca cortar, deformar o comprimir un recurso de marca para hacerlo entrar en un espacio insuficiente.

## 20.6 Fotografía e imágenes editoriales

El manual define un tratamiento visual frío y de alto contraste para imágenes institucionales.

En producto digital:

- Priorizar fotografías con temperatura visual fría o neutra.
- Se puede aplicar un tratamiento equivalente a un filtro frío tipo `Polar` del manual, siempre preservando legibilidad y tonos de piel razonables.
- Para imágenes con texto superpuesto, usar sombreado superior y/o inferior cuando mejore contraste.
- La sombra debe ser negra o derivada de la paleta, con opacidad ajustada al contenido.
- No aplicar filtros destructivos ni efectos que dificulten la lectura o reconocimiento de la imagen.

## 20.7 Tratamiento gráfico y textura

El manual contempla recursos rugosos/gastados y texturas de papel sutiles.

En interfaces digitales estos efectos son **decorativos y excepcionales**:

- Permitidos en hero banners, portadas de campaña, pantallas editoriales o piezas especiales.
- Evitarlos en formularios, tablas, listas, navegación, cards funcionales o fondos de lectura prolongada.
- Usar textura con baja opacidad.
- No reducir contraste de texto ni accesibilidad.
- No convertir el efecto "grunge" en patrón visual de toda la aplicación.

## 20.8 Componentes UI adaptados a la marca

### Button Primary

```text
background: brand.blue
text: blanco / foreground de máximo contraste
font: Libre Franklin Semibold
radius: token del Design System
```

### Button Secondary

```text
background: transparente o brand.lightBlue suave
border: brand.blue
text: brand.blue o brand.black según contraste
```

### Button Accent

Usar `brand.yellow` solo para acciones de énfasis secundario o campañas específicas. No convertirlo en el CTA principal por defecto.

### Cards

```text
background: blanco, brand.warmGray o surface equivalente
border: brand.cyanGray / border token
heading: Archivo Black o Libre Franklin Semibold
body: Libre Franklin
```

### NewsCard Featured

Puede usar:
- imagen de gran presencia;
- overlay oscuro para texto;
- etiqueta/categoría en amarillo;
- título en Archivo Black;
- cuerpo en Libre Franklin.

### Badges / Chips

- Institucional: azul + foreground contrastante.
- Destacado: amarillo + negro.
- Informativo suave: lightBlue / cyanGray.

### Inputs

- Tipografía Libre Franklin.
- Bordes neutros de la paleta.
- Focus visible con azul institucional.
- Error semántico separado de los colores de marca.

### Header / Top Bar

Opción principal:

```text
background: brand.blue o brand.black
brand asset: versión con contraste correcto
text/icons: alto contraste
```

La marca nunca debe quedar visualmente pegada al borde.

## 20.9 Fondos permitidos

Prioridad sugerida:

1. blanco / background neutro;
2. `brand.warmGray` para bloques editoriales;
3. `brand.blue` para bloques institucionales fuertes;
4. `brand.black` para hero o piezas de alto impacto;
5. `brand.yellow` solo como acento, no como fondo dominante permanente.

## 20.10 Composición

La identidad visual sugiere una composición editorial, limpia y con contraste claro entre azul, tonos cálidos, negro y blanco.

Reglas para producto:

- priorizar bloques amplios y jerarquía clara;
- dejar aire alrededor de títulos y marca;
- no sobrecargar cards con ornamentación;
- utilizar amarillo para dirigir atención de forma selectiva;
- mantener consistencia de alineación entre pantallas relacionadas;
- conservar una relación visual fuerte entre imagen, título y marca en piezas editoriales.

## 20.11 Reglas obligatorias para agentes de IA

Antes de crear o modificar un componente visual, el agente debe:

1. Revisar esta sección de identidad visual.
2. Reutilizar exclusivamente los tokens de marca definidos.
3. Aplicar las familias tipográficas según su rol.
4. No inventar una nueva paleta.
5. No redibujar ni alterar logotipo, isotipo o isologo.
6. Mantener el recurso de marca dentro del área de seguridad.
7. Usar el azul como principal color institucional de interacción.
8. Usar amarillo solo como acento.
9. Reservar texturas/grunge para piezas editoriales excepcionales.
10. Mantener consistencia de posición del recurso de marca en secuencias.
11. Verificar contraste y accesibilidad antes de dar una tarea por terminada.
12. Si falta un asset oficial, dejar un placeholder con nombre semántico (`brand-logo`, `brand-isotype`, `brand-isologo`) y NO recrearlo de memoria.

## 20.12 Tokens sugeridos

```ts
export const brand = {
  colors: {
    blue: '#1F5AAA',
    lightBlue: '#83A1BB',
    cyanGray: '#C0D4D3',
    yellow: '#EDAA37',
    warmGray: '#F3EDDD',
    beigeGray: '#E0D6CA',
    black: '#1C1C1C',
  },
  fonts: {
    display: 'Archivo Black',
    headingAlt: 'Archivo',
    body: 'Libre Franklin',
    accent: 'Libre Baskerville',
  },
} as const;
```

## 20.13 Checklist visual por componente

Antes de aprobar un componente:

- ¿Usa tokens oficiales?
- ¿Respeta la jerarquía tipográfica?
- ¿El azul funciona como color institucional principal?
- ¿El amarillo se usa como acento y no domina sin necesidad?
- ¿La marca conserva proporción, ubicación y área de seguridad?
- ¿El componente sigue siendo legible sin efectos editoriales?
- ¿El contraste cumple accesibilidad?
- ¿Se ve coherente con mobile y ABM?
- ¿Se evitó duplicar estilos ya existentes?

## 20.14 Assets de marca

Los archivos oficiales de logotipo, isotipo e isologo deben guardarse en una carpeta dedicada y tratarse como assets inmutables:

```text
packages/brand-assets/
  logo/
  isotype/
  isologo/
```

Preferir SVG para escalabilidad cuando el archivo oficial esté disponible. No vectorizar desde capturas si existen originales oficiales.
