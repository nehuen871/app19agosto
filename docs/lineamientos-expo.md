# Aplicación de las skills de Expo

Las skills `expo-router`, `expo-native-ui`, `expo-data-fetching` y `expo-animation` guían las decisiones técnicas de `apps/mobile`. La identidad visual continúa usando los tokens y assets oficiales del proyecto. No se incorporan paquetes ni componentes experimentales por recomendación genérica de una skill.

- Navegación: stack de Expo Router, títulos por ruta y enlaces entre secciones que reemplazan la pantalla actual para evitar duplicados. Las secciones principales no agregan transiciones de desplazamiento.
- Datos: TanStack Query conserva el contenido disponible ante un error de actualización. Una consulta pausada sin datos muestra un aviso de conexión, nunca una lista vacía o un indicador de carga indefinido. Las solicitudes públicas aceptan la señal de cancelación de la consulta y conservan el límite de diez segundos.
- Ciclo de vida: en Android/iOS, AppState informa a TanStack Query cuando la app vuelve al primer plano. Los datos permanecen frescos durante un minuto y las consultas fallidas tienen hasta dos reintentos.
- Interfaz: se reutilizan los componentes existentes, se ajustan los márgenes inferiores y laterales a las áreas seguras y se permite seleccionar texto de contenido y errores.
- Movimiento: las interacciones actuales no necesitan nuevas animaciones ni dependencias. Los detalles conservan la transición del stack nativo.

El contenido disponible pertenece a la caché de la sesión actual: no se agregó persistencia para consultar noticias tras cerrar la app. La pausa automática de red se apoya en los eventos online/offline del navegador; Android/iOS conservan el tratamiento de errores y reintentos, sin introducir una nueva dependencia de conectividad.

Verificación automatizada de cancelación: `pnpm exec tsx --test packages/api-client/cancellation.test.ts`. Forma parte de `pnpm test`. La interacción, las áreas seguras y el texto grande requieren comprobación adicional en dispositivos Android/iOS.

## Presentación de componentes

Se tomaron como referencia los patrones de [Card](https://reactnativereusables.com/docs/components/card), [Button](https://reactnativereusables.com/docs/components/button) y [Skeleton](https://reactnativereusables.com/docs/components/skeleton) de React Native Reusables. La adaptación usa los componentes compartidos existentes en React Native, sin instalar NativeWind ni otra biblioteca de UI.

Las tarjetas separan encabezado, contenido y acciones. Los botones ofrecen variantes primary, secondary, outline, ghost y danger; tamaños sm/md/lg, estado de carga, foco visible y objetivos táctiles de al menos 48 px. Las etiquetas usan contornos redondeados; el perfil muestra iniciales; los avisos de conexión y los estados vacíos tienen contenedores propios. La navegación utiliza los mismos botones mediante Link de Expo Router. Los skeletons son estáticos, sin movimiento adicional. Espaciados, tipografía, colores y tratamiento de sombras se definen en `packages/design-tokens`.

La comprobación visual en navegador cubre 320/390 px y escritorio, títulos largos, texto ampliado, foco de teclado y navegación con sesiones simuladas. La generación de bundles de Android e iOS no sustituye la prueba en dispositivos físicos.
