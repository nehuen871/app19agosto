# Planes y correlatividades de UTN Buenos Aires

Catálogo revisado el 19/11/2026. Los códigos, niveles y correlatividades se transcribieron de las publicaciones de los departamentos de **UTN Buenos Aires**; no se mezclan planes de otras regionales. Cada entrada conserva versión, URL, fecha y SHA-256 del archivo consultado.

| Especialidad | Publicación utilizada |
| --- | --- |
| Naval | [U13 · correlatividades](https://frba.utn.edu.ar/naval/correlatividades/) |
| Civil | [Plan 2023 · ciclo lectivo 2025](https://www.frba.utn.edu.ar/wp-content/uploads/2025/02/Asignaturas-y-Correlativas-Plan-2023-CL-2025.pdf) |
| Textil | [Plan 2016 · correlatividades publicadas](https://frba.utn.edu.ar/textil/coorrelativas/) |
| Sistemas | [Plan 2023](https://www.frba.utn.edu.ar/wp-content/uploads/2023/11/Correlativas-plan-2023.pdf) |
| Mecánica | [Plan 2023 · ordenanzas 1901/1902](https://frba.utn.edu.ar/mecanica/plan-de-estudios-2023/) |
| Industrial | [Plan I23 · actualización abril 2025](https://frba.utn.edu.ar/wp-content/uploads/2025/04/PLAN-I23-y-correlativas-oficio-_-actualizacion.pdf) |
| Electrónica | [Plan 2023 · ordenanza 1850](https://www.frba.utn.edu.ar/wp-content/uploads/2022/08/Plan-2023-Ord1850-correlatividades.pdf) |
| Eléctrica | [Plan 95A · correlatividades publicadas](https://frba.utn.edu.ar/electrica/correlatividades/) |
| Química | [Plan 2023 · ordenanza 2138](https://frba.utn.edu.ar/wp-content/uploads/2023/03/CORRELATIVAS-PLAN-2023-MOD.-2025-WEB-COMPLETO-ord.2138-deroga-2082-solo-correlativas.pdf), [niveles publicados en 2026](https://frba.utn.edu.ar/wp-content/uploads/2026/02/PLAN-2023-WEB-UTN-FRBA-2026-1.pdf) |

## Carga explícita

Después de aplicar las migraciones, ejecutar `pnpm study:import`. En Docker local:

```sh
docker compose -f compose.yaml -f compose.prod-local.yaml run --rm --no-deps migrate pnpm study:import
```

El comando valida las nueve especialidades, códigos únicos, referencias y ausencia de ciclos para cursar. Actualiza planes y materias por ID estable. **No elimina materias ni modifica el avance de usuarios**, no crea cuentas y no envía notificaciones. No se ejecuta como parte del arranque ni del seed de demostración.

## Interpretación

- `regular`: cursada regularizada; también se satisface si la materia está aprobada. `approved`: final aprobado.
- Cuando la fuente dice «para cursar y rendir», ambas reglas conservan esos requisitos. Para rendir se requiere además la propia cursada vigente, advertido en la interfaz.
- Los requisitos «todas» de Proyecto Final se expanden a las materias obligatorias previas. La carga de electivas, prácticas y condiciones administrativas se muestra como revisión manual; la app no certifica habilitación administrativa ni graduación.
- El catálogo de electivas contiene alternativas, no una lista de materias que deban aprobarse todas. No se calcula un porcentaje de carrera con esas alternativas: el indicador cuenta únicamente materias obligatorias.
- Los años son los publicados por cada departamento, incluso cuando difieren de otra regional. En Civil se respeta el sexto nivel de Proyecto Final. Textil publica una condición general de idiomas para integradoras; queda visible en las notas del plan.
- El usuario puede declarar su avance o equivalencias y corregirlo después. Cambiar una materia recalcula los requisitos sin borrar estados de otras materias. Cambiar de especialidad conserva el recorrido anterior.
- No se cargan planes históricos de otras cohortes ni se migran equivalencias entre versiones automáticamente.

Los scripts Python `research-curricula.py`, `extract-curriculum-pdfs.py` y `build-study-catalog.py` documentan la extracción. Requieren `requests`, `beautifulsoup4` y `pdfplumber` en un entorno de investigación independiente; no son dependencias de la aplicación. Sus archivos temporales quedan en `.curriculum-research/`, excluida de Git y Docker. Cualquier actualización exige revisar las fuentes y las condiciones especiales antes de reimportar.
