# Componentes UI y calendario

Mobile conserva las APIs de `components/ui.tsx`. Button, Card, Badge y el contexto de texto adaptan el código MIT de React Native Reusables a StyleSheet y los tokens UTN: no requieren NativeWind ni una migración del stack. Licencia en `docs/licenses/react-native-reusables.txt`. Los estados de interacción, carga, accesibilidad y los targets de 48 px se conservan. Los formularios web usan controles HTML nativos con el mismo tratamiento visual, no componentes React Native.

`@utn/calendar` integra exclusivamente el núcleo gratuito MIT de Schedule-X. Usa Temporal para preservar los instantes y la zona America/Argentina/Buenos_Aires. El host controla el mes y entrega los eventos ya cargados: no hay fetch ni credenciales dentro del calendario. Las acciones de aceptación/Google Calendar siguen fuera del DOM.

Expo 57 renderiza el calendario mediante `use dom` y el DOM WebView incluido en el SDK en Android/iOS; web lo renderiza directamente. Es necesario reconstruir la app para incluir los nuevos assets. La navegación mensual remonta el calendario para sincronizarlo con los datos. El admin muestra los eventos de la página actual y permite abrir su editor desde la agenda; no implica que todos los registros estén cargados. La app conserva la paginación y avisa si falta cargar eventos. No se usan plugins premium ni CDN.

Verificar en dispositivos Android/iOS: altura del DOM, scroll dentro de la agenda, selección de fechas/eventos, fuentes y lector de pantalla. La compilación web no reemplaza esa prueba.

El admin de eventos abre primero una tabla paginada con título, color, inicio, fin, lugar y estado. Crear/Editar abren un único formulario debajo del listado y trasladan el foco al título. La agenda de Schedule-X queda en una sección desplegable secundaria y también permite abrir el editor.

## Verificación realizada

- TypeScript de mobile y admin; ESLint de las áreas modificadas; `git diff --check`.
- Build de ambos Dockerfiles de producción y exportación de bundles Android/iOS, incluidos assets DOM.
- Prueba unitaria de conversión Temporal con un evento que cruza medianoche en Argentina (ejecutada en Docker por las dependencias Linux del workspace).
- Chromium a 390 y 1280 px con datos ficticios: renderizado, navegación mensual, apertura del editor desde un evento, escritura en formulario y ausencia de desbordamiento horizontal y errores de ejecución.
- Pendiente: ejecución en dispositivos físicos, lector de pantalla nativo y recorrido completo de guardado contra API real. No se hicieron cambios de base de datos ni despliegue de los servicios actuales.

## Administración de noticias

La tabla de noticias comparte estilos con la de eventos. Muestra título, destacada, categoría, estado y publicación, con paginación y Crear/Editar. El formulario de edición carga contenido, categoría, estado e imagen existentes. `PATCH /api/v1/admin/news/:id` usa sesión administrativa, valida CUID y cuerpo estricto, audita cambios y preserva la fecha al editar una publicación o archivarla. Publicar y guardar no envían notificaciones. Se admite archivar desde la edición; la creación conserva borrador/publicada.

Validación: integración y seguridad contra PostgreSQL temporal, compilación del admin y recorrido de navegador con guardado real contra la API aislada (crear, editar/publicar, conflicto de slug y reintento conservando campos), en escritorio y viewport de teléfono. Los servicios actuales no fueron desplegados.

Cada fila de noticias incluye Publicar (verde semántico `success`) u Ocultar (rojo semántico `error`). Ocultar usa el estado ARCHIVED, presentado como «Oculta» en la tabla. `PATCH /api/v1/admin/news/:id/visibility` recibe solo `{ published: boolean }`, requiere sesión administrativa y audita la transición; no reescribe contenido ni envía push. Repetir el mismo estado no duplica la auditoría. La acción muestra carga/error/confirmación y se deshabilita durante el envío o mientras se edita esa noticia para evitar sobrescribir el estado desde un formulario anterior.
