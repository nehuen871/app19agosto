# Editores de resumen y contenido de noticias

Resumen y Contenido usan el mismo editor Tiptap con negrita, cursiva, subrayado, tachado, títulos, fuentes de marca, tamaño, color, resaltado, alineación, listas, sangrías, citas, hipervínculos y deshacer/rehacer. Los máximos independientes son de 500 caracteres para Resumen y 20.000 para Contenido, incluidos saltos de línea; las marcas no consumen ese límite. Una transacción que lo supere se rechaza conservando el texto anterior. Cada instancia tiene su propio historial, selección, campo de formulario y atributos de accesibilidad.

La API acepta los textos anteriores como texto común. El formato nuevo se guarda en cada campo como `@utn/rich-text:1:` seguido por un documento JSON con nodos y marcas permitidos. No se guarda ni interpreta HTML. La validación compartida limita estructura, profundidad, atributos, estilos, protocolos de enlaces y tamaño total (64.000 caracteres serializados para resumen, 256.000 para contenido). Los enlaces se normalizan con `noopener noreferrer nofollow`. La ruta administrativa de noticias acepta JSON de hasta 512 KiB para admitir el contenido enriquecido; las otras rutas conservan 32 KiB. No se requiere migración de base de datos.

La app renderiza el documento con componentes nativos. En la portada azul conserva contraste y deja la interacción con los hipervínculos para el detalle de la noticia. La barra del administrador usa exclusivamente las fuentes y colores de la marca.

Pruebas: `packages/validation/rich-text.test.ts` valida contenido y límites; `apps/api/src/admin-news.test.ts` verifica permisos y persistencia. La suite se ejecuta mediante `pnpm test` contra una base aislada.
