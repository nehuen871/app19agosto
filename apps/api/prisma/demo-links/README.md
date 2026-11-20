# Links útiles de prueba

Ejecutar desde la raíz del proyecto: `pnpm demo:links`.
Para Docker y requisitos previos, ver [Datos de prueba](../../../../docs/datos-de-prueba.md).

`links.json` contiene los 16 destinos proporcionados para pruebas. Las 16
ilustraciones PNG de `images/` son originales y utilizan la paleta institucional.
Se incluyen listas para usar: la carga no necesita Sharp, servicios de imágenes,
claves externas ni acceso a los sitios enlazados.

El script `../seed-useful-links-demo.ts` valida los campos y las imágenes antes
de insertar. En una base vacía crea 16 enlaces publicados, cinco destacados,
con prioridades de 10 a 160. Agrega «Carga de prueba» a las descripciones.

Repetirlo conserva registros con el mismo ID o destino, incluso si fueron
editados, ocultados o dados de baja desde el admin. No sobrescribe enlaces del
usuario ni crea notificaciones. Este archivo y sus imágenes son fixtures de
prueba; no acreditan vigencia de formularios, promociones o invitaciones.
