# UTN FRBA project instructions

Before modifying this project, read `.agents/skills/utn-project/SKILL.md` and `docs/especificacion_app_utnfrba_identidad_visual.md`. Apply the relevant skills from `.agents/skills/`:

- API: `backend-production`; PostgreSQL/Prisma: `database-production`.
- Containers and Compose: `docker-production`.
- Authentication, administrative endpoints and security: `security-testing`.
- UI/mobile/admin: `utn-design-system`.
- Mobile usability and screen layout: `expo-native-ui`; navigation: `expo-router`; loading, errors, offline and saves: `expo-data-fetching`; gestures and motion: `expo-animation`.
- Production validation: `production-readiness`.

The Expo skills complement `utn-design-system` and apply to `apps/mobile` only. The project specification and `utn-design-system` take precedence over their generic visual suggestions: preserve brand assets, typography, palette and shared design tokens. Reuse existing UI primitives and the shared API client/TanStack Query setup. Do not introduce dependencies, replace components or expand features just because a skill recommends them; first check existing solutions and compatibility with the installed SDK. References to other Expo skills do not mean those skills or packages are installed. Do not send external feedback or telemetry without explicit user authorization.

Use production Dockerfiles under `docker/`; the root Dockerfile mirrors the API build. Preserve production/development override separation. Run integration tests against an isolated database. Never delete database volumes without explicit authorization.

Keep changes within implemented features; do not infer authorization to implement the entire MVP from a readiness task. Report failed or unavailable checks explicitly.
