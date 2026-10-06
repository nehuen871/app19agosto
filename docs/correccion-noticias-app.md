# Corrección de noticias y app web · 6 de octubre de 2026

El modo de producción local no levantaba mobile y el panel sólo incluía lectura de noticias y creación de borradores de notificaciones. Se agregó la app web de Expo exportada como servicio de producción y un formulario administrativo para guardar noticias.

El formulario permite guardar borradores o publicar, crear/reutilizar una categoría, definir identificador único y una URL de imagen HTTP/HTTPS. La API valida campos estrictamente y registra creación/publicación en la misma transacción. Los borradores no se exponen en la API pública; guardar una noticia no crea ni envía notificaciones.

La app web utiliza un proxy de lectura en su mismo origen para consultar noticias, detalle y categorías. No expone las rutas administrativas ni sus credenciales. La imagen usa usuario sin privilegios, filesystem de sólo lectura y el mismo build para producción local. Mobile nativo continúa usando Expo en modo de desarrollo.

Verificación:

- Lint y TypeScript del monorepo aprobados.
- 20 tests aprobados contra PostgreSQL descartable con migraciones aplicadas; incluye denegación de escrituras sin autorización, persistencia de borradores, rechazo de campos adulterados y URL insegura, conflicto de identificadores y publicación visible.
- Builds de API, panel y app web aprobados; servicios operativos saludables.
- Smoke de API, panel, app web y proxy aprobado.
- Chrome, con una base aislada: login → guardar noticia publicada → verla en la app → abrir detalle por URL. Además se comprobó el render de la app operativa.
- No se modificó el esquema ni se borraron volúmenes operativos.

Acceso local: panel `http://localhost:3001/admin`, app web `http://localhost:8081`. La clave administrativa sigue siendo `ADMIN_ACCESS_TOKEN` configurada por el operador. La autenticación institucional y los roles completos continúan fuera de esta corrección. No se ejecutó un build nativo iOS/Android.
