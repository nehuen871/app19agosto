# Identidad visual · 19 de Agosto

Fuente: `Brandbook - 19 de Agosto.pdf`. El manual conserva los identificadores fundacionales de 19 de Agosto. El contexto UTN FRBA de la aplicación no convierte estos assets en el logotipo oficial de la universidad.

## Assets originales

| Recurso | Archivo canónico | Uso |
| --- | --- | --- |
| Logotipo | `packages/brand-assets/logo/brand-logo.png` | Encabezados del panel y mobile |
| Isotipo | `packages/brand-assets/isotype/brand-isotype.png` | Favicon del panel y Expo; icono configurado de la app |
| Isologo | `packages/brand-assets/isologo/brand-isologo.png` | Presentación del login y preparación de mobile |

Los PNG de 500 × 500 se extrajeron directamente de las imágenes embebidas del PDF, reconstruyendo sus máscaras de transparencia. No se redibujaron, vectorizaron, recolorearon ni ampliaron. El manifiesto registra SHA-256, página, referencia del PDF, dimensiones y límites visibles.

El logotipo viene con mucho margen transparente arriba/abajo. `BrandMark` usa un viewport calculado desde sus límites visibles para ocultar únicamente ese margen; conserva todos los píxeles del dibujo. El contenedor agrega el área de seguridad mediante tokens. El isologo se centra sobre azul para mantener contraste y ubicación aprobada.

Los originales tienen resolución limitada: antes de publicar en tiendas conviene reemplazar el isotipo por su original de alta resolución; Expo recomienda PNG de 1024 × 1024. No se atribuye resolución vectorial a estos raster. Referencia: [configuración de iconos Expo](https://docs.expo.dev/versions/latest/config/app/#icon). La pantalla de preparación de React Native no reemplaza el splash nativo de un binario.

## Distribución

Mobile importa los originales desde el paquete común con rutas estáticas de Metro. El panel sirve `/brand/brand-logo.png`, `/brand/brand-isotype.png` y `/brand/brand-isologo.png`.

`node scripts/sync-brand-assets.mjs` verifica los hashes y copia los originales al directorio público generado del panel. Se ejecuta automáticamente en `prebuild` y `predev`. Ese directorio se ignora en Git; la imagen standalone copia `public` para que los assets existan en producción. No editar las copias generadas.

## Tipografía

- Archivo Black: títulos.
- Libre Franklin: interfaz y cuerpo; Semibold para labels.
- Libre Baskerville: acentos editoriales.
- Archivo: variante de títulos.

Las cuatro familias se cargan desde archivos locales. Las dos familias completadas provienen del repositorio oficial [Google Fonts: Archivo](https://github.com/google/fonts/tree/main/ofl/archivo) y [Libre Baskerville](https://github.com/google/fonts/tree/main/ofl/librebaskerville); se incluyen sus licencias OFL. Las variantes editoriales y alternativas están disponibles sin incorporarlas forzosamente a todos los formularios.

## Reglas

Usar exclusivamente los colores, tipografías, espaciados y geometría de `packages/design-tokens/`. Azul para acciones principales; amarillo como acento. Respetar proporciones y área de seguridad; mantener tamaño y posición en secuencias. Reservar texturas y tratamientos fríos para piezas editoriales, no para controles o fondos de lectura.

No usar filtros CSS para simular otras versiones del logo. No generar variantes de marca con IA. Las versiones futuras deben provenir de archivos oficiales y actualizar el manifiesto al sustituirlas.

## Validación realizada

- Lint y TypeScript del monorepo aprobados.
- Build de producción de Next.js con fuentes locales y assets públicos aprobado.
- Exportación Expo web aprobada: logos, isologo, favicon y cinco archivos de fuente incluidos.
- Panel revisado en Chrome a 1280 × 900 y 390 × 844; ambos logos cargan, tienen texto alternativo y no hay desbordes horizontales.
- Se conservaron los márgenes de seguridad, la proporción original y los colores embebidos.

No se ejecutó un build nativo ni una prueba en dispositivo iOS/Android.
